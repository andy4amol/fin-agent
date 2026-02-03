
import { IDataSource, SearchResultItem, SourceType } from '../types';

/**
 * Web Data Provider
 * 提供全网新闻、宏观分析、行业动态
 */
export class WebProvider implements IDataSource {
  name = 'Web Search';
  type = SourceType.NEWS;

  async search(query: string, options?: any): Promise<SearchResultItem[]> {
    console.log(`[WebProvider] Searching for: ${query}`);

    // Mock implementation
    // 实际应用中可调用 Google Custom Search API 或 Bing Search API
    return [
      {
        id: 'web_001',
        title: `科技板块普跌，${query} 领跌`,
        content: `受美联储加息预期影响，今日纳斯达克指数下跌 2%。${query} 由于供应链问题，股价承压。`,
        source: 'Financial News Network',
        publishTime: Date.now() - 18000000, // 5 hours ago
        type: SourceType.NEWS,
        reliabilityScore: 0.8,
        sentiment: 'negative'
      },
      {
        id: 'web_002',
        title: `分析师下调 ${query} 目标价`,
        content: `摩根大通分析师发布报告，将 ${query} 的目标价从 200 下调至 180，维持增持评级。`,
        source: 'Market Watch',
        publishTime: Date.now() - 43200000,
        type: SourceType.NEWS,
        reliabilityScore: 0.85,
        sentiment: 'neutral'
      }
    ];
  }
}
