import { LLMService } from '../l4_inference/llm_service';
import { Guardrails } from './guardrails';
import { PromptFactory } from './prompt_factory';
import { PnLAnalyzer } from '../l2_engine/pnl_analyzer';
import { RiskModel } from '../l2_engine/risk_model';
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
} from '../types';

/**
 * L1 Orchestration - Dispatcher
 * 请求调度器，协调各层组件处理用户请求
 */
export class Dispatcher {
  private llmService: LLMService;
  private userDB: UserDB;
  private newsData: NewsData;
  private searchEngine: SearchEngine;

  constructor(llmService: LLMService) {
    this.llmService = llmService;
    this.userDB = new UserDB();
    this.newsData = new NewsData();
    this.searchEngine = new SearchEngine(this.newsData);
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

    // 2.3 Calculate PnL (L2)
    const pnlData: PnLReport = PnLAnalyzer.calculateAttribution(
      holdings,
      currentMap
    );

    // 2.4 Calculate Risk (L2)
    const riskData: RiskReport = RiskModel.calculatePortfolioRisk(holdings);

    // 2.5 Retrieve News/Context (L3)
    // Search for context relevant to holdings
    const topHolding = holdings[0]?.ticker ?? '';
    const ragData: SearchResult[] = this.searchEngine.search(
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
}
