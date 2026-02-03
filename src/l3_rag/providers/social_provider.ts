
import { IDataSource, SearchResultItem, SourceType } from '../types';

/**
 * Social Data Provider
 * 提供社区讨论、大V观点、散户情绪等数据
 * 特点：噪声大，但能反映市场情绪
 */
export class SocialProvider implements IDataSource {
  name = 'Social Sentiment';
  type = SourceType.SOCIAL;

  async search(query: string, options?: any): Promise<SearchResultItem[]> {
    console.log(`[SocialProvider] Searching for: ${query}`);

    // Mock implementation
    // 实际应用中应连接 Twitter / 雪球 / Reddit / StockTwits
    return [
      {
        id: 'soc_001',
        title: `大家怎么看 ${query} 的这波下跌？`,
        content: `感觉是主力在洗盘，基本面没问题，拿住！技术面上看支撑位在 150。`,
        source: 'Investor Community',
        publishTime: Date.now() - 3600000, // 1 hour ago
        type: SourceType.SOCIAL,
        reliabilityScore: 0.4,
        sentiment: 'positive' // 尽管下跌，但这人是看多的
      },
      {
        id: 'soc_002',
        title: `${query} 这种垃圾股早该卖了`,
        content: `管理层毫无作为，竞品都在抢市场，他们还在吃老本。快跑！`,
        source: 'Influencer V',
        publishTime: Date.now() - 7200000,
        type: SourceType.SOCIAL,
        reliabilityScore: 0.6, // 大V稍微可信一点点
        sentiment: 'negative'
      }
    ];
  }
}
