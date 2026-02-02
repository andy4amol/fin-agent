import { Holding, RiskReport, RiskContribution } from '../types';

/**
 * L2 Engine - Risk Model
 * 风险模型，计算持仓风险因子
 */
export class RiskModel {
  /**
   * 计算持仓组合风险
   * @param holdings 持仓列表
   * @returns 风险分析报告
   */
  static calculatePortfolioRisk(holdings: Holding[]): RiskReport {
    let riskScore = 0;
    const details: RiskContribution[] = [];

    for (const item of holdings) {
      // 简单 mock 风险权重
      let riskWeight = 1.0;
      if (item.ticker.includes('0700')) {
        riskWeight = 1.2; // 科技股波动大
      } else if (item.ticker.includes('AAPL')) {
        riskWeight = 1.1;
      }

      const itemRisk = (item.quantity * riskWeight) / 100; // 归一化 mock
      riskScore += itemRisk;

      details.push({
        ticker: item.ticker,
        risk_contribution: Math.round(itemRisk * 100) / 100,
      });
    }

    let level: '低' | '中' | '高' = '低';
    if (riskScore > 5) {
      level = '中';
    }
    if (riskScore > 10) {
      level = '高';
    }

    return {
      total_risk_score: Math.round(riskScore * 100) / 100,
      risk_level: level,
      details,
    };
  }
}
