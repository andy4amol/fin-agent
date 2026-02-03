import { SearchResult, NewsSource } from '../types';
import { RAGService } from './rag_service';

/**
 * L3 RAG - Search Engine (Adapter)
 * 适配器：将旧版 SearchEngine 接口适配到新的 RAGService
 */
export class SearchEngine {
  private ragService: RAGService;

  // 保持构造函数签名兼容，虽然 newsSource 可能不再主要使用
  constructor(private newsSource: NewsSource) {
    this.ragService = new RAGService();
  }

  /**
   * 根据 query 检索相关信息
   * @param query 搜索查询
   * @returns 搜索结果列表
   */
  async search(query: string): Promise<SearchResult[]> {
    // 调用新版 RAG Service
    const items = await this.ragService.search(query);

    // 适配返回类型 SearchResultItem -> SearchResult
    return items.map(item => ({
      content: `[${item.source}] ${item.title}: ${item.content}`,
      source: item.type, // Map SourceType enum to string
      relevance: item.reliabilityScore
    }));
  }
}
