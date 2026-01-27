# l1_orchestration/guardrails.py
import re

class Guardrails:
    @staticmethod
    def validate_input(user_query):
        """
        输入安全拦截
        """
        forbidden_keywords = ["内幕", "诈骗", "非法"]
        for kw in forbidden_keywords:
            if kw in user_query:
                return False, f"检测到敏感词: {kw}"
        return True, ""
    
    @staticmethod
    def validate_output(response_text):
        """
        输出合规审查
        """
        required_disclaimers = ["风险提示", "仅供参考"]
        # 简单检查，如果没有风险提示则自动追加
        if not any(d in response_text for d in required_disclaimers):
             response_text += "\n\n【风险提示】市场有风险，投资需谨慎。本报告仅供参考，不构成投资建议。"
        return response_text
    
    @staticmethod
    def verify_l2_consistency(response_text, expected_pnl, expected_return, pnl_details):
        """
        验证 L4 回复是否与 L2 计算数据一致
        
        Args:
            response_text: L4 的回复文本
            expected_pnl: 预期的总盈亏值
            expected_return: 预期的收益率字符串
            pnl_details: 详细的盈亏数据列表
        
        Returns:
            (is_consistent, issues): 一致性检查结果和问题列表
        """
        issues = []
        
        # 1. 检查总盈亏数值
        if str(expected_pnl) not in response_text:
            issues.append(f"❌ 缺少或错误的总盈亏数值 {expected_pnl}")
        else:
            issues.append(f"✅ 包含正确的总盈亏数值 {expected_pnl}")
        
        # 2. 检查总收益率
        if expected_return not in response_text:
            issues.append(f"❌ 缺少或错误的收益率 {expected_return}")
        else:
            issues.append(f"✅ 包含正确的收益率 {expected_return}")
        
        # 3. 检查个股盈亏（至少应提及主要持仓）
        mentioned_count = 0
        for item in pnl_details[:3]:  # 检查前3个主要持仓
            ticker = item['ticker']
            if ticker in response_text:
                mentioned_count += 1
        
        if mentioned_count == 0:
            issues.append("⚠️  未提及任何具体持仓的盈亏情况")
        else:
            issues.append(f"✅ 提及了 {mentioned_count} 个主要持仓")
        
        # 4. 检查风险提示
        if "风险提示" not in response_text:
            issues.append("❌ 缺少风险提示")
        else:
            issues.append("✅ 包含风险提示")
        
        is_consistent = len([i for i in issues if "❌" in i]) == 0
        
        return is_consistent, issues
