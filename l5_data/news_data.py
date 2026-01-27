# l5_data/news_data.py
import random

class NewsData:
    def get_company_news(self, ticker):
        """
        获取个股相关新闻/研报
        """
        # 模拟新闻数据
        mock_news = {
            "0700.HK": ["腾讯发布最新季度财报，营收超预期", "游戏业务回暖，腾讯股价看涨"],
            "BABA": ["阿里拆分上市计划推进中", "电商竞争加剧，阿里寻求新增长点"],
            "AAPL": ["iPhone 15销量火爆", "苹果Vision Pro即将发售"]
        }
        return mock_news.get(ticker, ["暂无相关重磅新闻"])

    def get_market_sentiment(self):
        """
        获取市场整体情绪
        """
        sentiments = ["看多", "震荡", "看空"]
        return random.choice(sentiments)
