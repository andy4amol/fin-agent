/**
 * Attribution Engine Module
 * 归因引擎模块 - 导出所有归因相关的类和函数
 */

// Export all types
export * from '../../types/attribution';

// Export Brinson Attribution Calculator
export { BrinsonAttributionCalculator } from './brinson_calculator';

// Export Risk Attribution Calculator (when implemented)
// export { RiskAttributionCalculator } from './risk_calculator';

// Export Factor Attribution Calculator (when implemented)
// export { FactorAttributionCalculator } from './factor_calculator';

// Export Multi-Period Attribution Calculator (when implemented)
// export { MultiPeriodAttributionCalculator } from './multi_period_calculator';

// Default export
export { BrinsonAttributionCalculator as default } from './brinson_calculator';
