# main.py
import asyncio
from l1_orchestration.dispatcher import Dispatcher
from l4_inference.llm_router import LLMRouter

async def main():
    print("=== Financial AI Agent (Fin-Agent) Initializing... ===")

    # 1. Initialize Components
    # L4
    llm_service = LLMRouter.get_service("detailed_report")
    # L1 (which initializes L2, L3, L5 internal components)
    dispatcher = Dispatcher(llm_service)

    # 2. Simulate User Request
    user_id = "user_001"
    query = "帮我分析一下我的持仓盈亏，并给出后续操作建议。"
    
    print(f"\n[User] ID: {user_id}, Query: {query}\n")

    # 3. Process Request
    response = await dispatcher.handle_request(user_id, query)

    # 4. Display Result
    print("\n" + "="*50)
    print("=== Agent Response ===")
    print("="*50)
    print(response)
    print("="*50)

if __name__ == "__main__":
    asyncio.run(main())