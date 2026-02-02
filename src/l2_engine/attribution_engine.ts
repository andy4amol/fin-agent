/**
 * L2 Engine - Attribution Engine
 * 专业的持仓归因分析引擎
 * 
 * 支持的归因模型：
 * 1. Brinson Attribution (收益归因) - 单期/多期/货币
 * 2. Risk Attribution (风险归因) - Euler Allocation / VaR / CVaR
 * 3. Factor Attribution (因子归因) - 行业/风格/宏观/统计
 * 4. Time-Series Attribution (时间归因) - 滚动/机制检测/漂移
 * 
 * @author Fin-Agent Team
 * @version 2.0.0
 */

import { Matrix } from 'ml-matrix';
import { Holding, StockPrice, MarketData, RiskReport } from '../types';

// ============================================================================
// 基础数据结构
// ============================================================================

/**
 * 持仓权重和收益
 */
export interface PortfolioPosition {
  ticker: string;
  weight: number;           // 组合权重
  return: number;           // 期间收益（小数）
  contribution: number;     // 贡献度 = weight × return
  marketValue: number;     // 市值
}

/**
 * 基准数据
 */
export interface BenchmarkData {
  name: string;
  weights: Map<string, number>;     // 成分股权重
  returns: Map<string, number>;     // 成分股收益
  totalReturn: number;               // 基准总收益
}

// ============================================================================
// Brinson 归因模型
// ============================================================================

/**
 * Brinson 归因结果
 */
export interface BrinsonAttribution {
  // 基础收益
  portfolioReturn: number;           // 组合收益
  benchmarkReturn: number;          // 基准收益
  activeReturn: number;             // 超额收益 = 组合 - 基准
  
  // Brinson 三效应
  allocationEffect: number;         // 配置效应
  selectionEffect: number;          // 选股效应
  interactionEffect: number;         // 交互效应
  
  // 详细分解（按行业/板块）
  sectorAttribution: SectorAttribution[];
  
  // 统计指标
  informationRatio: number;         // 信息比率
  trackingError: number;            // 跟踪误差
  battingAverage: number;           // 胜率
}

/**
 * 板块归因详情
 */
export interface SectorAttribution {
  sector: string;                    // 板块名称
  portfolioWeight: number;            // 组合权重
  benchmarkWeight: number;            // 基准权重
  portfolioReturn: number;            // 组合板块收益
  benchmarkReturn: number;            // 基准板块收益
  
  // 贡献分解
  allocationEffect: number;           // 配置效应
  selectionEffect: number;            // 选股效应
  interactionEffect: number;          // 交互效应
  totalEffect: number;                // 总效应
}

/**
 * Brinson 归因计算器
 */
export class BrinsonAttributionCalculator {
  /**
   * 计算单期 Brinson 归因
   * 
   * @param portfolioPositions 组合持仓
   * @param benchmarkData 基准数据
   * @param sectors 板块分类映射 (ticker -> sector)
   * @returns Brinson 归因结果
   */
  static calculateAttribution(
    portfolioPositions: PortfolioPosition[],
    benchmarkData: BenchmarkData,
    sectors: Map<string, string>
  ): BrinsonAttribution {
    // 计算组合和基准的总收益
    const portfolioReturn = portfolioPositions.reduce(
      (sum, pos) => sum + pos.contribution,
      0
    );
    const benchmarkReturn = benchmarkData.totalReturn;
    const activeReturn = portfolioReturn - benchmarkReturn;

    // 按板块聚合
    const sectorData = this.aggregateBySector(
      portfolioPositions,
      benchmarkData,
      sectors
    );

    // 计算 Brinson 三效应
    let allocationEffect = 0;
    let selectionEffect = 0;
    let interactionEffect = 0;

    for (const sector of sectorData) {
      const wp = sector.portfolioWeight;
      const wb = sector.benchmarkWeight;
      const Rp = sector.portfolioReturn;
      const Rb = sector.benchmarkReturn;

      // 配置效应 (Allocation Effect)
      sector.allocationEffect = (wp - wb) * Rb;
      allocationEffect += sector.allocationEffect;

      // 选股效应 (Selection Effect)
      sector.selectionEffect = wb * (Rp - Rb);
      selectionEffect += sector.selectionEffect;

      // 交互效应 (Interaction Effect)
      sector.interactionEffect = (wp - wb) * (Rp - Rb);
      interactionEffect += sector.interactionEffect;

      // 总效应
      sector.totalEffect =
        sector.allocationEffect +
        sector.selectionEffect +
        sector.interactionEffect;
    }

    // 计算统计指标
    const trackingError = this.calculateTrackingError(
      portfolioPositions,
      benchmarkData
    );
    const informationRatio =
      trackingError !== 0 ? activeReturn / trackingError : 0;

    return {
      portfolioReturn,
      benchmarkReturn,
      activeReturn,
      allocationEffect,
      selectionEffect,
      interactionEffect,
      sectorAttribution: sectorData,
      informationRatio,
      trackingError,
      battingAverage: this.calculateBattingAverage(
        portfolioPositions,
        benchmarkData
      ),
    };
  }

