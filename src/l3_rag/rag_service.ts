
import { IDataSource, SearchResultItem, SourceType } from './types';
import { QueryPlanner } from './query_planner';
import { ContentProcessor } from './processors/content_processor';
import { OfficialProvider } from './providers/official_provider';
import { SocialProvider } from './providers/social_provider';
import { WebProvider } from './providers/web_provider';

/**
 * RAG Service
 * L3 层的核心入口，协调规划、检索和处理流程
 */
export class RAGService {
  private planner: QueryPlanner;
  private processor: ContentProcessor;
  private providers: Map<SourceType, IDataSource>;

  constructor() {
    this.planner = new QueryPlanner();
    this.processor = new ContentProcessor();
    
    // 注册 Providers
    this.providers = new Map();
    this.providers.set(SourceType.OFFICIAL, new OfficialProvider());
    this.providers.set(SourceType.SOCIAL, new SocialProvider());
    this.providers.set(SourceType.NEWS, new WebProvider());
  }

  /**
   * 执行搜索
   * @param query 用户查询
   * @returns 处理后的搜索结果
   */
  async search(query: string): Promise<SearchResultItem[]> {
    console.log(`[RAGService] Processing query: "${query}"`);

    // 1. Plan
    const intent = this.planner.plan(query);
    console.log(`[RAGService] Intent: ${intent.primaryIntent}, Sources: ${intent.requiredSources.join(', ')}`);

    // 2. Retrieve (Parallel)
    const searchPromises = intent.requiredSources.map(async (sourceType) => {
      const provider = this.providers.get(sourceType);
      if (!provider) return [];
      try {
        return await provider.search(query);
      } catch (error) {
        console.error(`[RAGService] Error fetching from ${sourceType}:`, error);
        return [];
      }
    });

    const rawResultsArrays = await Promise.all(searchPromises);
    const rawResults = rawResultsArrays.flat();

    // 3. Process
    let processedResults = this.processor.process(rawResults);
    
    // 4. Cross Check (Optional step in pipeline)
    processedResults = this.processor.crossCheck(processedResults);

    return processedResults;
  }
}
