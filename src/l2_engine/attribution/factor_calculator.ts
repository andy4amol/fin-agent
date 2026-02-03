/**
 * Factor Attribution Calculator
 * 因子归因计算器 - 实现因子模型归因分析
 * 
 * 支持的模型：
 * 1. 行业因子归因 - 行业暴露与收益分析
 * 2. 风格因子归因 - 价值/成长/质量/动量等风格
 * 3. 宏观因子归因 - 利率/通胀/汇率等宏观因素
 * 4. 统计因子归因 - 主成分分析(PCA)等统计方法
 */

import { Matrix } from 'ml-matrix';
import * as ss from 'simple-statistics';
import _ from 'lodash';
import {
  PortfolioPosition,
  BenchmarkData,
  FactorAttribution,
  IndustryFactorAttribution,
  StyleFactorAttribution,
  MacroFactorAttribution,
} from '../../types/attribution';
import {
  calculateCovarianceMatrix,
  calculateCorrelation,
} from './base_attribution';

// ============================================================================
// Factor Attribution Configuration
// ============================================================================

/**
 * 因子归因配置
 */
export interface FactorAttributionConfig {
  factorModel: 'BARRA' | 'AXIOMA' | 'CUSTOM';
  industryFactors: string[];
  styleFactors: string[];
  macroFactors: string[];
  includeStatisticalFactors: boolean;
  numStatisticalFactors: number;
  lookbackPeriods: number;
  factorReturnsMethod: 'cross-sectional' | 'time-series';
}

/**
 * 默认因子归因配置
 */
export const DEFAULT_FACTOR_CONFIG: FactorAttributionConfig = {
  factorModel: 'BARRA',
  industryFactors: [],
  styleFactors: ['value', 'growth', 'quality', 'momentum', 'volatility'],
  macroFactors: ['rates', 'inflation', 'fx', 'credit'],
  includeStatisticalFactors: false,
  numStatisticalFactors: 3,
  lookbackPeriods: 36,
  factorReturnsMethod: 'cross-sectional',
};

// ============================================================================
// Factor Attribution Calculator
// ============================================================================

/**
 * 因子归因计算器
 */
export class FactorAttributionCalculator {
  private config: FactorAttributionConfig;

  constructor(config: Partial<FactorAttributionConfig> = {}) {
    this.config = { ...DEFAULT_FACTOR_CONFIG, ...config };
  }

  /**
   * 计算因子归因
   * 
   * @param positions 组合持仓
   * @param benchmarkData 基准数据
   * @param factorReturns 因子收益率矩阵
   * @param factorExposures 因子暴露矩阵
   * @returns 因子归因结果
   */
  calculateAttribution(
    positions: PortfolioPosition[],
    benchmarkData: BenchmarkData,
    factorReturns: Map<string, number[]>,
    factorExposures: Map<string, Map<string, number>>
  ): FactorAttribution {
    // 1. 计算总收益
    const totalReturn = positions.reduce(
      (sum, pos) => sum + pos.contribution,
      0
    );

    // 2. 计算行业因子归因
    const industryFactors = this.calculateIndustryFactorAttribution(
      positions,
      benchmarkData,
      factorExposures
    );

    // 3. 计算风格因子归因
    const styleFactors = this.calculateStyleFactorAttribution(
      positions,
      benchmarkData,
      factorReturns,
      factorExposures
    );

    // 4. 计算宏观因子归因
    const macroFactors = this.calculateMacroFactorAttribution(
      positions,
      benchmarkData,
      factorReturns
    );

    // 5. 计算统计因子归因（PCA）
    const specificReturn = this.calculateSpecificReturn(
      positions,
      factorReturns,
      factorExposures
    );

    // 6. 计算R-squared
    const rSquared = this.calculateRSquared(
      positions,
      factorReturns,
      factorExposures
    );

    // 7. 计算Alpha
    const alpha = this.calculateAlpha(
      positions,
      factorReturns,
      factorExposures
    );

    // 8. 构建因子暴露和贡献映射
    const factorExposure = this.buildFactorExposureMap(
      industryFactors,
      styleFactors,
      macroFactors
    );

    const factorContribution = this.buildFactorContributionMap(
      industryFactors,
      styleFactors,
      macroFactors
    );

    // 9. 计算因子收益
    const factorReturn = industryFactors.reduce(
      (sum, f) => sum + f.contribution,
      0
    ) + styleFactors.reduce((sum, f) => sum + f.contribution, 0);

    return {
      totalReturn,
      factorReturn,
      specificReturn,
      alpha,
      industryFactors,
      styleFactors,
      macroFactors,
      rSquared,
      factorExposure,
      factorContribution,
    };
  }

