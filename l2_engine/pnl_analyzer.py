# l2_engine/pnl_analyzer.py
import json

class PnLAnalyzer:
    @staticmethod
    def calculate_attribution(holdings, current_map):
        """
        holdings: [{"ticker": "0700.HK", "cost": 300, "quantity": 100}, ...]
        current_map: {"0700.HK": {"price": 320, "change_percent": ...}, ...}
        Note: current_map structure matches MarketMCP output or just simple price dict
        """
        report = []
        total_pnl = 0
        total_cost = 0
        
        for item in holdings:
            ticker = item['ticker']
            
            # 兼容 current_map 是 float 或者是 dict 的情况
            market_data = current_map.get(ticker, {})
            if isinstance(market_data, (int, float)):
                curr_price = float(market_data)
            else:
                curr_price = float(market_data.get('current_price', item['cost']))
            
            cost = item['cost']
            quantity = item['quantity']
            
            pnl = (curr_price - cost) * quantity
            total_pnl += pnl
            total_cost += cost * quantity
            
            return_rate = ((curr_price / cost) - 1) * 100 if cost != 0 else 0
            
            report.append({
                "ticker": ticker,
                "current_price": round(curr_price, 2),
                "cost_price": round(cost, 2),
                "quantity": quantity,
                "pnl": round(pnl, 2),
                "return_rate": f"{return_rate:.2f}%"
            })
            
        total_return_rate = (total_pnl / total_cost * 100) if total_cost != 0 else 0

        return {
            "total_pnl": round(total_pnl, 2),
            "total_return_rate": f"{total_return_rate:.2f}%",
            "details": report,
            "summary": "盈利" if total_pnl > 0 else "亏损"
        }