/**
 * Attribution Types - Complete Type Definitions for Attribution Analysis
 * 归因分析完整类型定义
 */

import * as ss from 'simple-statistics';

// ============================================================================
// Core Data Models
// ============================================================================

/**
 * 持仓位置数据
 */
export interface PortfolioPosition {
  ticker: string;
  weight: number;
  return: number;
  contribution: number;
  marketValue: number;
  // 兼容旧版属性
  portfolioWeight?: number;
  sector?: string;
}

/**
 * 基准数据
 */
export interface BenchmarkData {
  name: string;
  weights: Map<string, number>;
  returns: Map<string, number>;
  totalReturn: number;
}

/**
 * 板块分类
 */
export interface SectorClassification {
  ticker: string;
  sector: string;
  industry: string;
  superSector?: string;
}

// ============================================================================
// Brinson Attribution
// ============================================================================

/**
 * 板块归因详情
 */
export interface SectorAttribution {
  sector: string;
  portfolioWeight: number;
  benchmarkWeight: number;
  portfolioReturn: number;
  benchmarkReturn: number;
  allocationEffect: number;
  selectionEffect: number;
  interactionEffect: number;
  totalEffect: number;
}

/**
 * Brinson 归因结果
 */
export interface BrinsonAttribution {
  portfolioReturn: number;
  benchmarkReturn: number;
  activeReturn: number;
  allocationEffect: number;
  selectionEffect: number;
  interactionEffect: number;
  sectorAttribution: SectorAttribution[];
  informationRatio: number;
  trackingError: number;
  battingAverage: number;
  upsideCapture: number;
  downsideCapture: number;
  sharpeRatio: number;
  sortinoRatio: number;
  treynorRatio: number;
  jensenAlpha: number;
  attributionQuality: AttributionQuality;
  // 可选字段，用于多期归因
  period?: {
    startDate: string;
    endDate: string;
    holdings: Array<{
      ticker: string;
      weight: number;
      return: number;
      contribution: number;
      marketValue: number;
    }>;
    portfolioReturn: number;
    benchmarkReturn: number;
  };
  currencyAttribution?: unknown;
}

// ============================================================================
// Risk Attribution
// ============================================================================

/**
 * 持仓风险贡献
 */
export interface PositionRiskContribution {
  ticker: string;
  weight: number;
  marginalContribution: number;
  percentageContribution: number;
  riskAdjustedReturn: number;
  diversificationBenefit: number;
}

/**
 * 因子风险归因
 */