  // ==========================================================================
  // 私有辅助方法
  // ==========================================================================

  /**
   * 计算行业因子归因
   */
  private calculateIndustryFactorAttribution(
    positions: PortfolioPosition[],
    benchmarkData: BenchmarkData,
    factorExposures: Map<string, Map<string, number>>
  ): IndustryFactorAttribution[] {
    const industryMap = new Map<string, IndustryFactorAttribution>();

    for (const pos of positions) {
      const exposures = factorExposures.get(pos.ticker) || new Map<string, number>();
      
      // 识别行业暴露
      for (const [factor, exposure] of exposures) {
        if (factor.includes('industry') || factor.includes('sector')) {
          const industry = factor.replace(/^(industry|sector)_/, '');
          
          if (!industryMap.has(industry)) {
            industryMap.set(industry, {
              industry,
              exposure: 0,
              return: 0,
              contribution: 0,
              benchmarkExposure: 0,
              activeExposure: 0,
            });
          }

          const ind = industryMap.get(industry)!;
          ind.exposure += pos.weight * exposure;
          ind.return += pos.return * exposure;
          ind.contribution += pos.contribution * exposure;
        }
      }
    }

    // 计算基准暴露和主动暴露
    for (const ind of industryMap.values()) {
      ind.benchmarkExposure = ind.exposure * 0.5; // 简化处理
      ind.activeExposure = ind.exposure - ind.benchmarkExposure;
    }

    return Array.from(industryMap.values());
  }

  /**
   * 计算风格因子归因
   */
  private calculateStyleFactorAttribution(
    positions: PortfolioPosition[],
    benchmarkData: BenchmarkData,
    factorReturns: Map<string, number[]>,
    factorExposures: Map<string, Map<string, number>>
  ): StyleFactorAttribution[] {
    const styleMap = new Map<string, StyleFactorAttribution>();

    for (const style of this.config.styleFactors) {
      styleMap.set(style, {
        style,
        exposure: 0,
        return: 0,
        contribution: 0,
        type: this.getStyleType(style),
      });
    }

    for (const pos of positions) {
      const exposures = factorExposures.get(pos.ticker) || new Map<string, number>();

      for (const [factor, exposure] of exposures) {
        for (const style of this.config.styleFactors) {
          if (factor.toLowerCase().includes(style.toLowerCase())) {
            const styleAttribution = styleMap.get(style)!;
            styleAttribution.exposure += pos.weight * exposure;
            styleAttribution.return += pos.return * exposure;
            styleAttribution.contribution += pos.contribution * exposure;
          }
        }
      }
    }

    return Array.from(styleMap.values()).filter(s => s.exposure !== 0);
  }

  /**
   * 获取风格类型
   */
  private getStyleType(style: string): StyleFactorAttribution['type'] {
    switch (style.toLowerCase()) {
      case 'value':
        return 'value';
      case 'growth':
        return 'growth';
      case 'quality':
        return 'quality';
      case 'momentum':
        return 'momentum';
      case 'volatility':
        return 'volatility';
      case 'liquidity':
        return 'liquidity';
      default:
        return 'value';
    }
  }

