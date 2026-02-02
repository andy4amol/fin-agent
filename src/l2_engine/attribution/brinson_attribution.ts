/**
 * Brinson Attribution Engine
 * Brinson归因分析引擎 - 实现单期和多期Brinson归因模型
 * 
 * 支持的模型：
  * 1. 单期Brinson归因（Brinson-Hood-Beebower, 1986）
  * 2. 多期Brinson归因（链式连接法）
 * 3. 货币归因（多币种组合）
 * 4. 交互效应分解
 */

import { Matrix } from 'ml-matrix';
import * as ss from 'simple-statistics';
import _ from 'lodash';

// ============================================================================
// Core Data Types
// ============================================================================

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
  subSectorAttribution?: SectorAttribution[];
}

/**
 * 单期Brinson归因结果
 */
export interface BrinsonAttribution {
  period: AttributionPeriod;
  
  // 基础收益
  portfolioReturn: number;
  benchmarkReturn: number;
  activeReturn: number;
  
  // Brinson三效应
  allocationEffect: number;
  selectionEffect: number;
  interactionEffect: number;
  
  // 详细分解
  sectorAttribution: SectorAttribution[];
  currencyAttribution?: CurrencyAttribution;
  
  // 统计指标
  informationRatio: number;
  trackingError: number;
  battingAverage: number;
  upsideCapture: number;
  downsideCapture: number;
  
  // 风险调整收益
  sharpeRatio: number;
  sortinoRatio: number;
  treynorRatio: number;
  jensenAlpha: number;
  
  // 归因质量指标
  attributionQuality: AttributionQuality;
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
 * 多期Brinson归因结果
 */
export interface MultiPeriodBrinsonAttribution {
  periods: BrinsonAttribution[];
  cumulativeReturn: number;
  cumulativeBenchmarkReturn: number;
  cumulativeActiveReturn: number;
  
  // 链式连接归因
  linkedAttribution: LinkedAttribution;
  
  // 几何归因
  geometricAttribution: GeometricAttribution;
  
  // 归因漂移分析
  driftAnalysis: AttributionDriftAnalysis;
  
  // 汇总统计
  summaryStatistics: MultiPeriodSummaryStatistics;
}

/**
 * 链式连接归因
 */
export interface LinkedAttribution {
  method: 'Carino' | 'Menchero' | 'GRAP' | 'Cariño-Menchero';
  linkedAllocationEffect: number;
  linkedSelectionEffect: number;
  linkedInteractionEffect: number;
  smoothingAdjustment: number;
  residual: number;
}

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
 * 归因漂移分析
 */
export interface AttributionDriftAnalysis {
  allocationConsistency: number;
  selectionConsistency: number;
  interactionConsistency: number;
  styleDrift: StyleDriftMetrics;
  regimeChanges: RegimeChange[];
  persistenceAnalysis: PersistenceMetrics;
  rollingWindows: RollingAttributionWindow[];
}

/**
 * 风格漂移指标
 */
export interface StyleDriftMetrics {
  valueTiltDrift: number;
  growthTiltDrift: number;
  qualityTiltDrift: number;
  momentumTiltDrift: number;
  sizeTiltDrift: number;
  volatilityTiltDrift: number;
  overallStyleDriftScore: number;
  driftAlert: boolean;
  driftAlertThreshold: number;
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
  allocationChange: number;
  selectionChange: number;
}

/**
 * 持续性指标
 */
export interface PersistenceMetrics {
  allocationEffectPersistence: number;
  selectionEffectPersistence: number;
  interactionEffectPersistence: number;
  icAllocation: number;
  icSelection: number;
  icInteraction: number;
  hitRate: number;
  winLossRatio: number;
  payoffRatio: number;
}

/**
 * 滚动归因窗口
 */
export interface RollingAttributionWindow {
  windowStart: string;
  windowEnd: string;
  windowSize: number;
  attribution: BrinsonAttribution;
  trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  significance: number;
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
}

// ============================================================================
// Calculation Configuration
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
// Utility Functions
// ============================================================================

/**
 * 计算主动收益
 */
export function calculateActiveReturn(
  portfolioReturn: number,
  benchmarkReturn: number
): number {
  return portfolioReturn - benchmarkReturn;
}

/**
 * 计算信息比率
 */
export function calculateInformationRatio(
  activeReturn: number,
  trackingError: number
): number {
  return trackingError !== 0 ? activeReturn / trackingError : 0;
}

/**
 * 计算跟踪误差
 */
export function calculateTrackingError(activeReturns: number[]): number {
  if (activeReturns.length === 0) return 0;
  return ss.standardDeviation(activeReturns);
}

/**
 * 计算胜率
 */
export function calculateBattingAverage(activeReturns: number[]): number {
  if (activeReturns.length === 0) return 0;
  const wins = activeReturns.filter((r) => r > 0).length;
  return wins / activeReturns.length;
}

/**
 * 链式连接收益
 */
export function chainLinkReturns(returns: number[]): number {
  if (returns.length === 0) return 0;
  return returns.reduce((acc, r) => acc * (1 + r), 1) - 1;
}

/**
 * 几何平均收益
 */
export function geometricMeanReturn(returns: number[]): number {
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
  if (Math.abs(attribution.portfolioReturn - attribution.period.portfolioReturn) > 1e-6) {
    errors.push('Portfolio return mismatch');
  }

  if (Math.abs(attribution.benchmarkReturn - attribution.period.benchmarkReturn) > 1e-6) {
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
// Export all types and functions
// ============================================================================

export * from './brinson_attribution';