export interface FactorRiskAttribution {
  factor: string;
  type: 'industry' | 'style' | 'macro' | 'statistical';
  exposure: number;
  volatilityContribution: number;
  varContribution: number;
  cvarContribution: number;
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
 * 尾部风险归因
 */
export interface TailRiskAttribution {
  varLevel: number;
  cvarLevel: number;
  varAmount: number;
  cvarAmount: number;
  tailRiskContribution: TailRiskContribution[];
  stressTestResults: StressTestResult[];
}

/**
 * 风险归因结果
 */
export interface RiskAttribution {
  portfolioVolatility: number;
  portfolioVaR: number;
  portfolioCVaR: number;
  benchmarkVolatility: number;
  benchmarkVaR: number;
  benchmarkCVaR: number;
  activeRisk: number;
  activeShare: number;
  positionContributions: PositionRiskContribution[];
  factorRiskAttribution: FactorRiskAttribution[];
  tailRiskAttribution: TailRiskAttribution;
}

// ============================================================================
// Brinson Configuration Types
// ============================================================================

/**
 * Brinson归因计算配置
 */
export interface BrinsonCalculationConfig {
  method: 'BHB' | 'BF' | 'MultiCurrency';
  linkingMethod: 'Carino' | 'Menchero' | 'GRAP' | 'Carino-Menchero';
  handleCash: boolean;
  handleTax: boolean;
  handleTransactionCosts: boolean;
  includeCurrency: boolean;
  currencyTranslationMethod: 'FCR' | 'FX' | 'Local';
  roundingPrecision: number;
  confidenceLevel: number;
  significanceThreshold: number;
}

/**
 * 默认Brinson计算配置
 */
export const DEFAULT_BRINSON_CONFIG: BrinsonCalculationConfig = {
  method: 'BHB',
  linkingMethod: 'Carino',
  handleCash: true,
  handleTax: false,
  handleTransactionCosts: false,
  includeCurrency: false,
  currencyTranslationMethod: 'FCR',
  roundingPrecision: 6,
  confidenceLevel: 0.95,
  significanceThreshold: 0.05,
};

// ============================================================================
// Multi-Period Brinson Types
// ============================================================================

/**
 * 多期Brinson归因结果
 */
export interface MultiPeriodBrinsonAttribution {
  periods: SinglePeriodAttribution[];
  cumulativeReturn: number;
  cumulativeBenchmarkReturn: number;
  cumulativeActiveReturn: number;
  linkedAttribution: LinkedAttribution;
  geometricAttribution: GeometricAttribution;
  driftAnalysis: AttributionDriftAnalysis;
  summaryStatistics: MultiPeriodSummaryStatistics;
}

/**
 * 链式连接归因
 */
export interface LinkedAttribution {
  method: 'Carino' | 'Menchero' | 'GRAP' | 'Carino-Menchero';
  linkedAllocationEffect: number;
  linkedSelectionEffect: number;
  linkedInteractionEffect: number;
  smoothingAdjustment: number;
  residual: number;
}

/**
 * 多期汇总统计
 */
export interface MultiPeriodSummaryStatistics {
  totalPeriods: number;
  positiveActiveReturnPeriods: number;
  negativeActiveReturnPeriods: number;
  averageActiveReturn: number;
  medianActiveReturn: number;
  stdDevActiveReturn: number;
  maxActiveReturn: number;
  minActiveReturn: number;
  averageInformationRatio: number;
  averageTrackingError: number;
  hitRate: number;
  bestPeriod: string;
  worstPeriod: string;
  consistencyScore: number;
  cumulativePortfolioReturn: number;
  cumulativeBenchmarkReturn: number;
  cumulativeActiveReturn: number;
}

/**
 * 归因质量指标
 */
export interface AttributionQuality {
  completeness: number;
  accuracy: number;
  consistency: number;
  explanatoryPower: number;
  residuals: ResidualAnalysis;
}

/**
 * 残差分析
 */
export interface ResidualAnalysis {
  totalResidual: number;
  unexplainedReturn: number;
  residualStdDev: number;
  maxResidual: number;
  residualTests: ResidualTest[];
}

/**
 * 残差检验
 */
export interface ResidualTest {
  testName: string;
  statistic: number;
  pValue: number;
  passed: boolean;
}

/**
 * 归因期间
 */
export interface AttributionPeriod {
  startDate: string;
  endDate: string;
  holdings: Holding[];
  portfolioReturn: number;
  benchmarkReturn: number;
}

/**
 * 持仓数据
 */
export interface Holding {
  ticker: string;
  sector: string;
  industry?: string;
  country?: string;
  currency?: string;
  portfolioWeight: number;
  benchmarkWeight: number;
  portfolioReturn: number;
  benchmarkReturn: number;
  marketValue: number;
}

/**
 * 货币归因
 */
export interface CurrencyAttribution {
  baseCurrency: string;
  currencyEffects: CurrencyEffect[];
  totalCurrencyEffect: number;
  localReturn: number;
  baseReturn: number;
}

/**
 * 货币效应
 */
export interface CurrencyEffect {
  currency: string;
  spotReturn: number;
  forwardPremium: number;
  currencyReturn: number;
  contribution: number;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * 计算主动收益
 */
export function calculateActiveReturnUtil(
  portfolioReturn: number,
  benchmarkReturn: number
): number {
  return portfolioReturn - benchmarkReturn;
}

/**
 * 计算信息比率
 */
export function calculateInformationRatioUtil(
  activeReturn: number,
  trackingError: number
): number {
  return trackingError !== 0 ? activeReturn / trackingError : 0;
}

/**
 * 计算跟踪误差
 */
export function calculateTrackingErrorUtil(activeReturns: number[]): number {
  if (activeReturns.length === 0) return 0;
  return ss.standardDeviation(activeReturns);
}

/**
 * 计算胜率
 */
export function calculateBattingAverageUtil(activeReturns: number[]): number {
  if (activeReturns.length === 0) return 0;
  const wins = activeReturns.filter((r) => r > 0).length;
  return wins / activeReturns.length;
}

/**
 * 链式连接收益
 */
export function chainLinkReturnsUtil(returns: number[]): number {
  if (returns.length === 0) return 0;
  return returns.reduce((acc, r) => acc * (1 + r), 1) - 1;
}

/**
 * 几何平均收益
 */
export function geometricMeanReturnUtil(returns: number[]): number {
  if (returns.length === 0) return 0;
  const product = returns.reduce((acc, r) => acc * (1 + r), 1);
  return Math.pow(product, 1 / returns.length) - 1;
}

/**
 * 验证Brinson归因完整性
 */
export function validateBrinsonAttribution(
  attribution: BrinsonAttribution
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // 检查基础收益
  if (attribution.period && Math.abs(attribution.portfolioReturn - attribution.period.portfolioReturn) > 1e-6) {
    errors.push('Portfolio return mismatch');
  }

  if (attribution.period && Math.abs(attribution.benchmarkReturn - attribution.period.benchmarkReturn) > 1e-6) {
    errors.push('Benchmark return mismatch');
  }

  // 检查Brinson三效应总和
  const totalEffect = attribution.allocationEffect + 
                      attribution.selectionEffect + 
                      attribution.interactionEffect;
  
  if (Math.abs(totalEffect - attribution.activeReturn) > 1e-6) {
    errors.push(`Brinson effects sum (${totalEffect}) != active return (${attribution.activeReturn})`);
  }

  // 检查板块归因
  const sectorTotalEffect = attribution.sectorAttribution.reduce(
    (sum, s) => sum + s.totalEffect, 0
  );
  
  if (Math.abs(sectorTotalEffect - attribution.activeReturn) > 1e-6) {
    errors.push(`Sector attribution sum (${sectorTotalEffect}) != active return (${attribution.activeReturn})`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// Factor Attribution
// ============================================================================

/**
 * 行业因子归因
 */
export interface IndustryFactorAttribution {
  industry: string;
  exposure: number;
  return: number;
  contribution: number;
  benchmarkExposure: number;
  activeExposure: number;
}

/**
 * 风格因子归因
 */
export interface StyleFactorAttribution {
  style: string;
  exposure: number;
  return: number;
  contribution: number;
  type: 'value' | 'growth' | 'quality' | 'momentum' | 'volatility' | 'liquidity';
}

/**
 * 宏观因子归因
 */
export interface MacroFactorAttribution {
  macroFactor: string;
  sensitivity: number;
  contribution: number;
  type: 'rates' | 'inflation' | 'fx' | 'credit' | 'commodity';
}

/**
 * 因子归因结果
 */
export interface FactorAttribution {
  totalReturn: number;
  factorReturn: number;
  specificReturn: number;
  alpha: number;
  industryFactors: IndustryFactorAttribution[];
  styleFactors: StyleFactorAttribution[];
  macroFactors: MacroFactorAttribution[];
  rSquared: number;
  factorExposure: Map<string, number>;
  factorContribution: Map<string, number>;
}

// ============================================================================
// Multi-Period Attribution
// ============================================================================

/**
 * 几何归因
 */
export interface GeometricAttribution {
  geometricAllocationEffect: number;
  geometricSelectionEffect: number;
  geometricInteractionEffect: number;
  totalGeometricEffect: number;
  explanation: string;
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
  icAllocation: number;
  icSelection: number;
  hitRate: number;
}

/**
 * 归因漂移分析
 */
export interface AttributionDriftAnalysis {
  allocationConsistency: number;
  selectionConsistency: number;
  styleDrift: StyleDriftMetrics;
  regimeChanges: RegimeChange[];
  persistenceAnalysis: PersistenceMetrics;
}

/**
 * 单期归因
 */
export interface SinglePeriodAttribution {
  period: string;
  brinsonAttribution: BrinsonAttribution;
}

/**
 * 多期归因结果
 */
export interface MultiPeriodAttribution {
  periods: SinglePeriodAttribution[];
  cumulativeReturn: number;
  geometricAttribution: GeometricAttribution;
  driftAnalysis: AttributionDriftAnalysis;
}

// ============================================================================
// Analysis Request and Response
// ============================================================================

/**
 * 归因分析请求
 */
export interface AttributionAnalysisRequest {
  portfolioId: string;
  startDate: string;
  endDate: string;
  benchmarkId: string;
  attributionType: 'brinson' | 'risk' | 'factor' | 'multi-period' | 'full';
  confidenceLevel?: number;
  sectorClassification?: Map<string, string>;
  factorModel?: 'BARRA' | 'AXIOMA' | 'CUSTOM';
}

/**
 * 归因分析响应
 */
export interface AttributionAnalysisResponse {
  requestId: string;
  portfolioId: string;
  analysisDate: string;
  brinsonAttribution?: BrinsonAttribution;
  riskAttribution?: RiskAttribution;
  factorAttribution?: FactorAttribution;
  multiPeriodAttribution?: MultiPeriodAttribution;
  insights: string[];
  recommendations: string[];
  confidence: number;
  processingTime: number;
}

// ============================================================================
// Export all types
// ============================================================================

export type AttributionType = 'brinson' | 'risk' | 'factor' | 'multi-period' | 'full';
export type FactorModelType = 'BARRA' | 'AXIOMA' | 'CUSTOM';
export type FactorType = 'industry' | 'style' | 'macro' | 'statistical';
export type StyleType = 'value' | 'growth' | 'quality' | 'momentum' | 'volatility' | 'liquidity';
export type MacroType = 'rates' | 'inflation' | 'fx' | 'credit' | 'commodity';
