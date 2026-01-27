# l2_engine/risk_model.py

class RiskModel:
    @staticmethod
    def calculate_portfolio_risk(holdings):
        """
        计算持仓风险因子
        """
        risk_score = 0
        details = []
        
        total_market_value = 0
        for item in holdings:
             # 假设 holdings 里已经有了 current_price/market_value (这通常由 L5+L2 计算得到，或者这里简化处理)
             # 为简化，这里仅基于 quantity 和 predefined risk weight
             
             # 简单 mock 风险权重
             risk_weight = 1.0
             if "0700" in item['ticker']: risk_weight = 1.2 # 科技股波动大
             if "AAPL" in item['ticker']: risk_weight = 1.1
             
             item_risk = item['quantity'] * risk_weight / 100 # 归一化 mock
             risk_score += item_risk
             
             details.append({
                 "ticker": item['ticker'],
                 "risk_contribution": round(item_risk, 2)
             })

        level = "低"
        if risk_score > 5: level = "中"
        if risk_score > 10: level = "高"

        return {
            "total_risk_score": round(risk_score, 2),
            "risk_level": level,
            "details": details
        }
