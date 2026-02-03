
/**
 * L3 RAG Layer Types
 * 定义数据源接口、搜索结果结构和查询意图
 */

export enum SourceType {
  OFFICIAL = 'official', // 官方公告、研报
  SOCIAL = 'social',     // 社区讨论、大V观点
  NEWS = 'news',         // 全网新闻、宏观资讯
}

export interface SearchResultItem {
  id: string;
  title: string;
  content: string;
  url?: string;
  source: string;
  publishTime: number;
  type: SourceType;
  reliabilityScore: number; // 0-1, 公告=1, 散户=0.3
  sentiment?: 'positive' | 'negative' | 'neutral'; // 情绪标签
}

export interface IDataSource {
  name: string;
  type: SourceType;
  search(query: string, options?: any): Promise<SearchResultItem[]>;
}

export interface RAGQueryOptions {
  limit?: number;
  timeRange?: '1d' | '1w' | '1m' | 'all';
  includeSources?: SourceType[];
}

export interface UserIntent {
  query: string;
  primaryIntent: 'explanation' | 'fact_check' | 'sentiment' | 'exploration';
  detectedEntities: string[]; // e.g., ["AAPL", "Tesla"]
  requiredSources: SourceType[];
}
