import { Holding, Transaction, TradingBehavior } from '../types';

/**
 * L5 Data - User Database
 * 用户数据库，管理用户持仓和交易记录
 */
export class UserDB {
  private transactions: Transaction[] = [];
  private holdings: Holding[] = [];

  /**
   * 获取用户持仓
   * @param userId 用户ID
   * @returns 持仓列表
   */
  getUserHoldings(userId: string): Holding[] {
    // 模拟返回一些持仓数据
    return [
      { ticker: '0700.HK', cost: 300.0, quantity: 100 },
      { ticker: 'BABA', cost: 80.0, quantity: 50 },
      { ticker: 'AAPL', cost: 150.0, quantity: 20 },
    ];
  }

  /**
   * 获取最近交易流水
   * @param userId 用户ID
   * @param limit 返回记录数量限制
   * @returns 交易记录列表
   */
  getRecentTransactions(userId: string, limit: number = 5): Transaction[] {
    return [
      {
        date: '2023-10-01',
        action: 'BUY',
        ticker: '0700.HK',
        price: 300.0,
        quantity: 100,
      },
      {
        date: '2023-09-15',
        action: 'BUY',
        ticker: 'BABA',
        price: 80.0,
        quantity: 50,
      },
    ];
  }
}
