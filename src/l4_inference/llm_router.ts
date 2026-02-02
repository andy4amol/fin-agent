import { LLMService } from './llm_service';

/**
 * L4 Inference - LLM Router
 * LLM 路由，根据任务类型选择不同的模型
 */
export class LLMRouter {
  /**
   * 根据任务类型获取对应的LLM服务
   * @param taskType 任务类型
   * @returns LLM服务实例
   */
  static getService(taskType: string = 'detailed_report'): LLMService {
    if (taskType === 'detailed_report') {
      // 复杂任务用更强的模型 (SiliconFlow GLM-4.7)
      return new LLMService(
        'Pro/zai-org/GLM-4.7',
        process.env.SILICONFLOW_API_KEY || 'sk-ttaujshlnuvdoowlonucizhzbhkxaqiujrabedanoczwwbus'
      );
    } else {
      return new LLMService('Qwen/Qwen2.5-7B-Instruct');
    }
  }
}
