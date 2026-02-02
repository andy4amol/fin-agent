/**
 * Core type definitions for Fin-Agent
 * 金融AI系统的核心类型定义
 */

// ============================================================================
// L2 Engine Types - PnL and Risk Calculations
// ============================================================================

/**
 * 持仓项目
 */
export interface Holding {
  ticker: string;
  cost: number;
  quantity: number;
}

/**
 * 市场行情数据
 */
export interface MarketData {
  current_price?: number;
  change_percent?: string;
  [key: string]: any;
}

/**
 * 单个持仓的盈亏详情
 */
export interface PnLDetail {
  ticker: string;
  current_price: number;
  cost_price: number;
  quantity: number;
  pnl: number;
  return_rate: string;
}

/**
 * 盈亏分析报告
 */
export interface PnLReport {
  total_pnl: number;
  total_return_rate: string;
  details: PnLDetail[];
  summary: '盈利' | '亏损';
}

/**
 * 风险贡献项
 */
export interface RiskContribution {
  ticker: string;
  risk_contribution: number;
}

/**
 * 风险分析报告
 */
export interface RiskReport {
  total_risk_score: number;
  risk_level: '低' | '中' | '高';
  details: RiskContribution[];
}

// ============================================================================
// L3 RAG Types - Search and Vector DB
// ============================================================================

/**
 * 搜索结果项
 */
export interface SearchResult {
  content: string;
  source: string;
  relevance: number;
}

/**
 * 向量文档
 */
export interface VectorDocument {
  id: string;
  content: string;
  embedding: number[];
}

// ============================================================================
// L4 Inference Types - LLM Service
// ============================================================================

/**
 * LLM服务提供商配置
 */
export interface LLMProviderConfig {
  provider: string;
  apiKey?: string;
  baseUrl?: string;
}

/**
 * LLM生成选项
 */
export interface LLMGenerateOptions {
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

// ============================================================================
// L5 Data Types - User and Market Data
// ============================================================================

/**
 * 用户交易记录
 */
export interface Transaction {
  date: string;
  action: 'BUY' | 'SELL';
  ticker: string;
  price: number;
  quantity: number;
}

/**
 * 交易行为分析结果
 */
export interface TradingBehavior {
  total_transactions: number;
  buy_count: number;
  sell_count: number;
  trading_style: '积极积累型' | '获利了结型' | '平衡型';
}

/**
 * 股票价格数据
 */
export interface StockPrice {
  ticker: string;
  current_price: number;
  change_percent: string;
  volume: number;
  note?: string;
}

/**
 * 新闻数据接口
 */
export interface NewsSource {
  getCompanyNews(ticker: string): string[];
  getMarketSentiment(): string;
}

// ============================================================================
// Application Types - Main Application
// ============================================================================

/**
 * 请求处理结果
 */
export interface RequestResult {
  success: boolean;
  response: string;
  error?: string;
}

/**
 * 一致性检查结果
 */
export interface ConsistencyCheckResult {
  isConsistent: boolean;
  issues: string[];
}

/**
 * 提示词工厂参数
 */
export interface PromptFactoryParams {
  pnlData: PnLReport;
  newsData: SearchResult[];
  riskData: RiskReport;
}
