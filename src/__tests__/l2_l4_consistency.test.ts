/**
 * 测试 L2 计算结果与 L4 回复的一致性
 * 确保 AI 回复基于真实的 L2 计算数值，禁止幻觉
 */

import { PnLAnalyzer } from '../l2_engine/pnl_analyzer';
import { RiskModel } from '../l2_engine/risk_model';
import { Guardrails } from '../l1_orchestration/guardrails';
import { PromptFactory } from '../l1_orchestration/prompt_factory';
import {
  Holding,
  MarketData,
  PnLDetail,
  SearchResult,
  RiskReport,
} from '../types';

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

  describe('测试 1: PnL 计算准确性', () => {
    it('应该正确计算总盈亏', () => {
      const pnlData = PnLAnalyzer.calculateAttribution(
        holdings,
        marketPrices
      );

      // 0700.HK: (345-300) * 100 = 4500
      // BABA: (85-80) * 50 = 250
      // AAPL: (165-150) * 20 = 300
      // Total: 5050
      const expectedTotalPnl = 4500 + 250 + 300;

      expect(pnlData.total_pnl).toBe(expectedTotalPnl);
    });

    it('应该正确计算个股盈亏', () => {
      const pnlData = PnLAnalyzer.calculateAttribution(
        holdings,
        marketPrices
      );

      for (const detail of pnlData.details) {
        if (detail.ticker === '0700.HK') {
          expect(detail.pnl).toBe(4500);
        } else if (detail.ticker === 'BABA') {
          expect(detail.pnl).toBe(250);
        } else if (detail.ticker === 'AAPL') {
          expect(detail.pnl).toBe(300);
        }
      }
    });
  });

  describe('测试 2: 风险模型计算', () => {
    it('应该返回正确的风险数据结构', () => {
      const riskData = RiskModel.calculatePortfolioRisk(holdings);

      expect(riskData).toHaveProperty('total_risk_score');
      expect(riskData).toHaveProperty('risk_level');
      expect(riskData).toHaveProperty('details');
      expect(riskData.details).toHaveLength(holdings.length);
    });

    it('风险等级应该在有效范围内', () => {
      const riskData = RiskModel.calculatePortfolioRisk(holdings);

      expect(['低', '中', '高']).toContain(riskData.risk_level);
    });
  });

  describe('测试 3: Prompt 包含 L2 数据', () => {
    it('应该包含关键约束和 L2 数据', () => {
      const pnlData = PnLAnalyzer.calculateAttribution(
        holdings,
        marketPrices
      );
      const riskData = RiskModel.calculatePortfolioRisk(holdings);
      const newsData: SearchResult[] = [
        { content: '腾讯发布财报', source: 'News', relevance: 0.9 },
      ];

      const prompt = PromptFactory.getFinReportPrompt(
        pnlData,
        newsData,
        riskData
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
      const expectedReturn = '8.42%';
      const pnlDetails: PnLDetail[] = [
        { ticker: '0700.HK', pnl: 4500, return_rate: '15.00%' },
        { ticker: 'BABA', pnl: 250, return_rate: '6.25%' },
        { ticker: 'AAPL', pnl: 300, return_rate: '10.00%' },
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
      const expectedReturn = '8.42%';
      const pnlDetails: PnLDetail[] = [
        { ticker: '0700.HK', pnl: 4500, return_rate: '15.00%' },
        { ticker: 'BABA', pnl: 250, return_rate: '6.25%' },
        { ticker: 'AAPL', pnl: 300, return_rate: '10.00%' },
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
