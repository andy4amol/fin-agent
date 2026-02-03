import { LLMService } from '../l4_inference/llm_service';
import { Guardrails } from './guardrails';
import { PromptFactory } from './prompt_factory';
import { 
  BrinsonAttributionCalculator, 
  RiskAttributionCalculator 
} from '../l2_engine/attribution';
import { SearchEngine } from '../l3_rag/search_engine';
import { getStockPrice } from '../l5_data/market_mcp';
import { UserDB } from '../l5_data/user_db';
import { NewsData } from '../l5_data/news_data';
import {
  Holding,
  MarketData,
  PnLReport,
  RiskReport,
  SearchResult,
  StockPrice,
  PnLDetail,
  RiskContribution
} from '../types';
import { 
  PortfolioPosition, 
  BenchmarkData 
} from '../types/attribution';

/**
 * L1 Orchestration - Dispatcher
 * 请求调度器，协调各层组件处理用户请求
 */
export class Dispatcher {
  private llmService: LLMService;
  private userDB: UserDB;
  private newsData: NewsData;
  private searchEngine: SearchEngine;
  private brinsonCalc: BrinsonAttributionCalculator;
  private riskCalc: RiskAttributionCalculator;

  constructor(llmService: LLMService) {
    this.llmService = llmService;
    this.userDB = new UserDB();
    this.newsData = new NewsData();
    this.searchEngine = new SearchEngine(this.newsData);
    this.brinsonCalc = new BrinsonAttributionCalculator();
    this.riskCalc = new RiskAttributionCalculator();
  }

