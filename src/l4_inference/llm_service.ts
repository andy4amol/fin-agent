import axios, { AxiosResponse } from 'axios';
import { LLMGenerateOptions } from '../types';

/**
 * L4 Inference - LLM Service
 * 大语言模型服务，支持流式输出
 */
export class LLMService {
  private provider: string;
  private apiKey?: string;
  private baseUrl: string;

  constructor(
    provider: string = 'mock',
    apiKey?: string,
    baseUrl: string = 'https://api.siliconflow.cn/v1'
  ) {
    this.provider = provider;
    this.apiKey = apiKey || process.env.SILICONFLOW_API_KEY;
    this.baseUrl = baseUrl;
  }

  /**
   * 生成文本回复
   * @param prompt 用户提示词
   * @param options 生成选项
   * @returns 生成的文本
   */
  async generate(
    prompt: string,
    options: LLMGenerateOptions = {}
  ): Promise<string> {
    const { systemPrompt = '你是一个有用的助手' } = options;

    if (this.provider.startsWith('mock')) {
      return this.generateMock();
    }

    return this.generateApi(prompt, systemPrompt);
  }

  /**
   * Mock 生成器（用于测试）
   */
  private async generateMock(): Promise<string> {
    console.log(`[L4] Generating response using ${this.provider}...`);
    await this.delay(1000);
    return `
(Mock LLM Response from ${this.provider})

**盈亏综述**
账户整体盈利，主要得益于重仓股表现良好。

**归因分析**
- 0700.HK: 腾讯近期发布财报超预期，加上游戏版号发放常态化，带动股价上涨。
- BABA: 阿里拆分消息落地，市场情绪回暖。

**风险提示**
当前持仓科技股占比较高，需注意板块回调风险。

**操作建议**
建议继续持有，可适当关注低估值的红利股以平衡风险。
`;
  }

  /**
   * API 生成器（调用远程大模型）
   */
  private async generateApi(prompt: string, systemPrompt: string): Promise<string> {
    console.log(`[L4] Calling SiliconFlow API for model: ${this.provider}...`);

    if (!this.apiKey) {
      return '[Error] API Key not found. Please set SILICONFLOW_API_KEY environment variable.';
    }

    const url = `${this.baseUrl}/chat/completions`;
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    };
    const payload = {
      model: this.provider,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      enable_thinking: false,
      stream: true,
      stream_options: { include_usage: true },
    };

    try {
      const startTime = Date.now();
      let fullContent = '';
      let usageInfo: { total_tokens?: number; completion_tokens?: number } | null = null;

      console.log(`\n[L4 Stream Start - ${this.provider}]\n`);

      const response: AxiosResponse = await axios.post(url, payload, {
        headers,
        responseType: 'stream',
      });

      return new Promise((resolve, reject) => {
        response.data.on('data', (chunk: Buffer) => {
          const lines = chunk.toString().split('\n');
          for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('data: ') && trimmedLine !== 'data: [DONE]') {
              const jsonStr = trimmedLine.substring(6);
              try {
                const data = JSON.parse(jsonStr);

                // Handle usage info
                if (data.usage) {
                  usageInfo = data.usage;
                }

                // Handle content delta
                if (data.choices && data.choices[0]) {
                  const delta = data.choices[0].delta;
                  if (delta && delta.content) {
                    process.stdout.write(delta.content);
                    fullContent += delta.content;
                  }
                }
              } catch (e) {
                // Ignore JSON parse errors for incomplete chunks
              }
            }
          }
        });

        response.data.on('end', () => {
          const endTime = Date.now();
          const duration = (endTime - startTime) / 1000;

          console.log('\n');

          // Print Stats
          if (usageInfo) {
            const totalTokens = usageInfo.total_tokens || 0;
            const completionTokens = usageInfo.completion_tokens || 0;
            const tokensGenerated = completionTokens > 0 ? completionTokens : fullContent.length;
            const speed = duration > 0 ? tokensGenerated / duration : 0;

            console.log(`[Stats] Generated ${tokensGenerated} tokens in ${duration.toFixed(2)}s (${speed.toFixed(2)} t/s)`);
            console.log(`[Stats] Total usage: ${totalTokens} tokens`);
          } else {
            const speed = duration > 0 ? fullContent.length / duration : 0;
            console.log(`[Stats] Generated ${fullContent.length} chars in ${duration.toFixed(2)}s (Approx ${speed.toFixed(2)} chars/s)`);
          }

          console.log(`[L4 Stream End]\n`);
          resolve(fullContent);
        });

        response.data.on('error', (error: Error) => {
          reject(new Error(`[Error] Exception during API call: ${error.message}`));
        });
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        return `[Error] API request failed: ${error.response?.status} - ${error.response?.data}`;
      }
      return `[Error] Exception during API call: ${(error as Error).message}`;
    }
  }

  /**
   * 延迟辅助函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
