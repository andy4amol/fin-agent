import yahooFinance from 'yahoo-finance2';
import { StockPrice } from '../types';

/**
 * L5 Data - Market MCP (Model Context Protocol)
 * 市场数据源，获取实时行情数据
 */

/**
 * 获取指定股票代码的实时行情数据
 * @param ticker 股票代码 (如 0700.HK, BABA, AAPL)
 * @returns 股票价格数据
 */
export async function getStockPrice(ticker: string): Promise<StockPrice> {
  try {
    // 使用 yahoo-finance2 获取实时数据
    const quote = await yahooFinance.quote(ticker);

    const lastPrice = quote.regularMarketPrice || 0;
    const previousClose = quote.regularMarketPreviousClose || 0;

    let changePercent = 0;
    if (lastPrice && previousClose) {
      changePercent = ((lastPrice - previousClose) / previousClose) * 100;
    }

    return {
      ticker,
      current_price: Math.round(lastPrice * 100) / 100,
      change_percent: `${changePercent.toFixed(2)}%`,
      volume: quote.regularMarketVolume || 0,
    };
  } catch (error) {
    // 网络错误时使用 mock 数据
    console.error(`yfinance error: ${error}, using mock data for demo.`);
    const mockPrice = Math.random() * 400 + 100;
    const mockChange = Math.random() * 10 - 5;
    return {
      ticker,
      current_price: Math.round(mockPrice * 100) / 100,
      change_percent: `${mockChange.toFixed(2)}%`,
      volume: 1000000,
      note: 'Mock Data (Network Error)',
    };
  }
}

/**
 * 批量获取多只股票的价格
 * @param tickers 股票代码数组
 * @returns 股票价格数据数组
 */
export async function getStockPrices(tickers: string[]): Promise<StockPrice[]> {
  const promises = tickers.map((ticker) => getStockPrice(ticker));
  return Promise.all(promises);
}
