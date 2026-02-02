import { NewsSource } from '../types';

/**
 * L5 Data - News Data Source
 * 新闻数据源，提供公司新闻和市场情绪
 */
export class NewsData implements NewsSource {
  /**
   * 获取个股相关新闻/研报
   * @param ticker 股票代码
   * @returns 新闻列表
   */
  getCompanyNews(ticker: string): string[] {
    // 模拟新闻数据
    const mockNews: Record<string, string[]> = {
      '0700.HK': [
        '腾讯发布最新季度财报，营收超预期',
        '游戏业务回暖，腾讯股价看涨',
      ],
      BABA: [
        '阿里拆分上市计划推进中',
        '电商竞争加剧，阿里寻求新增长点',
      ],
      AAPL: ['iPhone 15销量火爆', '苹果Vision Pro即将发售'],
    };
    return mockNews[ticker] || ['暂无相关重磅新闻'];
  }

  /**
   * 获取市场整体情绪
   * @returns 市场情绪字符串
   */
  getMarketSentiment(): string {
    const sentiments = ['看多', '震荡', '看空'];
    return sentiments[Math.floor(Math.random() * sentiments.length)];
  }
}
