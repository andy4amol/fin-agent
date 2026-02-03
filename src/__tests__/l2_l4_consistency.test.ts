/**
 * 测试 L2 计算结果与 L4 回复的一致性
 * 确保 AI 回复基于真实的 L2 计算数值，禁止幻觉
 */

import { BrinsonAttributionCalculator, RiskAttributionCalculator } from '../l2_engine/attribution';
import { Guardrails } from '../l1_orchestration/guardrails';
import { PromptFactory } from '../l1_orchestration/prompt_factory';
import {
  Holding,
  MarketData,
  PnLDetail,
  SearchResult,
  RiskReport,
  PnLReport,
} from '../types';
import { PortfolioPosition, BenchmarkData } from '../types/attribution';

describe('L2→L4 一致性测试', () => {
  // 准备测试数据
  const holdings: Holding[] = [
    { ticker: '0700.HK', cost: 300.0, quantity: 100 },
    { ticker: 'BABA', cost: 80.0, quantity: 50 },
    { ticker: 'AAPL', cost: 150.0, quantity: 20 },
  ];

  const marketPrices = new Map<string, MarketData>([
    [
      '0700.HK',
      { current_price: 345.0, change_percent: '15.00%' },
    ],
    ['BABA', { current_price: 85.0, change_percent: '6.25%' }],
    ['AAPL', { current_price: 165.0, change_percent: '10.00%' }],
  ]);

  // Helper to convert to PortfolioPosition (duplicated from Dispatcher for testing)
  const calculatePortfolioPositions = (holdings: Holding[], marketMap: Map<string, MarketData>): PortfolioPosition[] => {
    const positions: PortfolioPosition[] = [];
    let totalCostValue = 0; // Use Cost Value for weights
    for (const holding of holdings) {
      const market = marketMap.get(holding.ticker);
      const currentPrice = market?.current_price || holding.cost;
      const marketValue = currentPrice * holding.quantity;
      const costValue = holding.cost * holding.quantity;
      const return_ = (currentPrice - holding.cost) / holding.cost;
      
      totalCostValue += costValue;
      
      positions.push({
        ticker: holding.ticker,
        weight: 0,
        return: return_,
        contribution: 0,
        marketValue: marketValue,
        portfolioWeight: 0,
        // Store cost value temporarily for weight calc if needed, or just recompute
      });
    }
    
    // Recalculate weights based on COST to ensure sum(weight * return) == total_return
    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i];
      const holding = holdings[i];
      const costValue = holding.cost * holding.quantity;
      
      pos.weight = totalCostValue > 0 ? costValue / totalCostValue : 0;
      pos.portfolioWeight = pos.weight;
      pos.contribution = pos.weight * pos.return;
    }
    return positions;
  };

  const createDummyBenchmark = (tickers: string[]): BenchmarkData => {
    const weights = new Map<string, number>();
    const returns = new Map<string, number>();
    const weight = 1 / tickers.length;
    for (const ticker of tickers) {
      weights.set(ticker, weight);
      returns.set(ticker, 0.05);
    }
    return { name: 'Dummy', weights, returns, totalReturn: 0.05 };
  };

  const getMockReturns = (tickers: string[]): Map<string, number[]> => {
    const returns = new Map<string, number[]>();
    for (const ticker of tickers) {
      returns.set(ticker, Array(30).fill(0.01)); // Constant mock return
    }
    return returns;
  };

  const brinsonCalc = new BrinsonAttributionCalculator();
  const riskCalc = new RiskAttributionCalculator();

  describe('测试 1: PnL 计算准确性 (Brinson Engine)', () => {
    it('应该正确计算总盈亏', () => {
      const positions = calculatePortfolioPositions(holdings, marketPrices);
      const benchmark = createDummyBenchmark(holdings.map(h => h.ticker));
      
      const result = brinsonCalc.calculateSinglePeriodAttribution(
        positions, 
        benchmark, 
        { startDate: '2024-01-01', endDate: '2024-01-31' }
      );

      // 0700.HK: (345-300) * 100 = 4500
      // BABA: (85-80) * 50 = 250
      // AAPL: (165-150) * 20 = 300
      // Total: 5050
      const expectedTotalPnl = 4500 + 250 + 300;
      
      // Reconstruct absolute PnL from positions (as Brinson gives relative)
      const calculatedTotalPnl = positions.reduce((sum, p) => sum + (p.marketValue - (p.marketValue / (1 + p.return))), 0);

      expect(calculatedTotalPnl).toBeCloseTo(expectedTotalPnl, 1);
      
      // Verify Brinson Portfolio Return
      // Total Cost = 300*100 + 80*50 + 150*20 = 30000 + 4000 + 3000 = 37000
      // Total Market = 345*100 + 85*50 + 165*20 = 34500 + 4250 + 3300 = 42050
      // Return = (42050 - 37000) / 37000 = 5050 / 37000 ~= 0.13648
      expect(result.portfolioReturn).toBeCloseTo(5050 / 37000, 4);
    });
  });

  describe('测试 2: 风险模型计算 (Risk Engine)', () => {
    it('应该返回正确的风险数据结构', () => {
      const positions = calculatePortfolioPositions(holdings, marketPrices);
      const benchmark = createDummyBenchmark(holdings.map(h => h.ticker));
      const returns = getMockReturns(holdings.map(h => h.ticker));

      const riskData = riskCalc.calculateAttribution(positions, benchmark, returns);

      expect(riskData).toHaveProperty('portfolioVolatility');
      expect(riskData).toHaveProperty('portfolioVaR');
      expect(riskData).toHaveProperty('positionContributions');
      expect(riskData.positionContributions).toHaveLength(holdings.length);
    });
  });

  describe('测试 3: Prompt 包含 L2 数据', () => {
    it('应该包含关键约束和 L2 数据', () => {
      const positions = calculatePortfolioPositions(holdings, marketPrices);
      const benchmark = createDummyBenchmark(holdings.map(h => h.ticker));
      const returns = getMockReturns(holdings.map(h => h.ticker));
      
      const brinsonResult = brinsonCalc.calculateSinglePeriodAttribution(positions, benchmark, { startDate: '2024-01-01', endDate: '2024-01-31' });
      const riskResult = riskCalc.calculateAttribution(positions, benchmark, returns);

      // Construct PnLReport and RiskReport manualy (mocking Dispatcher logic)
      const pnlData: PnLReport = {
        total_pnl: 5050,
        total_return_rate: `${(brinsonResult.portfolioReturn * 100).toFixed(2)}%`,
        details: positions.map(p => ({
            ticker: p.ticker,
            current_price: 0, cost_price: 0, quantity: 0, // Mocked for this test
            pnl: p.marketValue - (p.marketValue / (1 + p.return)),
            return_rate: `${(p.return * 100).toFixed(2)}%`
        })),
        summary: '盈利'
      };

      const riskDataReport: RiskReport = {
        total_risk_score: Math.round(riskResult.portfolioVolatility * 100),
        risk_level: '低',
        details: riskResult.positionContributions.map(pc => ({
            ticker: pc.ticker,
            risk_contribution: pc.percentageContribution
        }))
      };

      const newsData: SearchResult[] = [
        { content: '腾讯发布财报', source: 'News', relevance: 0.9 },
      ];

      const prompt = PromptFactory.getFinReportPrompt(
        pnlData,
        newsData,
        riskDataReport
      );

      // 验证 Prompt 包含关键约束
      expect(prompt).toContain('严禁幻觉');
      expect(prompt).toContain('必须引用');
      expect(prompt).toContain(String(pnlData.total_pnl));
      expect(prompt).toContain(pnlData.total_return_rate);
      expect(prompt).toContain('自检清单');
    });
  });

  describe('测试 4: Guardrails 一致性检查', () => {
    it('正确回复应该通过一致性检查', () => {
      const expectedPnl = 5050.0;
      const expectedReturn = '13.65%'; // approx 5050/37000
      const pnlDetails: PnLDetail[] = [
        { ticker: '0700.HK', pnl: 4500, return_rate: '15.00%', current_price: 345, cost_price: 300, quantity: 100 },
        { ticker: 'BABA', pnl: 250, return_rate: '6.25%', current_price: 85, cost_price: 80, quantity: 50 },
        { ticker: 'AAPL', pnl: 300, return_rate: '10.00%', current_price: 165, cost_price: 150, quantity: 20 },
      ];

      const correctResponse = `
        总盈亏为 ${expectedPnl}，收益率为 ${expectedReturn}。
        0700.HK 盈利 4500，BABA 盈利 250，AAPL 盈利 300。
        风险提示：市场有风险。
      `;

      const { isConsistent } = Guardrails.verifyL2Consistency(
        correctResponse,
        expectedPnl,
        expectedReturn,
        pnlDetails
      );

      expect(isConsistent).toBe(true);
    });

    it('幻觉回复应该被检测到', () => {
      const expectedPnl = 5050.0;
      const expectedReturn = '13.65%';
      const pnlDetails: PnLDetail[] = [
        { ticker: '0700.HK', pnl: 4500, return_rate: '15.00%', current_price: 345, cost_price: 300, quantity: 100 },
        { ticker: 'BABA', pnl: 250, return_rate: '6.25%', current_price: 85, cost_price: 80, quantity: 50 },
        { ticker: 'AAPL', pnl: 300, return_rate: '10.00%', current_price: 165, cost_price: 150, quantity: 20 },
      ];

      const hallucinatedResponse = `
        总盈亏为 10000.0，收益率为 ${expectedReturn}。
        0700.HK 盈利 4500，BABA 盈利 250，AAPL 盈利 300。
        风险提示：市场有风险。
      `;

      const { isConsistent } = Guardrails.verifyL2Consistency(
        hallucinatedResponse,
        expectedPnl,
        expectedReturn,
        pnlDetails
      );

      expect(isConsistent).toBe(false);
    });
  });

  describe('测试 5: 输入验证', () => {
    it('正常查询应该通过验证', () => {
      const { isSafe } = Guardrails.validateInput('帮我分析持仓盈亏');
      expect(isSafe).toBe(true);
    });

    it('敏感词应该被拦截', () => {
      const { isSafe, message } = Guardrails.validateInput('内幕消息推荐');
      expect(isSafe).toBe(false);
      expect(message).toContain('内幕');
    });
  });

  describe('测试 6: 输出验证', () => {
    it('已包含风险提示的回复应该保持不变', () => {
      const validResponse = '这是分析报告\n风险提示：仅供参考';
      const result = Guardrails.validateOutput(validResponse);
      expect(result).toContain('风险提示');
      expect(result).toContain('仅供参考');
    });

    it('缺少风险提示的回复应该自动追加', () => {
      const invalidResponse = '这是分析报告';
      const result = Guardrails.validateOutput(invalidResponse);
      expect(result).toContain('风险提示');
      expect(result).toContain('仅供参考');
    });
  });
});
