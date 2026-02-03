
import { RAGQueryOptions, SourceType, UserIntent } from './types';

/**
 * Query Planner
 * 负责解析用户意图，生成查询计划（决定查哪些源）
 */
export class QueryPlanner {
  
  /**
   * 生成查询计划
   * @param query 用户查询字符串
   * @returns 意图和所需源
   */
  plan(query: string): UserIntent {
    const intent: UserIntent = {
      query,
      primaryIntent: 'exploration',
      detectedEntities: [],
      requiredSources: [SourceType.OFFICIAL, SourceType.NEWS] // Default
    };

    // 简单的关键词匹配规则 (Rule-based Intent Detection)
    // 实际应用中可升级为 LLM based classifier

    // 1. Official Intent
    if (/(公告|财报|分红|回购|停牌|复牌)/.test(query)) {
      intent.primaryIntent = 'fact_check';
      intent.requiredSources = [SourceType.OFFICIAL];
    }
    
    // 2. Sentiment Intent
    else if (/(怎么看|看法|评价|感觉|大V|散户|割肉|抄底)/.test(query)) {
      intent.primaryIntent = 'sentiment';
      intent.requiredSources = [SourceType.SOCIAL, SourceType.NEWS];
    }
    
    // 3. Explanation Intent (Why did it drop?)
    else if (/(为什么|原因|理由|暴跌|暴涨|跳水)/.test(query)) {
      intent.primaryIntent = 'explanation';
      // "信息三角" 全开：公告查事实，新闻查背景，社区查情绪
      intent.requiredSources = [SourceType.OFFICIAL, SourceType.NEWS, SourceType.SOCIAL];
    }

    // 简单实体提取 (Mock)
    if (query.toUpperCase().includes('AAPL') || query.includes('苹果')) {
      intent.detectedEntities.push('AAPL');
    }

    return intent;
  }
}