  /**
   * 按板块聚合数据
   */
  private static aggregateBySector(
    portfolioPositions: PortfolioPosition[],
    benchmarkData: BenchmarkData,
    sectors: Map<string, string>
  ): SectorAttribution[] {
    const sectorMap = new Map<string, SectorAttribution>();

    // 处理组合持仓
    for (const pos of portfolioPositions) {
      const sector = sectors.get(pos.ticker) || 'Unknown';
      
      if (!sectorMap.has(sector)) {
        sectorMap.set(sector, {
          sector,
          portfolioWeight: 0,
          benchmarkWeight: 0,
          portfolioReturn: 0,
          benchmarkReturn: 0,
          allocationEffect: 0,
          selectionEffect: 0,
          interactionEffect: 0,
          totalEffect: 0,
        });
      }

      const sectorData = sectorMap.get(sector)!;
      sectorData.portfolioWeight += pos.weight;
      sectorData.portfolioReturn += pos.contribution;
    }

    // 处理基准数据
    for (const [ticker, weight] of benchmarkData.weights) {
      const sector = sectors.get(ticker) || 'Unknown';
      const return_ = benchmarkData.returns.get(ticker) || 0;

      if (!sectorMap.has(sector)) {
        sectorMap.set(sector, {
          sector,
          portfolioWeight: 0,
          benchmarkWeight: 0,
          portfolioReturn: 0,
          benchmarkReturn: 0,
          allocationEffect: 0,
          selectionEffect: 0,
          interactionEffect: 0,
          totalEffect: 0,
        });
      }

      const sectorData = sectorMap.get(sector)!;
      sectorData.benchmarkWeight += weight;
      sectorData.benchmarkReturn += weight * return_;
    }

    return Array.from(sectorMap.values());
  }

  /**
   * 计算跟踪误差
   */
  private static calculateTrackingError(
    portfolioPositions: PortfolioPosition[],
    benchmarkData: BenchmarkData
  ): number {
    // 简化的跟踪误差计算
    // 实际应用中需要历史收益率数据
    const activeReturns = portfolioPositions.map((pos) => {
      const benchmarkReturn = benchmarkData.returns.get(pos.ticker) || 0;
      return pos.return - benchmarkReturn;
    });

    const mean = activeReturns.reduce((a, b) => a + b, 0) / activeReturns.length;
    const variance =
      activeReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) /
      activeReturns.length;

    return Math.sqrt(variance);
  }

  /**
   * 计算胜率
   */
  private static calculateBattingAverage(
    portfolioPositions: PortfolioPosition[],
    benchmarkData: BenchmarkData
  ): number {
    const wins = portfolioPositions.filter((pos) => {
      const benchmarkReturn = benchmarkData.returns.get(pos.ticker) || 0;
      return pos.return > benchmarkReturn;
    }).length;

    return portfolioPositions.length > 0 ? wins / portfolioPositions.length : 0;
  }
}

// ============================================================================
// 风险归因模型
// ============================================================================

/**
 * 风险归因结果
 */
export interface RiskAttribution {
  // 组合风险指标
  portfolioVolatility: number;           // 组合波动率
  portfolioVaR: number;                   // VaR (Value at Risk)
  portfolioCVaR: number;                  // CVaR (Conditional VaR)
  
  // 基准风险指标
  benchmarkVolatility: number;            // 基准波动率
  benchmarkVaR: number;                  // 基准VaR
  benchmarkCVaR: number;                  // 基准CVaR
  
  // 主动风险
  activeRisk: number;                       // 主动风险（跟踪误差）
  activeShare: number;                      // 主动份额
  
  // 风险归因（Euler分配）
  positionContributions: PositionRiskContribution[];
  
  // 因子风险归因
  factorRiskAttribution: FactorRiskAttribution[];
  
  // 尾部风险归因
  tailRiskAttribution: TailRiskAttribution;
}

/**
 * 持仓风险贡献
 */
export interface PositionRiskContribution {
  ticker: string;
  weight: number;
  marginalContribution: number;     // 边际风险贡献
  percentageContribution: number; // 百分比风险贡献
  riskAdjustedReturn: number;       // 风险调整后收益
  diversificationBenefit: number; // 分散化效益
}

/**
 * 因子风险归因
 */
