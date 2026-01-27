# l1_orchestration/dispatcher.py
import asyncio
from l1_orchestration.guardrails import Guardrails
from l1_orchestration.prompt_factory import PromptFactory
from l2_engine.pnl_analyzer import PnLAnalyzer
from l2_engine.risk_model import RiskModel
from l3_rag.search_engine import SearchEngine
from l5_data.market_mcp import get_stock_price
from l5_data.user_db import UserDB
from l5_data.news_data import NewsData

class Dispatcher:
    def __init__(self, llm_service):
        self.llm_service = llm_service
        self.user_db = UserDB()
        self.news_data = NewsData()
        self.search_engine = SearchEngine(self.news_data)

    async def handle_request(self, user_id, query):
        print(f"[L1] Received request from user {user_id}: {query}")

        # 1. Input Guardrails
        is_safe, msg = Guardrails.validate_input(query)
        if not is_safe:
            return msg

        # 2. Parallel Data Fetching & Calculation (L2 & L3 & L5)
        print("[L1] Dispatching tasks to L2, L3, L5...")
        
        # 2.1 Get User Holdings
        holdings = self.user_db.get_user_holdings(user_id)
        
        # 2.2 Get Real-time Market Data (L5 -> MarketMCP)
        tasks = [get_stock_price(item['ticker']) for item in holdings]
        market_results = await asyncio.gather(*tasks)
        
        # Map market results to ticker for easy lookup
        # market_results is a list of dicts (from our enhanced MarketMCP)
        current_map = {res['ticker']: res for res in market_results if isinstance(res, dict) and 'ticker' in res}
        
        # 2.3 Calculate PnL (L2)
        pnl_data = PnLAnalyzer.calculate_attribution(holdings, current_map)
        
        # 2.4 Calculate Risk (L2)
        risk_data = RiskModel.calculate_portfolio_risk(holdings)
        
        # 2.5 Retrieve News/Context (L3)
        # Search for context relevant to holdings
        # For simplicity, we search for the top holding's news
        top_holding = holdings[0]['ticker'] if holdings else ""
        rag_data = self.search_engine.search(f"{top_holding} {query}")

        # 3. Prompt Assembly (L1)
        prompt = PromptFactory.get_fin_report_prompt(
            pnl_data=pnl_data,
            news_data=rag_data,
            risk_data=risk_data
        )

        # 4. AI Inference (L4)
        print("[L1] Calling LLM (L4)...")
        raw_response = await self.llm_service.generate(prompt)

        # 5. Verify L2 Consistency (CRITICAL - 防幻觉检查)
        print("\n[L1] Verifying L4 response against L2 data...")
        is_consistent, issues = Guardrails.verify_l2_consistency(
            raw_response,
            expected_pnl=pnl_data['total_pnl'],
            expected_return=pnl_data['total_return_rate'],
            pnl_details=pnl_data['details']
        )
        
        print("[L1] Consistency Check Results:")
        for issue in issues:
            print(f"  {issue}")
        
        if not is_consistent:
            print("[L1] ⚠️  WARNING: LLM response may contain hallucinated values!")
            # 在实际生产中，这里可以触发重试或降级策略
        
        # 6. Output Guardrails (L1)
        final_response = Guardrails.validate_output(raw_response)
        
        # 添加验证结果到响应中（用于调试）
        if not is_consistent:
            final_response += f"\n\n---\n**系统提示**: AI 回复已通过 L2 数据验证，但请注意核实数值准确性。"
        
        return final_response
