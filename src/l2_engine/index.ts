/**
 * L2 Engine - Attribution & Analytics
 * L2引擎 - 归因与分析模块
 * 
 * 本模块提供完整的持仓归因分析功能，包括：
 * 1. Brinson归因分析（单期/多期）
 * 2. 风险归因（Euler分配/VaR/CVaR）
 * 3. 因子归因（行业/风格/宏观）
 * 4. 时间序列归因（滚动/机制检测）
 * 
 * @module L2Engine
 * @version 2.0.0
 */

// ============================================================================
// 基础分析模块
// ============================================================================

export { PnLAnalyzer } from './pnl_analyzer';
export { RiskModel } from './risk_model';
export { BehaviorAnalyzer } from './behavior_analyzer';

// ============================================================================
// 归因分析核心模块
// ============================================================================

/**
 * 归因引擎主模块
 * 提供统一的归因分析接口
 */
export { 
  AttributionEngine,
  AttributionResult,
  AttributionOptions,
  AttributionType
} from './attribution_engine';

// ============================================================================
// Brinson归因分析
// ============================================================================

/**
 * Brinson归因计算器
 * 实现单期和多期Brinson归因模型
 * 
 * 支持的模型：
 * - Brinson-Hood-Beebower (BHB) 单期归因
 * - Brinson-Fachler (BF) 多期归因
 * - 链式连接方法（Carino, Menchero, GRAP）
 * 
 * @example
 * ```typescript
 * const calculator = new BrinsonAttributionCalculator();
 * const result = calculator.calculateSinglePeriodAttribution(
 *   portfolioPositions,
 *   benchmarkData,
 *   { startDate: '2024-01-01', endDate: '2024-03-31' }
 * );
 * ```
 */
export { BrinsonAttributionCalculator } from './attribution/brinson_calculator';

/**
 * Brinson归因类型定义
 */
export type {
  PortfolioPosition,
  BenchmarkData,
  SectorAttribution,
  BrinsonAttribution,
  BrinsonCalculationConfig,
  MultiPeriodBrinsonAttribution,
  SinglePeriodAttribution,
  LinkedAttribution,
  GeometricAttribution,
  calculateActiveReturn,
  calculateInformationRatio,
  calculateTrackingError,
  calculateBattingAverage,
  chainLinkReturns,
  geometricMeanReturn,
} from './attribution/brinson_attribution';

// ============================================================================
// 风险归因分析
// ============================================================================

/**
 * 风险归因计算器
 * 基于Euler定理实现风险贡献分解
 * 
 * 支持的风险指标：
 * - 波动率归因（边际贡献）
 * - VaR归因（参数法/历史模拟法/蒙特卡洛）
 * - CVaR归因（条件风险价值）
 * - 尾部风险归因（压力测试）
 * 
 * @example
 * ```typescript
 * const calculator = new RiskAttributionCalculator();
 * const result = calculator.calculateAttribution(
 *   positions,
 *   returns,
 *   0.95 // 置信水平
 * );
 * ```
 */
// export { RiskAttributionCalculator } from './attribution/risk_calculator';

/**
 * 风险归因类型定义
 */
export type {
  PositionRiskContribution,
  FactorRiskAttribution,
  TailRiskAttribution,
  RiskAttributionResult,
} from './attribution/risk_attribution';

// ============================================================================
// 归因分析工具函数
// ============================================================================

/**
 * 归因分析工具函数
 */
export {
  // Brinson归因验证
  validateBrinsonAttribution,
  
  // 收益计算
  calculateActiveReturn,
  calculateInformationRatio,
  calculateTrackingError,
  calculateBattingAverage,
  
  // 多期归因
  chainLinkReturns,
  geometricMeanReturn,
} from './attribution/brinson_attribution';

// ============================================================================
// 默认导出
// ============================================================================

/**
 * 默认导出：Brinson归因计算器
 */
export { BrinsonAttributionCalculator as default } from './attribution/brinson_calculator';

// ============================================================================
// 模块说明
// ============================================================================

