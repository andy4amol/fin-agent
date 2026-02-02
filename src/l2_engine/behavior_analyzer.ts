import { Transaction, TradingBehavior } from '../types';

/**
 * L2 Engine - Behavior Analyzer
 * 行为分析器，分析交易行为模式
 */
export class BehaviorAnalyzer {
  /**
   * 分析交易行为
   * @param transactions 交易记录列表
   * @returns 交易行为分析结果
   */
  static analyzeTransactions(transactions: Transaction[]): TradingBehavior | string {
    if (!transactions || transactions.length === 0) {
      return '暂无交易记录';
    }

    // 统计买入卖出次数
    const buyCount = transactions.filter((t) => t.action === 'BUY').length;
    const sellCount = transactions.filter((t) => t.action === 'SELL').length;

    let style: '积极积累型' | '获利了结型' | '平衡型' = '平衡型';
    if (buyCount > sellCount * 2) {
      style = '积极积累型';
    } else if (sellCount > buyCount) {
      style = '获利了结型';
    }

    return {
      total_transactions: transactions.length,
      buy_count: buyCount,
      sell_count: sellCount,
      trading_style: style,
    };
  }
}
