import { SearchResult, NewsSource } from '../types';

/**
 * L3 RAG - Search Engine
 * 搜索引擎，检索相关信息
 */
export class SearchEngine {
  constructor(private newsSource: NewsSource) {}

  /**
   * 根据 query 检索相关信息
   * @param query 搜索查询
   * @returns 搜索结果列表
   */
  search(query: string): SearchResult[] {
    // 简单解析 query 提取 ticker
    let ticker: string | null = null;
    if (query.includes('0700')) {
      ticker = '0700.HK';
    } else if (query.includes('阿里')) {
      ticker = 'BABA';
    } else if (query.includes('苹果')) {
      ticker = 'AAPL';
    }

    const results: SearchResult[] = [];
    if (ticker) {
      const news = this.newsSource.getCompanyNews(ticker);
      for (const n of news) {
        results.push({
          content: n,
          source: 'News',
          relevance: 0.9,
        });
      }
    }

    // 添加通用市场信息
    const sentiment = this.newsSource.getMarketSentiment();
    results.push({
      content: `当前市场情绪: ${sentiment}`,
      source: 'MarketSentiment',
      relevance: 0.5,
    });

    return results;
  }
}
