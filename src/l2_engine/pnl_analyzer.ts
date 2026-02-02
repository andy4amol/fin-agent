import { Holding, MarketData, PnLReport, PnLDetail } from '../types';

/**
 * L2 Engine - PnL Analyzer
 * 盈亏分析引擎，计算持仓盈亏和归因
 */
export class PnLAnalyzer {
  /**
   * 计算持仓盈亏归因
   * @param holdings 持仓列表
   * @param currentMap 当前市场价格映射
   * @returns 盈亏分析报告
   */
  static calculateAttribution(
    holdings: Holding[],
    currentMap: Map<string, MarketData | number>
  ): PnLReport {
    const report: PnLDetail[] = [];
    let totalPnl = 0;
    let totalCost = 0;

    for (const item of holdings) {
      const ticker = item.ticker;
      const marketData = currentMap.get(ticker);

      // 兼容 current_map 是 number 或者是 object 的情况
      let currPrice: number;
      if (typeof marketData === 'number') {
        currPrice = marketData;
      } else if (marketData && typeof marketData === 'object') {
        currPrice = marketData.current_price ?? item.cost;
      } else {
        currPrice = item.cost;
      }

      const cost = item.cost;
      const quantity = item.quantity;

      const pnl = (currPrice - cost) * quantity;
      totalPnl += pnl;
      totalCost += cost * quantity;

      const returnRate = cost !== 0 ? ((currPrice / cost) - 1) * 100 : 0;

      report.push({
        ticker,
        current_price: Math.round(currPrice * 100) / 100,
        cost_price: Math.round(cost * 100) / 100,
        quantity,
        pnl: Math.round(pnl * 100) / 100,
        return_rate: `${returnRate.toFixed(2)}%`,
      });
    }

    const totalReturnRate = totalCost !== 0 ? (totalPnl / totalCost) * 100 : 0;

    return {
      total_pnl: Math.round(totalPnl * 100) / 100,
      total_return_rate: `${totalReturnRate.toFixed(2)}%`,
      details: report,
      summary: totalPnl > 0 ? '盈利' : '亏损',
    };
  }
}
