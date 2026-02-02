/**
 * Attribution Types - Complete Type Definitions for Attribution Analysis
 * 归因分析完整类型定义
 */

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
  linkedAllocationEffect: number;
  linkedSelectionEffect: number;
  linkedInteractionEffect: number;
  smoothingAdjustment: number;
  geometricExplanation: string;
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
