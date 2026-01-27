# l3_rag/search_engine.py

class SearchEngine:
    def __init__(self, news_source):
        self.news_source = news_source

    def search(self, query):
        """
        根据 query 检索相关信息
        """
        # 简单解析 query 提取 ticker (示例)
        ticker = None
        if "0700" in query:
            ticker = "0700.HK"
        elif "阿里" in query:
            ticker = "BABA"
        elif "苹果" in query:
            ticker = "AAPL"
        
        results = []
        if ticker:
            news = self.news_source.get_company_news(ticker)
            for n in news:
                results.append({"content": n, "source": "News", "relevance": 0.9})
        
        # 添加通用市场信息
        sentiment = self.news_source.get_market_sentiment()
        results.append({"content": f"当前市场情绪: {sentiment}", "source": "MarketSentiment", "relevance": 0.5})
        
        return results