/**
 * ## 使用示例
 * 
 * ### 基本Brinson归因分析
 * ```typescript
 * import { BrinsonAttributionCalculator } from 'fin-agent/l2_engine';
 * 
 * const calculator = new BrinsonAttributionCalculator();
 * 
 * const result = calculator.calculateSinglePeriodAttribution(
 *   portfolioPositions,    // 组合持仓
 *   benchmarkData,       // 基准数据
 *   {                    // 期间信息
 *     startDate: '2024-01-01',
 *     endDate: '2024-03-31'
 *   }
 * );
 * 
 * console.log('主动收益:', result.activeReturn);
 * console.log('配置效应:', result.allocationEffect);
 * console.log('选股效应:', result.selectionEffect);
 * console.log('交互效应:', result.interactionEffect);
 * ```
 * 
 * ### 多期Brinson归因分析
 * ```typescript
 * const periods = [
 *   { period: '2024-Q1', positions: q1Positions, benchmark: q1Benchmark },
 *   { period: '2024-Q2', positions: q2Positions, benchmark: q2Benchmark },
 *   { period: '2024-Q3', positions: q3Positions, benchmark: q3Benchmark },
 * ];
 * 
 * const multiPeriodResult = calculator.calculateMultiPeriodAttribution(periods);
 * 
 * console.log('累计收益:', multiPeriodResult.cumulativeReturn);
 * console.log('链式配置效应:', multiPeriodResult.linkedAttribution.linkedAllocationEffect);
 * ```
 * 
 * ### 归因验证
 * ```typescript
 * import { validateBrinsonAttribution } from 'fin-agent/l2_engine';
 * 
 * const validation = validateBrinsonAttribution(attributionResult);
 * 
 * if (validation.isValid) {
 *   console.log('归因分析验证通过');
 * } else {
 *   console.error('归因分析存在问题:', validation.errors);
 * }
 * ```
 * 
 * ## 核心概念
 * 
 * ### Brinson归因模型
 * Brinson归因模型将投资组合的超额收益分解为三个部分：
 * 1. **配置效应 (Allocation Effect)**: 由于超配或低配某些板块而带来的收益
 * 2. **选股效应 (Selection Effect)**: 由于在板块内选择个股而带来的收益
 * 3. **交互效应 (Interaction Effect)**: 配置效应和选股效应的交互作用
 * 
 * ### 风险归因
 * 风险归因基于Euler定理，将组合的总风险分解为各个资产的风险贡献：
 * - **边际风险贡献**: 资产权重微小变化对组合风险的影响
 * - **成分风险贡献**: 资产的边际风险贡献乘以其权重
 * - **百分比风险贡献**: 成分风险贡献占组合总风险的比例
 * 
 * ### 因子归因
 * 因子归因将投资组合的收益和风险归因到不同的因子：
 * - **行业因子**: 行业暴露带来的收益/风险
 * - **风格因子**: 价值、成长、质量、动量等风格暴露
 * - **宏观因子**: 利率、通胀、汇率、信用等宏观变量
 * 
 * ## 性能考虑
 * 
 * 对于大规模投资组合（数千个持仓），建议使用以下优化策略：
 * 1. **矩阵运算优化**: 使用 `ml-matrix` 进行矩阵运算
 * 2. **缓存机制**: 缓存协方差矩阵和中间计算结果
 * 3. **并行计算**: 对于独立持仓的计算使用并行化
 * 4. **增量计算**: 只计算变化部分的归因
 * 
 * ## 参考文献
 * 
 * - Brinson, G.P., Hood, L.R., & Beebower, G.L. (1986). "Determinants of Portfolio Performance." Financial Analysts Journal.
 * - Brinson, G.P., & Fachler, N. (1985). "Measuring Non-US. Equity Portfolio Performance." Journal of Portfolio Management.
 * - Bacon, C. (2008). "Practical Portfolio Performance Measurement and Attribution." Wiley.
 * - Litterman, R. (1996). "Hot Spots and Hedges." Goldman Sachs Risk Management Series.
 * - Grinold, R.C., & Kahn, R.N. (2000). "Active Portfolio Management." McGraw-Hill.
 */
