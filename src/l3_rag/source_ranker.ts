import { SearchResult } from '../types';

/**
 * L3 RAG - Source Ranker
 * 来源排序器，对检索结果进行排序和过滤
 */
export class SourceRanker {
  /**
   * 对检索结果进行排序和过滤
   * @param searchResults 搜索结果列表
   * @returns 排序后的结果列表
   */
  rank(searchResults: SearchResult[]): SearchResult[] {
    // 按 relevance 降序排序
    const sortedResults = [...searchResults].sort(
      (a, b) => (b.relevance || 0) - (a.relevance || 0)
    );

    // 过滤低相关性内容 (示例阈值 0.6)
    // const filtered = sortedResults.filter(r => r.relevance >= 0.6);

    // 为了演示，全部返回但排好序
    return sortedResults;
  }

  /**
   * 过滤低相关性结果
   * @param searchResults 搜索结果列表
   * @param threshold 相关性阈值
   * @returns 过滤后的结果
   */
  filterByRelevance(
    searchResults: SearchResult[],
    threshold: number = 0.6
  ): SearchResult[] {
    return searchResults.filter((r) => (r.relevance || 0) >= threshold);
  }
}
