# tests/test_l2_l4_consistency.py
"""
测试 L2 计算结果与 L4 回复的一致性
确保 AI 回复基于真实的 L2 计算数值，禁止幻觉
"""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from l2_engine.pnl_analyzer import PnLAnalyzer
from l2_engine.risk_model import RiskModel
from l1_orchestration.guardrails import Guardrails
from l1_orchestration.prompt_factory import PromptFactory


def run_all_tests():
    """运行所有测试"""
    print("\n" + "="*60)
    print("开始 L2→L4 一致性测试")
    print("="*60 + "\n")
    
    # 准备测试数据
    holdings = [
        {"ticker": "0700.HK", "cost": 300.0, "quantity": 100},
        {"ticker": "BABA", "cost": 80.0, "quantity": 50},
        {"ticker": "AAPL", "cost": 150.0, "quantity": 20}
    ]
    
    market_prices = {
        "0700.HK": {"current_price": 345.0, "change_percent": "15.00%"},
        "BABA": {"current_price": 85.0, "change_percent": "6.25%"},
        "AAPL": {"current_price": 165.0, "change_percent": "10.00%"}
    }
    
    all_passed = True
    
    # 测试 1: PnL 计算准确性
    try:
        print("测试 1: PnL 计算准确性...")
        pnl_data = PnLAnalyzer.calculate_attribution(holdings, market_prices)
        
        # 0700.HK: (345-300) * 100 = 4500
        # BABA: (85-80) * 50 = 250
        # AAPL: (165-150) * 20 = 300
        # Total: 5050
        expected_total_pnl = 4500 + 250 + 300
        
        assert pnl_data['total_pnl'] == expected_total_pnl, \
            f"Expected total PnL {expected_total_pnl}, got {pnl_data['total_pnl']}"
        
        # 验证个股盈亏
        for detail in pnl_data['details']:
            ticker = detail['ticker']
            if ticker == "0700.HK":
                assert detail['pnl'] == 4500, f"0700.HK PnL error"
            elif ticker == "BABA":
                assert detail['pnl'] == 250, f"BABA PnL error"
            elif ticker == "AAPL":
                assert detail['pnl'] == 300, f"AAPL PnL error"
        
        print("✅ PnL 计算准确性测试通过\n")
    except AssertionError as e:
        print(f"❌ 测试失败: {e}\n")
        all_passed = False
    
    # 测试 2: 风险模型计算
    try:
        print("测试 2: 风险模型计算...")
        risk_data = RiskModel.calculate_portfolio_risk(holdings)
        
        assert 'total_risk_score' in risk_data
        assert 'risk_level' in risk_data
        assert 'details' in risk_data
        assert len(risk_data['details']) == len(holdings)
        
        print("✅ 风险模型计算测试通过\n")
    except AssertionError as e:
        print(f"❌ 测试失败: {e}\n")
        all_passed = False
    
    # 测试 3: Prompt 包含 L2 数据
    try:
        print("测试 3: Prompt 包含 L2 数据...")
        pnl_data = PnLAnalyzer.calculate_attribution(holdings, market_prices)
        risk_data = RiskModel.calculate_portfolio_risk(holdings)
        news_data = [{"content": "腾讯发布财报", "source": "News", "relevance": 0.9}]
        
        prompt = PromptFactory.get_fin_report_prompt(pnl_data, news_data, risk_data)
        
        # 验证 Prompt 包含关键约束
        assert "严禁幻觉" in prompt
        assert "必须引用" in prompt
        assert str(pnl_data['total_pnl']) in prompt
        assert pnl_data['total_return_rate'] in prompt
        assert "自检清单" in prompt
        
        print("✅ Prompt 包含 L2 数据测试通过\n")
    except AssertionError as e:
        print(f"❌ 测试失败: {e}\n")
        all_passed = False
    
    # 测试 4: Guardrails 一致性检查
    try:
        print("测试 4: Guardrails 一致性检查...")
        expected_pnl = 5050.0
        expected_return = "8.42%"
        pnl_details = [
            {"ticker": "0700.HK", "pnl": 4500, "return_rate": "15.00%"},
            {"ticker": "BABA", "pnl": 250, "return_rate": "6.25%"},
            {"ticker": "AAPL", "pnl": 300, "return_rate": "10.00%"}
        ]
        
        # 正确的回复
        correct_response = f"""
        总盈亏为 {expected_pnl}，收益率为 {expected_return}。
        0700.HK 盈利 4500，BABA 盈利 250，AAPL 盈利 300。
        风险提示：市场有风险。
        """
        is_consistent, issues = Guardrails.verify_l2_consistency(
            correct_response, expected_pnl, expected_return, pnl_details
        )
        assert is_consistent, "正确回复应该通过一致性检查"
        
        # 错误的盈亏数值（幻觉）
        hallucinated_response = f"""
        总盈亏为 10000.0，收益率为 {expected_return}。
        0700.HK 盈利 4500，BABA 盈利 250，AAPL 盈利 300。
        风险提示：市场有风险。
        """
        is_consistent, issues = Guardrails.verify_l2_consistency(
            hallucinated_response, expected_pnl, expected_return, pnl_details
        )
        assert not is_consistent, "幻觉回复应该被检测到"
        
        print("✅ Guardrails 一致性检查测试通过\n")
    except AssertionError as e:
        print(f"❌ 测试失败: {e}\n")
        all_passed = False
    
    # 测试 5: 输入验证
    try:
        print("测试 5: 输入验证...")
        is_safe, msg = Guardrails.validate_input("帮我分析持仓盈亏")
        assert is_safe
        
        is_safe, msg = Guardrails.validate_input("内幕消息推荐")
        assert not is_safe
        assert "内幕" in msg
        
        print("✅ 输入验证测试通过\n")
    except AssertionError as e:
        print(f"❌ 测试失败: {e}\n")
        all_passed = False
    
    # 测试 6: 输出验证
    try:
        print("测试 6: 输出验证...")
        valid_response = "这是分析报告\n风险提示：仅供参考"
        result = Guardrails.validate_output(valid_response)
        assert "风险提示" in result
        assert "仅供参考" in result
        
        invalid_response = "这是分析报告"
        result = Guardrails.validate_output(invalid_response)
        assert "风险提示" in result
        assert "仅供参考" in result
        
        print("✅ 输出验证测试通过\n")
    except AssertionError as e:
        print(f"❌ 测试失败: {e}\n")
        all_passed = False
    
    print("="*60)
    if all_passed:
        print("✅ 所有测试通过！")
    else:
        print("❌ 部分测试失败")
    print("="*60 + "\n")
    
    return all_passed


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
