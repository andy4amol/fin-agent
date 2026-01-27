# l2_engine/behavior_analyzer.py

class BehaviorAnalyzer:
    @staticmethod
    def analyze_transactions(transactions):
        """
        分析交易行为
        """
        if not transactions:
            return "暂无交易记录"

        # 简单示例：统计买入卖出次数
        buy_count = sum(1 for t in transactions if t['action'] == 'BUY')
        sell_count = sum(1 for t in transactions if t['action'] == 'SELL')
        
        style = "平衡型"
        if buy_count > sell_count * 2:
            style = "积极积累型"
        elif sell_count > buy_count:
            style = "获利了结型"
            
        return {
            "total_transactions": len(transactions),
            "buy_count": buy_count,
            "sell_count": sell_count,
            "trading_style": style
        }
