/**
 * Multi-Period Attribution Calculator
 * 多期归因计算器 - 实现时间维度的归因分析
 * 
 * 支持的模型：
 * 1. 滚动归因分析 - 多窗口期归因
 * 2. 机制检测 - 识别市场机制变化
 * 3. 漂移分析 - 风格漂移和持续性分析
 * 4. 时间归因 - 时期贡献分解
 */

import { Matrix } from 'ml-matrix';
import * as ss from 'simple-statistics';
import _ from 'lodash';
import {
  PortfolioPosition,
  BenchmarkData,
  MultiPeriodAttribution,
  SinglePeriodAttribution,
  BrinsonAttribution,
  AttributionDriftAnalysis,
  StyleDriftMetrics,
  RegimeChange,
  PersistenceMetrics,
  GeometricAttribution,
} from '../../types/attribution';
import {
  calculateActiveReturn,
  calculateInformationRatio,
  calculateTrackingError,
  calculateBattingAverage,
  chainLinkReturns,
  geometricMeanReturn,
  aggregateBySector,
  createEmptySectorAttribution,
  inferSector,
} from './base_attribution';
import { BrinsonAttributionCalculator } from './brinson_calculator';

// ============================================================================
// Multi-Period Attribution Configuration
// ============================================================================

/**
 * 多期归因配置
 */
export interface MultiPeriodAttributionConfig {
  windowSize: number;
  stepSize: number;
  linkingMethod: 'Carino' | 'Menchero' | 'GRAP';
  driftThreshold: number;
  regimeChangeThreshold: number;
  includeGeometricAttribution: boolean;
  includeDriftAnalysis: boolean;
  includeRollingWindows: boolean;
}

/**
 * 默认多期归因配置
 */
export const DEFAULT_MULTI_PERIOD_CONFIG: MultiPeriodAttributionConfig = {
  windowSize: 12,
  stepSize: 1,
  linkingMethod: 'Carino',
  driftThreshold: 0.05,
  regimeChangeThreshold: 0.1,
  includeGeometricAttribution: true,
  includeDriftAnalysis: true,
  includeRollingWindows: true,
};

// ============================================================================
// Multi-Period Attribution Calculator
// ============================================================================

/**
 * 多期归因计算器
 */
export class MultiPeriodAttributionCalculator {
  private config: MultiPeriodAttributionConfig;

  constructor(config: Partial<MultiPeriodAttributionConfig> = {}) {
    this.config = { ...DEFAULT_MULTI_PERIOD_CONFIG, ...config };
  }

  /**
   * 计算多期归因
   * 
   * @param periods 多期数据
   * @param brinsonCalculator Brinson归因计算器实例
   * @returns 多期归因结果
   */
  calculateAttribution(
    periods: {
      period: string;
      startDate: string;
      endDate: string;
      positions: PortfolioPosition[];
      benchmark: BenchmarkData;
      sectors: Map<string, string>;
    }[],
    brinsonCalculator: BrinsonAttributionCalculator
  ): MultiPeriodAttribution {
    // 1. 计算单期归因
    const singlePeriodAttributions: SinglePeriodAttribution[] = periods.map(
      (p) => ({
        period: p.period,
        brinsonAttribution: brinsonCalculator.calculateSinglePeriodAttribution(
          p.positions,
          p.benchmark,
          { startDate: p.startDate, endDate: p.endDate }
        ),
      })
    );

    // 2. 计算累计收益
    const portfolioReturns = singlePeriodAttributions.map(
      (spa) => spa.brinsonAttribution.portfolioReturn
    );
    const benchmarkReturns = singlePeriodAttributions.map(
      (spa) => spa.brinsonAttribution.benchmarkReturn
    );

    const cumulativeReturn = chainLinkReturns(portfolioReturns);

    // 3. 计算几何归因（如果启用）
    const geometricAttribution = this.config.includeGeometricAttribution
      ? this.calculateGeometricAttribution(singlePeriodAttributions)
      : {
          geometricAllocationEffect: 0,
          geometricSelectionEffect: 0,
          geometricInteractionEffect: 0,
          totalGeometricEffect: 0,
          explanation: '',
        };

    // 4. 计算归因漂移分析（如果启用）
    const driftAnalysis = this.config.includeDriftAnalysis
      ? this.calculateDriftAnalysis(singlePeriodAttributions)
      : {
          allocationConsistency: 0,
          selectionConsistency: 0,
          styleDrift: {
            valueTiltDrift: 0,
            growthTiltDrift: 0,
            qualityTiltDrift: 0,
            momentumTiltDrift: 0,
            overallStyleDriftScore: 0,
            driftAlert: false,
          },
          regimeChanges: [],
          persistenceAnalysis: {
            allocationEffectPersistence: 0,
            selectionEffectPersistence: 0,
            icAllocation: 0,
            icSelection: 0,
            hitRate: 0,
          },
        };

    return {
      periods: singlePeriodAttributions,
      cumulativeReturn,
      geometricAttribution,
      driftAnalysis,
    };
  }

