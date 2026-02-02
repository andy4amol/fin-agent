/**
 * Risk Attribution Engine
 * 风险归因引擎 - 实现基于Euler定理的风险贡献分解
 *
 * 支持：
 * 1. Euler风险贡献分配（边际风险贡献）
 * 2. VaR/CVaR归因（参数法、历史模拟法、蒙特卡洛）
 * 3. 因子风险归因（行业、风格、宏观）
 * 4. 尾部风险归因（压力测试、情景分析）
 */

import { Matrix } from 'ml-matrix';
import * as ss from 'simple-statistics';
import _ from 'lodash';

// ============================================================================
// Core Data Types
// ============================================================================

/**
 * 持仓风险数据
 */
export interface PositionRiskData {
  ticker: string;
  weight: number;
  volatility: number;
  beta: number;
  correlationWithPortfolio: number;
  marginalVaR: number;
  marginalCVaR: number;
  componentVaR: number;
  componentCVaR: number;
  percentRiskContribution: number;
}

/**
 * 协方差矩阵数据
 */
export interface CovarianceData {
  tickers: string[];
  matrix: Matrix;
  correlationMatrix: Matrix;
  volatilities: number[];
}

/**
 * 风险归因结果
 */
export interface RiskAttributionResult {
  // 组合风险指标
  portfolioVolatility: number;
  portfolioVaR: number;
  portfolioCVaR: number;
  portfolioExpectedReturn: number;
  
  // 置信水平
  confidenceLevel: number;
  varLevel: number;
  cvarLevel: number;
  
  // 风险归因（Euler分配）
  positionRiskContributions: PositionRiskContribution[];
  
  // 因子风险归因
  factorRiskAttribution: FactorRiskAttribution[];
  
  // 尾部风险归因
  tailRiskAttribution: TailRiskAttribution;
  
  // 统计指标
  diversificationRatio: number;
  herfindahlIndex: number;
  effectiveNumberOfAssets: number;
  
  // 风险调整收益
  riskAdjustedReturns: RiskAdjustedReturns;
}

/**
 * 持仓风险贡献
 */
export interface PositionRiskContribution {
  ticker: string;
  weight: number;
  
  // 波动率贡献
  marginalVolatilityContribution: number;
  percentageVolatilityContribution: number;
  
  // VaR贡献
  marginalVaR: number;
  componentVaR: number;
  percentageVaRContribution: number;
  incrementalVaR: number;
  
  // CVaR贡献
  marginalCVaR: number;
  componentCVaR: number;
  percentageCVaRContribution: number;
  incrementalCVaR: number;
  
  // 风险调整后收益
  riskAdjustedReturn: number;
  returnPerUnitRisk: number;
  diversificationBenefit: number;
}

/**
 * 因子风险归因
 */
export interface FactorRiskAttribution {
  factor: string;
  type: 'industry' | 'style' | 'macro' | 'statistical';
  
  // 因子暴露
  exposure: number;
  benchmarkExposure: number;
  activeExposure: number;
  
  // 因子收益
  factorReturn: number;
  factorVolatility: number;
  
  // 风险贡献
  volatilityContribution: number;
  varContribution: number;
  cvarContribution: number;
  
  // 百分比贡献
  percentageVolatilityContribution: number;
  percentageVarContribution: number;
  percentageCvarContribution: number;
  
  // 显著性
  significance: number;
  confidenceInterval: [number, number];
}

/**
 * 尾部风险归因
 */
export interface TailRiskAttribution {
  // VaR/CVaR设置
  varLevel: number;
  cvarLevel: number;
  varAmount: number;
  cvarAmount: number;
  
  // 尾部风险贡献
  tailRiskContributions: TailRiskContribution[];
  
  // 尾部相关性
  tailCorrelations: Map<string, number>;
  
  // 压力测试结果
  stressTestResults: StressTestResult[];
  
  // 情景分析
  scenarioAnalysis: ScenarioAnalysis;
  
  // 尾部风险指标
  tailRiskMetrics: TailRiskMetrics;
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
  percentageVarContribution: number;
  percentageCvarContribution: number;
  marginalTailRisk: number;
  componentTailRisk: number;
}

/**
 * 压力测试结果
 */
export interface StressTestResult {
  scenario: string;
  scenarioDescription: string;
  scenarioType: 'historical' | 'hypothetical' | 'monte_carlo';
  
  // 组合损失
  portfolioLoss: number;
  portfolioLossPercent: number;
  benchmarkLoss: number;
  benchmarkLossPercent: number;
  activeLoss: number;
  activeLossPercent: number;
  
  // 恢复时间
  recoveryTime: number;
  recoveryProbability: number;
  
  // 尾部风险增加
  tailRiskIncrease: number;
  varIncrease: number;
  cvarIncrease: number;
  
  // 影响分析
  impactOnAttribution: string;
  affectedSectors: string[];
  affectedPositions: string[];
  
  // 置信度
  confidence: number;
  confidenceInterval: [number, number];
}

/**
 * 情景分析
 */
export interface ScenarioAnalysis {
  baseCase: ScenarioResult;
  bullCase: ScenarioResult;
  bearCase: ScenarioResult;
  stressScenarios: ScenarioResult[];
  customScenarios: ScenarioResult[];
}

/**
 * 情景结果
 */
export interface ScenarioResult {
  name: string;
  description: string;
  portfolioReturn: number;
  portfolioVolatility: number;
  portfolioVaR: number;
  portfolioCVaR: number;
  probability: number;
  confidence: number;
}

/**
 * 尾部风险指标
 */
export interface TailRiskMetrics {
  skewness: number;
  kurtosis: number;
  jarqueBeraTest: StatisticalTest;
  andersonDarlingTest: StatisticalTest;
  lillieforsTest: StatisticalTest;
  extremeValueIndex: number;
  tailIndex: number;
  hillEstimator: number;
}

/**
 * 统计检验
 */
export interface StatisticalTest {
  testName: string;
  statistic: number;
  criticalValue: number;
  pValue: number;
  significant: boolean;
  confidence: number;
}

/**
 * 风险调整收益
 */
export interface RiskAdjustedReturns {
  sharpeRatio: number;
  sortinoRatio: number;
  treynorRatio: number;
  jensenAlpha: number;
  appraisalRatio: number;
  informationRatio: number;
  m2Measure: number;
  m2Alpha: number;
  omegaRatio: number;
  kappa3Ratio: number;
  upsidePotentialRatio: number;
  calmarRatio: number;
  sterlingRatio: number;
  burkeRatio: number;
}

// ============================================================================
// Export
// ============================================================================

export * from './risk_attribution';
