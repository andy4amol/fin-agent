# l5_data/market_mcp.py
import asyncio
import yfinance as yf
import random

async def get_stock_price(ticker: str) -> dict:
    """获取指定股票代码（如 0700.HK, BABA, AAPL）的实时行情数据"""
    try:
        stock = yf.Ticker(ticker)
        # yfinance fast_info generally works, but sometimes might fail or be slow
        # Adding a fallback or more detailed info could be good.
        # For this demo, let's try to get more data
        
        info = stock.fast_info
        last_price = info.get('last_price', 0.0)
        previous_close = info.get('previous_close', 0.0)
        
        if last_price and previous_close:
            change_percent = ((last_price - previous_close) / previous_close) * 100
        else:
            change_percent = 0.0

        return {
            "ticker": ticker,
            "current_price": round(last_price, 2),
            "change_percent": f"{change_percent:.2f}%",
            "volume": info.get('last_volume', 0)
        }
    except Exception as e:
        # Fallback for demo if yfinance fails (e.g. network issues)
        print(f"yfinance error: {e}, using mock data for demo.")
        mock_price = random.uniform(100, 500)
        mock_change = random.uniform(-5, 5)
        return {
            "ticker": ticker,
            "current_price": round(mock_price, 2),
            "change_percent": f"{mock_change:.2f}%",
            "volume": 1000000,
            "note": "Mock Data (Network Error)"
        }

# 示例：运行测试
if __name__ == "__main__":
    async def test():
        result = await get_stock_price("AAPL")
        print(result)
    asyncio.run(test())