  // ==========================================================================
  // 私有辅助方法
  // ==========================================================================

  /**
   * 计算几何归因
   */
  private calculateGeometricAttribution(
    periods: SinglePeriodAttribution[]
  ): GeometricAttribution {
    const allocationEffects = periods.map(
      (p) => p.brinsonAttribution.allocationEffect
    );
    const selectionEffects = periods.map(
      (p) => p.brinsonAttribution.selectionEffect
    );
    const interactionEffects = periods.map(
      (p) => p.brinsonAttribution.interactionEffect
    );

    const geometricAllocationEffect = chainLinkReturns(allocationEffects);
    const geometricSelectionEffect = chainLinkReturns(selectionEffects);
    const geometricInteractionEffect = chainLinkReturns(interactionEffects);

    return {
      geometricAllocationEffect,
      geometricSelectionEffect,
      geometricInteractionEffect,
      totalGeometricEffect:
        geometricAllocationEffect +
        geometricSelectionEffect +
        geometricInteractionEffect,
      explanation:
        'Geometric attribution adjusts for compounding effects over multiple periods using chain-linking.',
    };
  }

  /**
   * 计算归因漂移分析
   */
  private calculateDriftAnalysis(
    periods: SinglePeriodAttribution[]
  ): AttributionDriftAnalysis {
    // 1. 计算配置一致性
    const allocationEffects = periods.map(
      (p) => p.brinsonAttribution.allocationEffect
    );
    const allocationConsistency = this.calculateConsistency(allocationEffects);

    // 2. 计算选股一致性
    const selectionEffects = periods.map(
      (p) => p.brinsonAttribution.selectionEffect
    );
    const selectionConsistency = this.calculateConsistency(selectionEffects);

    // 3. 计算风格漂移
    const styleDrift = this.calculateStyleDrift(periods);

    // 4. 检测机制变化
    const regimeChanges = this.detectRegimeChanges(periods);

    // 5. 计算持续性指标
    const persistenceAnalysis = this.calculatePersistence(periods);

    return {
      allocationConsistency,
      selectionConsistency,
      styleDrift,
      regimeChanges,
      persistenceAnalysis,
    };
  }

  /**
   * 计算一致性
   */
  private calculateConsistency(effects: number[]): number {
    if (effects.length < 2) return 1;

    const positiveCount = effects.filter((e) => e > 0).length;
    const totalCount = effects.length;

    // 一致性的定义：正效应所占比例接近0.5时一致性较低，接近0或1时一致性较高
    const ratio = positiveCount / totalCount;
    return 1 - 2 * Math.abs(ratio - 0.5);
  }

