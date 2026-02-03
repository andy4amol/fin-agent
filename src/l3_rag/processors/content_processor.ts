
import { SearchResultItem, SourceType } from '../types';

/**
 * Content Processor
 * 负责清洗、去重、排序和聚合来自不同源的数据
 */
export class ContentProcessor {
  
  /**
   * 处理搜索结果
   * @param rawResults 原始搜索结果列表
   * @returns 处理后的结果列表
   */
  process(rawResults: SearchResultItem[]): SearchResultItem[] {
    // 1. Deduplication (Simple ID based for now)
    const uniqueResults = this.deduplicate(rawResults);

    // 2. Sorting by Reliability and Recency
    const sortedResults = this.rank(uniqueResults);

    // 3. Limit results (e.g., top 10)
    return sortedResults.slice(0, 10);
  }

  private deduplicate(results: SearchResultItem[]): SearchResultItem[] {
    const seen = new Set();
    return results.filter(item => {
      const key = `${item.source}-${item.title}`; // Simple content hash
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private rank(results: SearchResultItem[]): SearchResultItem[] {
    return results.sort((a, b) => {
      // Primary sort: Reliability
      if (a.reliabilityScore !== b.reliabilityScore) {
        return b.reliabilityScore - a.reliabilityScore; // Descending reliability
      }
      // Secondary sort: Publish Time
      return b.publishTime - a.publishTime; // Newest first
    });
  }

  /**
   * 交叉验证逻辑 (Cross-Check)
   * 检查 Source B (Social) 的观点是否有 Source A (Official) 或 C (News) 的支持
   * 这是一个高级功能，此处仅为简化实现
   */
  crossCheck(results: SearchResultItem[]): SearchResultItem[] {
    const officials = results.filter(r => r.type === SourceType.OFFICIAL);
    
    // 如果 Social 说有“重大利好”，但 Official 没消息，可以降低 Social 的权重
    // Mock logic: mark unverified social rumors
    return results.map(item => {
      if (item.type === SourceType.SOCIAL && item.content.includes('重大利好') && officials.length === 0) {
        return {
          ...item,
          content: `[⚠️ 未经证实] ${item.content}`,
          reliabilityScore: item.reliabilityScore * 0.5
        };
      }
      return item;
    });
  }
}
