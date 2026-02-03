/**
 * Risk Attribution Calculator
 * 风险归因计算器 - 实现Euler风险贡献分解
 * 
 * 支持的模型：
 * 1. Euler风险贡献分配（边际风险贡献）
 * 2. VaR/CVaR归因（参数法、历史模拟法）
 * 3. 因子风险归因（行业、风格）
 * 4. 尾部风险归因（压力测试）
 */

import { Matrix } from 'ml-matrix';
import * as ss from 'simple-statistics';
import _ from 'lodash';
import {
  PortfolioPosition,
  BenchmarkData,
  RiskAttribution,
  PositionRiskContribution,
  FactorRiskAttribution,
  TailRiskAttribution,
  TailRiskContribution,
  StressTestResult,
} from '../../types/attribution';
import {
  calculateCovarianceMatrix,
  calculateCovariance,
  calculateCorrelation,
} from './base_attribution';

// ============================================================================
// Risk Attribution Calculator
// ============================================================================

/**
 * 风险归因计算器配置
 */
export interface RiskAttributionConfig {
  confidenceLevel: number;
  varMethod: 'parametric' | 'historical' | 'monte-carlo';
  monteCarloSimulations: number;
  riskFreeRate: number;
}

/**
 * 默认风险归因配置
 */
export const DEFAULT_RISK_CONFIG: RiskAttributionConfig = {
  confidenceLevel: 0.95,
  varMethod: 'historical',
  monteCarloSimulations: 10000,
  riskFreeRate: 0.02,
};

/**
 * 风险归因计算器
 */
export class RiskAttributionCalculator {
  private config: RiskAttributionConfig;

  constructor(config: Partial<RiskAttributionConfig> = {}) {
    this.config = { ...DEFAULT_RISK_CONFIG, ...config };
  }

  /**
   * 计算风险归因
   * 
   * @param positions 组合持仓
   * @param benchmarkData 基准数据
   * @param returns 历史收益率矩阵 (ticker × time)
   * @returns 风险归因结果
   */
  calculateAttribution(
    positions: PortfolioPosition[],
    benchmarkData: BenchmarkData,
    returns: Map<string, number[]>
  ): RiskAttribution {
    // 1. 构建权重向量
    const weights = new Map<string, number>();
    for (const pos of positions) {
      weights.set(pos.ticker, pos.weight);
    }

    // 2. 计算协方差矩阵
    const covarianceMatrix = calculateCovarianceMatrix(returns);

    // 3. 计算组合风险指标
    const portfolioVolatility = this.calculatePortfolioVolatility(
      weights,
      covarianceMatrix
    );
    const portfolioVaR = this.calculateVaR(
      positions,
      returns,
      this.config.confidenceLevel
    );
    const portfolioCVaR = this.calculateCVaR(
      positions,
      returns,
      this.config.confidenceLevel
    );

    // 4. 计算基准风险指标
    const benchmarkWeights = benchmarkData.weights;
    const benchmarkVolatility = this.calculatePortfolioVolatility(
      benchmarkWeights,
      covarianceMatrix
    );

    // 5. 计算主动风险
    const activeRisk = this.calculateActiveRisk(
      weights,
      benchmarkWeights,
      covarianceMatrix
    );
    const activeShare = this.calculateActiveShare(weights, benchmarkWeights);

    // 6. 计算风险贡献（Euler分配）
    const positionContributions = this.calculateRiskContributions(
      positions,
      covarianceMatrix,
      portfolioVolatility
    );

    // 7. 计算尾部风险归因
    const tailRiskAttribution = this.calculateTailRiskAttribution(
      positions,
      returns,
      portfolioVaR,
      portfolioCVaR
    );

    return {
      portfolioVolatility,
      portfolioVaR,
      portfolioCVaR,
      benchmarkVolatility,
      benchmarkVaR: portfolioVaR * (benchmarkVolatility / portfolioVolatility),
      benchmarkCVaR: portfolioCVaR * (benchmarkVolatility / portfolioVolatility),
      activeRisk,
      activeShare,
      positionContributions,
      factorRiskAttribution: [], // 由因子归因计算器填充
      tailRiskAttribution,
    };
  }

  // ==========================================================================
  // 私有辅助方法
  // ==========================================================================

  /**
   * 计算组合波动率
   */
  private calculatePortfolioVolatility(
    weights: Map<string, number>,
    covarianceMatrix: Matrix
  ): number {
    const weightArray = Array.from(weights.values());
    const weightMatrix = Matrix.columnVector(weightArray);
    const variance = weightMatrix
      .transpose()
      .mmul(covarianceMatrix)
      .mmul(weightMatrix)
      .get(0, 0);
    return Math.sqrt(Math.max(0, variance));
  }

  /**
   * 计算VaR
   */
  private calculateVaR(
    positions: PortfolioPosition[],
    returns: Map<string, number[]>,
    confidenceLevel: number
  ): number {
    // 使用历史模拟法
    const portfolioReturns: number[] = [];
    const n = returns.get(positions[0]?.ticker)?.length || 0;

    for (let t = 0; t < n; t++) {
      let portfolioReturn = 0;
      for (const pos of positions) {
        const returnsArray = returns.get(pos.ticker) || [];
        if (t < returnsArray.length) {
          portfolioReturn += pos.weight * returnsArray[t];
        }
      }
      portfolioReturns.push(portfolioReturn);
    }

    portfolioReturns.sort((a, b) => a - b);
    const varIndex = Math.floor((1 - confidenceLevel) * portfolioReturns.length);
    return -portfolioReturns[varIndex];
  }