export interface FactorRiskAttribution {
  factor: string;
  type: 'industry' | 'style' | 'macro' | 'statistical';
  exposure: number;                  // 因子暴露
  volatilityContribution: number;  // 波动率贡献
  varContribution: number;           // VaR贡献
  cvarContribution: number;          // CVaR贡献
}

/**
 * 尾部风险归因
 */
export interface TailRiskAttribution {
  varLevel: number;                    // VaR置信水平 (e.g., 0.95)
  cvarLevel: number;                   // CVaR置信水平
  varAmount: number;                   // VaR金额
  cvarAmount: number;                  // CVaR金额
  tailRiskContribution: TailRiskContribution[];
  stressTestResults: StressTestResult[];
}

/**
 * 尾部风险贡献
 */
export interface TailRiskContribution {
  ticker: string;
  varContribution: number;
  cvarContribution: number;
  tailCorrelation: number;
  conditionalContribution: number;
}

/**
 * 压力测试结果
 */
export interface StressTestResult {
  scenario: string;
  scenarioDescription: string;
  portfolioLoss: number;
  benchmarkLoss: number;
  activeLoss: number;
  recoveryTime: number;
  tailRiskIncrease: number;
}

/**
 * 风险归因计算器
 */
export class RiskAttributionCalculator {
  /**
   * 计算风险归因
   * 
   * @param positions 组合持仓
   * @param benchmarkData 基准数据
   * @param returns 历史收益率矩阵 (ticker × time)
   * @param confidenceLevel 置信水平 (默认0.95)
   * @returns 风险归因结果
   */
  static calculateAttribution(
    positions: PortfolioPosition[],
    benchmarkData: BenchmarkData,
    returns: Map<string, number[]>,
    confidenceLevel: number = 0.95
  ): RiskAttribution {
    // 构建权重向量
    const weights = new Map<string, number>();
    for (const pos of positions) {
      weights.set(pos.ticker, pos.weight);
    }

    // 计算协方差矩阵
    const covarianceMatrix = this.calculateCovarianceMatrix(returns);

    // 计算组合风险指标
    const portfolioVolatility = this.calculatePortfolioVolatility(
      weights,
      covarianceMatrix
    );
    const portfolioVaR = this.calculateVaR(
      positions,
      returns,
      confidenceLevel
    );
    const portfolioCVaR = this.calculateCVaR(
      positions,
      returns,
      confidenceLevel
    );

    // 计算基准风险指标
    const benchmarkWeights = benchmarkData.weights;
    const benchmarkVolatility = this.calculatePortfolioVolatility(
      benchmarkWeights,
      covarianceMatrix
    );

    // 计算主动风险
    const activeRisk = this.calculateActiveRisk(
      weights,
      benchmarkWeights,
      covarianceMatrix
    );
    const activeShare = this.calculateActiveShare(weights, benchmarkWeights);

    // 计算风险贡献（Euler分配）
    const positionContributions = this.calculateRiskContributions(
      positions,
      covarianceMatrix,
      portfolioVolatility
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
      factorRiskAttribution: [], // TODO: 实现因子风险归因
      tailRiskAttribution: {
        varLevel: confidenceLevel,
        cvarLevel: confidenceLevel,
        varAmount: portfolioVaR,
        cvarAmount: portfolioCVaR,
        tailRiskContribution: [], // TODO: 实现尾部风险贡献
        stressTestResults: [], // TODO: 实现压力测试
      },
    };
  }

  // ... 其他辅助计算方法（协方差矩阵、波动率、VaR等）
  