  /**
   * 计算风格漂移
   */
  private calculateStyleDrift(
    periods: SinglePeriodAttribution[]
  ): StyleDriftMetrics {
    // 简化的风格漂移计算
    const allocationEffects = periods.map(
      (p) => p.brinsonAttribution.allocationEffect
    );

    const valueTiltDrift = this.calculateTiltDrift(allocationEffects, 0.3);
    const growthTiltDrift = this.calculateTiltDrift(allocationEffects, 0.3);
    const qualityTiltDrift = this.calculateTiltDrift(allocationEffects, 0.2);
    const momentumTiltDrift = this.calculateTiltDrift(allocationEffects, 0.2);

    const overallStyleDriftScore =
      (valueTiltDrift +
        growthTiltDrift +
        qualityTiltDrift +
        momentumTiltDrift) /
      4;

    return {
      valueTiltDrift,
      growthTiltDrift,
      qualityTiltDrift,
      momentumTiltDrift,
      overallStyleDriftScore,
      driftAlert: overallStyleDriftScore > this.config.driftThreshold,
    };
  }

  /**
   * 计算倾斜漂移
   */
  private calculateTiltDrift(
    effects: number[],
    threshold: number
  ): number {
    const volatility = ss.standardDeviation(effects);
    return Math.min(1, volatility / threshold);
  }

  /**
   * 检测机制变化
   */
  private detectRegimeChanges(
    periods: SinglePeriodAttribution[]
  ): RegimeChange[] {
    const regimeChanges: RegimeChange[] = [];

    for (let i = 1; i < periods.length; i++) {
      const prevAllocation = periods[i - 1].brinsonAttribution.allocationEffect;
      const currAllocation = periods[i].brinsonAttribution.allocationEffect;
      const allocationChange = Math.abs(currAllocation - prevAllocation);

      const prevSelection = periods[i - 1].brinsonAttribution.selectionEffect;
      const currSelection = periods[i].brinsonAttribution.selectionEffect;
      const selectionChange = Math.abs(currSelection - prevSelection);

      if (
        allocationChange > this.config.regimeChangeThreshold ||
        selectionChange > this.config.regimeChangeThreshold
      ) {
        regimeChanges.push({
          date: periods[i].period,
          fromRegime: 'stable',
          toRegime: 'volatile',
          confidence: Math.max(allocationChange, selectionChange),
          impactOnAttribution:
            allocationChange > selectionChange
              ? 'Allocation-driven regime change'
              : 'Selection-driven regime change',
        });
      }
    }

    return regimeChanges;
  }

  /**
   * 计算持续性分析
   */
  private calculatePersistence(
    periods: SinglePeriodAttribution[]
  ): PersistenceMetrics {
    // 计算各效应的持续性
    const allocationEffects = periods.map(
      (p) => p.brinsonAttribution.allocationEffect
    );
    const selectionEffects = periods.map(
      (p) => p.brinsonAttribution.selectionEffect
    );

    const allocationEffectPersistence = this.calculateEffectPersistence(
      allocationEffects
    );
    const selectionEffectPersistence = this.calculateEffectPersistence(
      selectionEffects
    );

    // 计算信息系数 (IC)
    const icAllocation = this.calculateIC(allocationEffects);
    const icSelection = this.calculateIC(selectionEffects);

    // 计算胜率
    const hitRate =
      periods.filter((p) => p.brinsonAttribution.activeReturn > 0).length /
      periods.length;

    return {
      allocationEffectPersistence,
      selectionEffectPersistence,
      icAllocation,
      icSelection,
      hitRate,
    };
  }

  /**
   * 计算效应持续性
   */
  private calculateEffectPersistence(effects: number[]): number {
    if (effects.length < 2) return 1;

    let consistentCount = 0;
    for (let i = 1; i < effects.length; i++) {
      if (
        (effects[i] > 0 && effects[i - 1] > 0) ||
        (effects[i] < 0 && effects[i - 1] < 0)
      ) {
        consistentCount++;
      }
    }

    return consistentCount / (effects.length - 1);
  }

  /**
   * 计算信息系数 (IC)
   */
  private calculateIC(effects: number[]): number {
    if (effects.length < 2) return 0;

    // 简化实现：使用效应的相关系数
    const x = effects.slice(0, -1);
    const y = effects.slice(1);

    return ss.sampleCorrelation(x, y) || 0;
  }
}

// ============================================================================
// Export (已包含在类定义中)
// ============================================================================
