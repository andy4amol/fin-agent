import { Dispatcher } from './l1_orchestration/dispatcher';
import { LLMRouter } from './l4_inference/llm_router';

/**
 * Fin-Agent Main Entry Point
 * 金融AI智能助手主入口
 */
async function main(): Promise<void> {
  console.log('=== Financial AI Agent (Fin-Agent) Initializing... ===');

  // 1. Initialize Components
  // L4
  const llmService = LLMRouter.getService('detailed_report');
  // L1 (which initializes L2, L3, L5 internal components)
  const dispatcher = new Dispatcher(llmService);

  // 2. Simulate User Request
  const userId = 'user_001';
  const query = '帮我分析一下我的持仓盈亏，并给出后续操作建议。';

  console.log(`\n[User] ID: ${userId}, Query: ${query}\n`);

  // 3. Process Request
  try {
    const response = await dispatcher.handleRequest(userId, query);

    // 4. Display Result
    console.log('\n' + '='.repeat(50));
    console.log('=== Agent Response ===');
    console.log('='.repeat(50));
    console.log(response);
    console.log('='.repeat(50));
  } catch (error) {
    console.error('Error processing request:', error);
    process.exit(1);
  }
}

// Run the application
main();
