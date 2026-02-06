/**
 * Tool Definitions
 * 定义外部工具和接口的Schema，对应 interface.md
 */

export enum ToolName {
  KNOWLEDGE = 'knowledge',
  WEB_SEARCH = 'webSearch',
  XQ_SEARCH_QUERY = 'xqSearchQuery',
  XQ_SEARCH_STOCK_FEED = 'xqSearchStockFeed',
  XQ_SEARCH_USER_FEED = 'xqSearchUserFeed',
  XQ_VISIT = 'xqVisit',
  XQ_STOCK_FINANCIAL_DATA = 'xqStockFinancialData',
}

// ============================================================================
// 1. Knowledge (知识库)
// ============================================================================

export interface KnowledgeQueryArgs {
  query: string;
}

export interface StockScreenerArgs {
  category: 'CN' | 'HK' | 'US';
  pettm: string; // Range string, e.g., "0_20"
  netprofit: string;
  order: 'asc' | 'desc';
  dy_l?: string;
  pelyr?: string;
  roediluted?: string;
  pb?: string;
  total_revenue?: string;
  tl?: string;
  order_by?: string;
  size?: number;
}

export type KnowledgeArgs = 
  | { type: 'query'; args: KnowledgeQueryArgs }
  | { type: 'stock-screener'; args: StockScreenerArgs };


// ============================================================================
// 2. WebSearch (全网搜索)
// ============================================================================

export interface WebSearchArgs {
  searchRequests: string[];
  industry: string; // e.g. "general,finance"
  timeRange: 'OneDay' | 'OneWeek' | 'OneMonth' | 'OneYear' | 'NoLimit';
}


// ============================================================================
// 3. XqSearchQuery (雪球站内搜索)
// ============================================================================

export interface XqSearchQueryArgs {
  searchRequests: string[];
  searchFilings: boolean;
  timeRange: string;
  startDate?: string;
  endDate?: string;
  scope: 'all' | 'pgc' | 'ugc'; // New in v1.1
}


// ============================================================================
// 4. XqSearchStockFeed (雪球个股检索)
// ============================================================================

export interface XqSearchStockFeedArgs {
  stockName: string;
  stockSearchQuery: string;
  searchStockFeedNew: boolean;
  searchStockFeedHot: boolean;
  searchStockNotice: boolean;
  searchStockQuote: boolean;
  searchStockInfluencer: boolean;
  timeRange: string;
  startDate?: string;
  endDate?: string;
  scope: 'all' | 'pgc' | 'ugc'; // New in v1.1
  searchStockAbnormal: boolean; // New in v1.1
}


// ============================================================================
// 5. XqSearchUserFeed (雪球用户检索)
// ============================================================================

export interface XqSearchUserFeedArgs {
  userScreenName: string;
  filterQuery: string;
  userSearchQuery: string;
  searchUserProfile: boolean;
  timeRange: string;
  startDate?: string;
  endDate?: string;
}


// ============================================================================
// 6. XqVisit (雪球页面访问)
// ============================================================================

export interface XqVisitArgs {
  urlTargets: string[];
}


// ============================================================================
// 7. XqStockFinancialData (雪球个股财务数据) [NEW]
// ============================================================================

export interface XqStockFinancialDataArgs {
  symbol: string;
  metrics: string[]; // e.g. ["net_profit", "revenue"]
  period: 'latest' | 'realtime' | 'forecast' | string; // e.g. "2023_q4"
  count?: number;
}

// Response Structures (Mock)
export interface FinancialDataResponse {
  symbol: string;
  data: Array<{
    period: string;
    [key: string]: number | string;
  }>;
}

export interface AbnormalEvent {
  date: string;
  type: 'point' | 'interval';
  result: 'up' | 'down';
  reason: string;
}