  /**
   * 计算CVaR
   */
  private calculateCVaR(
    positions: PortfolioPosition[],
    returns: Map<string, number[]>,
    confidenceLevel: number
  ): number {
    // 计算VaR以下的平均值
    const portfolioReturns: number[] = [];
    const n = returns.get(positions[0]?.ticker)?.length || 0;

    for (let t = 0; t < n; t++) {
      let portfolioReturn = 0;
      for (const pos of positions) {
        const returnsArray = returns.get(pos.ticker) || [];
        if (t < returnsArray.length) {
          portfolioReturn += pos.weight * returnsArray[t];
        }
      }
      portfolioReturns.push(portfolioReturn);
    }

    portfolioReturns.sort((a, b) => a - b);
    const varIndex = Math.floor((1 - confidenceLevel) * portfolioReturns.length);
    const cvarReturns = portfolioReturns.slice(0, varIndex + 1);
    return -cvarReturns.reduce((a, b) => a + b, 0) / cvarReturns.length;
  }

  /**
   * 计算主动风险
   */
  private calculateActiveRisk(
    portfolioWeights: Map<string, number>,
    benchmarkWeights: Map<string, number>,
    covarianceMatrix: Matrix
  ): number {
    const activeWeights = new Map<string, number>();
    const allTickers = new Set([
      ...portfolioWeights.keys(),
      ...benchmarkWeights.keys(),
    ]);

    for (const ticker of allTickers) {
      const portfolioWeight = portfolioWeights.get(ticker) || 0;
      const benchmarkWeight = benchmarkWeights.get(ticker) || 0;
      activeWeights.set(ticker, portfolioWeight - benchmarkWeight);
    }

    return this.calculatePortfolioVolatility(activeWeights, covarianceMatrix);
  }

  /**
   * 计算主动份额
   */
  private calculateActiveShare(
    portfolioWeights: Map<string, number>,
    benchmarkWeights: Map<string, number>
  ): number {
    let sumAbsoluteDifference = 0;
    const allTickers = new Set([
      ...portfolioWeights.keys(),
      ...benchmarkWeights.keys(),
    ]);

    for (const ticker of allTickers) {
      const portfolioWeight = portfolioWeights.get(ticker) || 0;
      const benchmarkWeight = benchmarkWeights.get(ticker) || 0;
      sumAbsoluteDifference += Math.abs(portfolioWeight - benchmarkWeight);
    }

    return sumAbsoluteDifference / 2;
  }

  /**
   * 计算风险贡献（Euler分配）
   */
  private calculateRiskContributions(
    positions: PortfolioPosition[],
    covarianceMatrix: Matrix,
    portfolioVolatility: number
  ): PositionRiskContribution[] {
    const contributions: PositionRiskContribution[] = [];
    const n = positions.length;

    for (let i = 0; i < n; i++) {
      const pos = positions[i];

      // 计算边际风险贡献
      let marginalContribution = 0;
      for (let j = 0; j < n; j++) {
        marginalContribution +=
          pos.weight * covarianceMatrix.get(i, j) * positions[j].weight;
      }
      marginalContribution /= portfolioVolatility || 1;

      // 计算百分比风险贡献
      const percentageContribution =
        portfolioVolatility !== 0
          ? (pos.weight * marginalContribution) / portfolioVolatility
          : 0;

      // 计算风险调整后收益
      const riskAdjustedReturn =
        marginalContribution !== 0
          ? (pos.return / marginalContribution) * portfolioVolatility
          : 0;

      contributions.push({
        ticker: pos.ticker,
        weight: pos.weight,
        marginalContribution,
        percentageContribution,
        riskAdjustedReturn,
        diversificationBenefit: 0, // TODO: 计算分散化效益
      });
    }

    return contributions;
  }

  /**
   * 计算尾部风险归因
   */
  private calculateTailRiskAttribution(
    positions: PortfolioPosition[],
    returns: Map<string, number[]>,
    portfolioVaR: number,
    portfolioCVaR: number
  ): TailRiskAttribution {
    // 计算各持仓的尾部风险贡献
    const tailRiskContributions: TailRiskContribution[] = [];

    for (const pos of positions) {
      const tickerReturns = returns.get(pos.ticker) || [];

      // 计算VaR贡献（简化实现）
      const varContribution = pos.weight * portfolioVaR;
      const cvarContribution = pos.weight * portfolioCVaR;

      tailRiskContributions.push({
        ticker: pos.ticker,
        varContribution,
        cvarContribution,
        tailCorrelation: 0, // TODO: 计算尾部相关性
        conditionalContribution: cvarContribution,
      });
    }

    return {
      varLevel: this.config.confidenceLevel,
      cvarLevel: this.config.confidenceLevel,
      varAmount: portfolioVaR,
      cvarAmount: portfolioCVaR,
      tailRiskContribution: tailRiskContributions,
      stressTestResults: [], // TODO: 实现压力测试
    };
  }
}

// ============================================================================
// Export (已包含在类定义中)
// ============================================================================
