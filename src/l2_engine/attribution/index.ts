/**
 * Attribution Engine Module
 * 归因引擎模块 - 导出所有归因相关的类和函数
 * 
 * 整合后的归因引擎架构：
 * 1. BaseAttribution - 基础归因框架和工具函数
 * 2. BrinsonAttributionCalculator - Brinson归因计算
 * 3. RiskAttributionCalculator - 风险归因计算
 * 4. FactorAttributionCalculator - 因子归因计算
 * 5. MultiPeriodAttributionCalculator - 多期归因计算
 */

// ============================================================================
// Base Attribution Framework
// ============================================================================

export {
  // 类型定义
  IAttributionCalculator,
  BaseAttributionCalculator,
  AttributionConfig,
  DEFAULT_ATTRIBUTION_CONFIG,
  // 统计工具函数
  calculateCovarianceMatrix,
  calculateCovariance,
  calculateCorrelation,
  calculateActiveReturn,
  calculateTrackingError,
  calculateInformationRatio,
  calculateBattingAverage,
  chainLinkReturns,
  geometricMeanReturn,
  // 数据处理工具
  inferSector,
  aggregateBySector,
  createEmptySectorAttribution,
} from './base_attribution';

// ============================================================================
// Brinson Attribution
// ============================================================================

export {
  BrinsonAttributionCalculator,
} from './brinson_calculator';

// ============================================================================
// Risk Attribution
// ============================================================================

export {
  RiskAttributionCalculator,
  RiskAttributionConfig,
  DEFAULT_RISK_CONFIG,
} from './risk_calculator';

// ============================================================================
// Factor Attribution
// ============================================================================

export {
  FactorAttributionCalculator,
  FactorAttributionConfig,
  DEFAULT_FACTOR_CONFIG,
} from './factor_calculator';

// ============================================================================
// Multi-Period Attribution
// ============================================================================

export {
  MultiPeriodAttributionCalculator,
  MultiPeriodAttributionConfig,
  DEFAULT_MULTI_PERIOD_CONFIG,
} from './multi_period_calculator';

// ============================================================================
// Re-export all types from types/attribution
// ============================================================================

export * from '../../types/attribution';

// ============================================================================
// Default Export
// ============================================================================

// 提供统一的归因引擎入口
export { BrinsonAttributionCalculator as AttributionEngine } from './brinson_calculator';
export { BrinsonAttributionCalculator as default } from './brinson_calculator';