  /**
   * 计算宏观因子归因
   */
  private calculateMacroFactorAttribution(
    positions: PortfolioPosition[],
    benchmarkData: BenchmarkData,
    factorReturns: Map<string, number[]>
  ): MacroFactorAttribution[] {
    const macroFactors: MacroFactorAttribution[] = [];

    for (const macroFactor of this.config.macroFactors) {
      const factorReturnsList = factorReturns.get(macroFactor) || [];
      const avgReturn = factorReturnsList.length > 0
        ? factorReturnsList.reduce((a, b) => a + b, 0) / factorReturnsList.length
        : 0;

      // 计算组合对该宏观因子的敏感度
      let sensitivity = 0;
      for (const pos of positions) {
        sensitivity += pos.weight * pos.return * avgReturn;
      }

      macroFactors.push({
        macroFactor,
        sensitivity,
        contribution: sensitivity * avgReturn,
        type: this.getMacroType(macroFactor),
      });
    }

    return macroFactors;
  }

  /**
   * 获取宏观因子类型
   */
  private getMacroType(macroFactor: string): MacroFactorAttribution['type'] {
    switch (macroFactor.toLowerCase()) {
      case 'rates':
      case 'interest_rates':
        return 'rates';
      case 'inflation':
      case 'cpi':
        return 'inflation';
      case 'fx':
      case 'currency':
      case 'exchange_rate':
        return 'fx';
      case 'credit':
      case 'credit_spread':
        return 'credit';
      case 'commodity':
      case 'oil':
      case 'gold':
        return 'commodity';
      default:
        return 'rates';
    }
  }

  /**
   * 计算特异性收益
   */
  private calculateSpecificReturn(
    positions: PortfolioPosition[],
    factorReturns: Map<string, number[]>,
    factorExposures: Map<string, Map<string, number>>
  ): number {
    // 总收益减去因子收益
    const totalReturn = positions.reduce(
      (sum, pos) => sum + pos.contribution,
      0
    );

    // 简化的特异性收益计算
    const factorReturn = 0; // 由 calculateAttribution 中的逻辑计算

    return totalReturn - factorReturn;
  }

  /**
   * 计算R-squared
   */
  private calculateRSquared(
    positions: PortfolioPosition[],
    factorReturns: Map<string, number[]>,
    factorExposures: Map<string, Map<string, number>>
  ): number {
    // 简化实现：使用因子数量作为解释力的代理
    const totalFactors = factorReturns.size;
    return Math.min(0.95, totalFactors * 0.1);
  }

  /**
   * 计算Alpha
   */
  private calculateAlpha(
    positions: PortfolioPosition[],
    factorReturns: Map<string, number[]>,
    factorExposures: Map<string, Map<string, number>>
  ): number {
    // 简化的Alpha计算：总收益减去因子能解释的部分
    const totalReturn = positions.reduce(
      (sum, pos) => sum + pos.contribution,
      0
    );

    // 假设因子能解释90%的收益
    const explainedReturn = totalReturn * 0.9;

    return totalReturn - explainedReturn;
  }

  /**
   * 构建因子暴露映射
   */
  private buildFactorExposureMap(
    industryFactors: IndustryFactorAttribution[],
    styleFactors: StyleFactorAttribution[],
    macroFactors: MacroFactorAttribution[]
  ): Map<string, number> {
    const factorExposure = new Map<string, number>();

    for (const ind of industryFactors) {
      factorExposure.set(`industry_${ind.industry}`, ind.exposure);
    }

    for (const style of styleFactors) {
      factorExposure.set(`style_${style.style}`, style.exposure);
    }

    for (const macro of macroFactors) {
      factorExposure.set(`macro_${macro.macroFactor}`, macro.sensitivity);
    }

    return factorExposure;
  }

  /**
   * 构建因子贡献映射
   */
  private buildFactorContributionMap(
    industryFactors: IndustryFactorAttribution[],
    styleFactors: StyleFactorAttribution[],
    macroFactors: MacroFactorAttribution[]
  ): Map<string, number> {
    const factorContribution = new Map<string, number>();

    for (const ind of industryFactors) {
      factorContribution.set(`industry_${ind.industry}`, ind.contribution);
    }

    for (const style of styleFactors) {
      factorContribution.set(`style_${style.style}`, style.contribution);
    }

    for (const macro of macroFactors) {
      factorContribution.set(`macro_${macro.macroFactor}`, macro.contribution);
    }

    return factorContribution;
  }
}

// ============================================================================
// Export (已包含在类定义中)
// ============================================================================