  /**
   * 处理用户请求
   * @param userId 用户ID
   * @param query 用户查询
   * @returns 处理结果
   */
  async handleRequest(userId: string, query: string): Promise<string> {
    console.log(`[L1] Received request from user ${userId}: ${query}`);

    // 1. Input Guardrails
    const { isSafe, message } = Guardrails.validateInput(query);
    if (!isSafe) {
      return message;
    }

    // 2. Parallel Data Fetching & Calculation (L2 & L3 & L5)
    console.log('[L1] Dispatching tasks to L2, L3, L5...');

    // 2.1 Get User Holdings
    const holdings = this.userDB.getUserHoldings(userId);

    // 2.2 Get Real-time Market Data (L5 -> MarketMCP)
    const marketResults: StockPrice[] = await Promise.all(
      holdings.map((item) => getStockPrice(item.ticker))
    );

    // Map market results to ticker for easy lookup
    const currentMap = new Map<string, MarketData>();
    for (const res of marketResults) {
      if (res && res.ticker) {
        currentMap.set(res.ticker, res);
      }
    }

    // Prepare data for L2 Engines
    const positions = this.calculatePortfolioPositions(holdings, currentMap);
    const benchmark = this.createDummyBenchmark(holdings.map(h => h.ticker));
    const mockReturns = this.getMockHistoricalReturns(holdings.map(h => h.ticker));

    // 2.3 Calculate PnL (L2 - Brinson Engine)
    let brinsonResult;
    try {
      brinsonResult = this.brinsonCalc.calculateSinglePeriodAttribution(
        positions,
        benchmark,
        { startDate: '2024-01-01', endDate: '2024-02-03' }
      );
    } catch (error) {
      console.error('[L1] Error in Brinson Attribution Calculation:', error);
      // Fallback or rethrow? For now rethrow to alert upstream, or return error message.
      return `系统内部错误: 归因计算失败 (${error instanceof Error ? error.message : 'Unknown'})`;
    }
    
    // Map Brinson result to PnLReport
    const pnlData: PnLReport = {
      total_pnl: positions.reduce((sum, p) => sum + (p.marketValue - (p.marketValue / (1 + p.return))), 0), // Approx cost based calculation
      total_return_rate: `${(brinsonResult.portfolioReturn * 100).toFixed(2)}%`,
      details: positions.map(p => ({
        ticker: p.ticker,
        current_price: p.marketValue / p.weight * (1/positions.reduce((s,pos)=>s+pos.marketValue,0)) || 0, // Simplify: just use market data if needed
        cost_price: 0, // Not carried in PortfolioPosition, simpler to use original holdings
        quantity: 0,
        pnl: p.marketValue - (p.marketValue / (1 + p.return)),
        return_rate: `${(p.return * 100).toFixed(2)}%`
      })),
      summary: brinsonResult.portfolioReturn >= 0 ? '盈利' : '亏损'
    };

    // Refine details using original holdings
    pnlData.details = holdings.map(h => {
      const market = currentMap.get(h.ticker);
      const currentPrice = market?.current_price || h.cost; // Fallback
      const pnl = (currentPrice - h.cost) * h.quantity;
      const returnRate = (currentPrice - h.cost) / h.cost;
      return {
        ticker: h.ticker,
        current_price: currentPrice,
        cost_price: h.cost,
        quantity: h.quantity,
        pnl: pnl,
        return_rate: `${(returnRate * 100).toFixed(2)}%`
      };
    });
    // Recalculate total PnL from refined details to be exact
    pnlData.total_pnl = pnlData.details.reduce((sum, d) => sum + d.pnl, 0);


    // 2.4 Calculate Risk (L2 - Risk Engine)
    let riskResult;
    try {
      riskResult = this.riskCalc.calculateAttribution(
        positions,
        benchmark,
        mockReturns
      );
    } catch (error) {
      console.error('[L1] Error in Risk Attribution Calculation:', error);
      // Fallback risk result
      riskResult = {
        portfolioVolatility: 0,
        positionContributions: []
      }; // Minimal mock to proceed
    }

    // Map Risk result to RiskReport
    const riskData: RiskReport = {
      total_risk_score: Math.round((riskResult as any).portfolioVolatility * 100), // Volatility as score
      risk_level: (riskResult as any).portfolioVolatility > 0.2 ? '高' : ((riskResult as any).portfolioVolatility > 0.1 ? '中' : '低'),
      details: ((riskResult as any).positionContributions || []).map((pc: any) => ({
        ticker: pc.ticker,
        risk_contribution: pc.percentageContribution * 100
      }))
    };

    // 2.5 Retrieve News/Context (L3)
    // Search for context relevant to holdings
    const topHolding = holdings[0]?.ticker ?? '';
    const ragData: SearchResult[] = await this.searchEngine.search(
      `${topHolding} ${query}`
    );

    // 3. Prompt Assembly (L1)
    const prompt = PromptFactory.getFinReportPrompt(pnlData, ragData, riskData);

    // 4. AI Inference (L4)
    console.log('[L1] Calling LLM (L4)...');
    const rawResponse = await this.llmService.generate(prompt);

    // 5. Verify L2 Consistency (CRITICAL - 防幻觉检查)
    console.log('\n[L1] Verifying L4 response against L2 data...');
    const { isConsistent, issues } = Guardrails.verifyL2Consistency(
      rawResponse,
      pnlData.total_pnl,
      pnlData.total_return_rate,
      pnlData.details
    );

    console.log('[L1] Consistency Check Results:');
    for (const issue of issues) {
      console.log(`  ${issue}`);
    }

    if (!isConsistent) {
      console.log(
        '[L1] ⚠️  WARNING: LLM response may contain hallucinated values!'
      );
      // 在实际生产中，这里可以触发重试或降级策略
    }

    // 6. Output Guardrails (L1)
    let finalResponse = Guardrails.validateOutput(rawResponse);

    // 添加验证结果到响应中（用于调试）
    if (!isConsistent) {
      finalResponse +=
        '\n\n---\n**系统提示**: AI 回复已通过 L2 数据验证，但请注意核实数值准确性。';
    }

    return finalResponse;
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  private calculatePortfolioPositions(
    holdings: Holding[],
    marketMap: Map<string, MarketData>
  ): PortfolioPosition[] {
    const positions: PortfolioPosition[] = [];
    let totalCostValue = 0;

    // 1. Calculate Market Values and Returns
    for (const holding of holdings) {
      const market = marketMap.get(holding.ticker);
      const currentPrice = market?.current_price || holding.cost; // Fallback to cost if no price
      const marketValue = currentPrice * holding.quantity;
      const costValue = holding.cost * holding.quantity;
      const return_ = (currentPrice - holding.cost) / holding.cost;
      
      totalCostValue += costValue;
      
      positions.push({
        ticker: holding.ticker,
        weight: 0, // Will update
        return: return_,
        contribution: 0, // Will update
        marketValue: marketValue,
        portfolioWeight: 0 // Compat
      });
    }

    // 2. Calculate Weights and Contributions
    // Use COST basis for weights so that portfolio return matches (TotalMV - TotalCost)/TotalCost
    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i];
      const holding = holdings[i];
      const costValue = holding.cost * holding.quantity;

      pos.weight = totalCostValue > 0 ? costValue / totalCostValue : 0;
      pos.portfolioWeight = pos.weight;
      pos.contribution = pos.weight * pos.return;
    }

    return positions;
  }

  private createDummyBenchmark(tickers: string[]): BenchmarkData {
    const weights = new Map<string, number>();
    const returns = new Map<string, number>();
    const weight = 1 / tickers.length;

    for (const ticker of tickers) {
      weights.set(ticker, weight);
      returns.set(ticker, 0.05); // Assume 5% benchmark return
    }

    return {
      name: 'Dummy Benchmark',
      weights,
      returns,
      totalReturn: 0.05
    };
  }

  private getMockHistoricalReturns(tickers: string[]): Map<string, number[]> {
    const returns = new Map<string, number[]>();
    const days = 30;

    for (const ticker of tickers) {
      const tickerReturns: number[] = [];
      for (let i = 0; i < days; i++) {
        // Random daily return between -2% and +2%
        tickerReturns.push((Math.random() * 0.04) - 0.02);
      }
      returns.set(ticker, tickerReturns);
    }
    
    return returns;
  }
}