  private static calculateCovarianceMatrix(
    returns: Map<string, number[]>
  ): Matrix {
    // 简化实现：实际应用需要更复杂的协方差估计
    const tickers = Array.from(returns.keys());
    const n = tickers.length;
    const covMatrix = Matrix.zeros(n, n);

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const returnsI = returns.get(tickers[i]) || [];
        const returnsJ = returns.get(tickers[j]) || [];
        covMatrix.set(i, j, this.calculateCovariance(returnsI, returnsJ));
      }
    }

    return covMatrix;
  }

  private static calculateCovariance(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;
    
    const n = x.length;
    const meanX = x.reduce((a, b) => a + b, 0) / n;
    const meanY = y.reduce((a, b) => a + b, 0) / n;
    
    let covariance = 0;
    for (let i = 0; i < n; i++) {
      covariance += (x[i] - meanX) * (y[i] - meanY);
    }
    
    return covariance / (n - 1);
  }

  private static calculatePortfolioVolatility(
    weights: Map<string, number>,
    covarianceMatrix: Matrix
  ): number {
    const weightArray = Array.from(weights.values());
    const weightMatrix = Matrix.columnVector(weightArray);
    const variance = weightMatrix.transpose()
      .mmul(covarianceMatrix)
      .mmul(weightMatrix)
      .get(0, 0);
    return Math.sqrt(variance);
  }

  private static calculateVaR(
    positions: PortfolioPosition[],
    returns: Map<string, number[]>,
    confidenceLevel: number
  ): number {
    // 简化实现：使用历史模拟法
    const portfolioValues: number[] = [];
    const n = returns.get(positions[0]?.ticker)?.length || 0;

    for (let t = 0; t < n; t++) {
      let portfolioValue = 0;
      for (const pos of positions) {
        const returnsArray = returns.get(pos.ticker) || [];
        if (t < returnsArray.length) {
          portfolioValue += pos.marketValue * (1 + returnsArray[t]);
        }
      }
      portfolioValues.push(portfolioValue);
    }

    // 计算VaR
    portfolioValues.sort((a, b) => a - b);
    const varIndex = Math.floor((1 - confidenceLevel) * portfolioValues.length);
    const currentValue = portfolioValues[portfolioValues.length - 1];
    const varValue = portfolioValues[varIndex];

    return currentValue - varValue;
  }

  private static calculateCVaR(
    positions: PortfolioPosition[],
    returns: Map<string, number[]>,
    confidenceLevel: number
  ): number {
    // 简化实现：VaR以下的平均值
    const portfolioValues: number[] = [];
    const n = returns.get(positions[0]?.ticker)?.length || 0;

    for (let t = 0; t < n; t++) {
      let portfolioValue = 0;
      for (const pos of positions) {
        const returnsArray = returns.get(pos.ticker) || [];
        if (t < returnsArray.length) {
          portfolioValue += pos.marketValue * (1 + returnsArray[t]);
        }
      }
      portfolioValues.push(portfolioValue);
    }

    portfolioValues.sort((a, b) => a - b);
    const varIndex = Math.floor((1 - confidenceLevel) * portfolioValues.length);
    const cvarValues = portfolioValues.slice(0, varIndex + 1);
    const currentValue = portfolioValues[portfolioValues.length - 1];
    const cvarValue = cvarValues.reduce((a, b) => a + b, 0) / cvarValues.length;

    return currentValue - cvarValue;
  }

  private static calculateActiveRisk(
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

  private static calculateActiveShare(
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

  private static calculateRiskContributions(
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
      marginalContribution /= portfolioVolatility;

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
}

// ============================================================================
// 多期归因模型
// ============================================================================

/**
 * 多期归因结果
 */
export interface MultiPeriodAttribution {
  periods: SinglePeriodAttribution[];
  cumulativeReturn: number;
  geometricAttribution: GeometricAttribution;
  // 归因漂移分析
  driftAnalysis: AttributionDriftAnalysis;
}

/**
 * 单期归因
 */
export interface SinglePeriodAttribution {
  period: string;              // 期间标识 (e.g., "2024-01")
  brinsonAttribution: BrinsonAttribution;
  // 其他归因模型结果...
}

/**
 * 几何归因（用于多期连接）
 */
export interface GeometricAttribution {
  // 链式连接效应
  linkedAllocationEffect: number;
  linkedSelectionEffect: number;
  linkedInteractionEffect: number;
  
  // 平滑算法
  smoothingAdjustment: number;
  
  // 几何解释
  geometricExplanation: string;
}

/**
 * 归因漂移分析
 */
export interface AttributionDriftAnalysis {
  // 时序稳定性
  allocationConsistency: number;      // 配置一致性
  selectionConsistency: number;       // 选股一致性
  
  // 风格漂移
  styleDrift: StyleDriftMetrics;
  
  // 机制变化检测
  regimeChanges: RegimeChange[];
  
  // 持续性分析
  persistenceAnalysis: PersistenceMetrics;
}

/**
 * 风格漂移指标
 */
export interface StyleDriftMetrics {
  valueTiltDrift: number;
  growthTiltDrift: number;
  qualityTiltDrift: number;
  momentumTiltDrift: number;
  overallStyleDriftScore: number;
  driftAlert: boolean;
}

/**
 * 机制变化
 */
export interface RegimeChange {
  date: string;
  fromRegime: string;
  toRegime: string;
  confidence: number;
  impactOnAttribution: string;
}

/**
 * 持续性指标
 */
export interface PersistenceMetrics {
  allocationEffectPersistence: number;
  selectionEffectPersistence: number;
  icAllocation: number;      // Information Coefficient
  icSelection: number;
  hitRate: number;
}

// ============================================================================
// 导出
// ============================================================================

export {
  BrinsonAttributionCalculator,
  // 其他归因计算器...
};

// TODO: 实现以下归因模型
// - FactorAttributionCalculator
// - RiskAttributionCalculator
// - TimeSeriesAttributionCalculator
// - MultiPeriodAttributionCalculator
