/**
 * Base Attribution Framework
 * 归因分析基础框架 - 提供统一的归因计算接口和共享工具
 * 
 * 设计理念：
 * 1. 定义统一的归因计算器接口
 * 2. 提供共享的数据处理工具
 * 3. 提供通用的统计计算函数
 * 4. 统一错误处理和验证机制
 */

import { Matrix } from 'ml-matrix';
import * as ss from 'simple-statistics';
import _ from 'lodash';
import {
  PortfolioPosition,
  BenchmarkData,
  SectorAttribution,
} from '../../types/attribution';

// ============================================================================
// 通用统计计算工具
// ============================================================================

/**
 * 计算协方差矩阵
 */
export function calculateCovarianceMatrix(
  returns: Map<string, number[]>
): Matrix {
  const tickers = Array.from(returns.keys());
  const n = tickers.length;
  const covMatrix = Matrix.zeros(n, n);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const returnsI = returns.get(tickers[i]) || [];
      const returnsJ = returns.get(tickers[j]) || [];
      covMatrix.set(i, j, calculateCovariance(returnsI, returnsJ));
    }
  }

  return covMatrix;
}

/**
 * 计算协方差
 */
export function calculateCovariance(x: number[], y: number[]): number {
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

/**
 * 计算相关系数
 */
export function calculateCorrelation(x: number[], y: number[]): number {
  const cov = calculateCovariance(x, y);
  const stdX = ss.standardDeviation(x);
  const stdY = ss.standardDeviation(y);
  return stdX * stdY !== 0 ? cov / (stdX * stdY) : 0;
}

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
 * 计算跟踪误差
 */
export function calculateTrackingError(activeReturns: number[]): number {
  if (activeReturns.length === 0) return 0;
  return ss.standardDeviation(activeReturns);
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

// ============================================================================
// 数据处理工具
// ============================================================================

/**
 * 从ticker推断板块（简化版）
 */
export function inferSector(ticker: string): string {
  // 简化的板块推断逻辑
  if (ticker.includes('0700') || ticker.includes('TECH')) {
    return 'Technology';
  } else if (ticker.includes('BABA') || ticker.includes('AMZN')) {
    return 'Consumer Discretionary';
  } else if (ticker.includes('AAPL') || ticker.includes('MSFT')) {
    return 'Technology';
  } else if (ticker.includes('JPM') || ticker.includes('BAC')) {
    return 'Financials';
  } else if (ticker.includes('JNJ') || ticker.includes('PFE')) {
    return 'Health Care';
  } else if (ticker.includes('XOM') || ticker.includes('CVX')) {
    return 'Energy';
  }
  return 'Unknown';
}

/**
 * 按板块聚合数据
 */
export function aggregateBySector(
  positions: PortfolioPosition[],
  benchmarkData: BenchmarkData,
  sectors: Map<string, string>
): SectorAttribution[] {
  const sectorMap = new Map<string, SectorAttribution>();

  // 处理组合持仓
  for (const pos of positions) {
    const sector = sectors.get(pos.ticker) || 'Unknown';

    if (!sectorMap.has(sector)) {
      sectorMap.set(sector, createEmptySectorAttribution(sector));
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
      sectorMap.set(sector, createEmptySectorAttribution(sector));
    }

    const sectorData = sectorMap.get(sector)!;
    sectorData.benchmarkWeight += weight;
    sectorData.benchmarkReturn += weight * return_;
  }

  return Array.from(sectorMap.values());
}

/**
 * 创建空的板块归因对象
 */
export function createEmptySectorAttribution(sector: string): SectorAttribution {
  return {
    sector,
    portfolioWeight: 0,
    benchmarkWeight: 0,
    portfolioReturn: 0,
    benchmarkReturn: 0,
    allocationEffect: 0,
    selectionEffect: 0,
    interactionEffect: 0,
    totalEffect: 0,
  };
}

// ============================================================================
// 抽象基类定义
// ============================================================================

/**
 * 归因计算器基类接口
 * 所有归因计算器都应该实现这个接口
 */
export interface IAttributionCalculator<
  TInput,
  TOutput,
  TConfig = unknown
> {
  /**
   * 计算归因结果
   */
  calculate(input: TInput, config?: TConfig): TOutput;

  /**
   * 验证输入数据
   */
  validate(input: TInput): { valid: boolean; errors: string[] };
}

/**
 * 抽象归因计算器基类
 * 提供通用的验证和错误处理机制
 */
export abstract class BaseAttributionCalculator<TInput, TOutput, TConfig = unknown>
  implements IAttributionCalculator<TInput, TOutput, TConfig>
{
  protected config: TConfig;

  constructor(config?: TConfig) {
    this.config = config || ({} as TConfig);
  }

  abstract calculate(input: TInput, config?: TConfig): TOutput;
  abstract validate(input: TInput): { valid: boolean; errors: string[] };

  /**
   * 通用错误处理
   */
  protected handleError(message: string): never {
    throw new Error(`AttributionError: ${message}`);
  }

  /**
   * 验证数值有效性
   */
  protected validateNumber(
    value: number,
    name: string,
    options: { min?: number; max?: number; allowNaN?: boolean } = {}
  ): string | null {
    const { min, max, allowNaN = false } = options;

    if (!allowNaN && (isNaN(value) || !isFinite(value))) {
      return `${name} must be a valid number, got ${value}`;
    }

    if (min !== undefined && value < min) {
      return `${name} must be >= ${min}, got ${value}`;
    }

    if (max !== undefined && value < max) {
      return `${name} must be <= ${max}, got ${value}`;
    }

    return null;
  }
}

// ============================================================================
// 配置类定义
// ============================================================================

/**
 * 归因计算配置
 */
export interface AttributionConfig {
  confidenceLevel: number;
  significanceThreshold: number;
  roundingPrecision: number;
  handleMissingData: 'ignore' | 'interpolate' | 'error';
  minimumPeriods: number;
}

/**
 * 默认归因配置
 */
export const DEFAULT_ATTRIBUTION_CONFIG: AttributionConfig = {
  confidenceLevel: 0.95,
  significanceThreshold: 0.05,
  roundingPrecision: 6,
  handleMissingData: 'ignore',
  minimumPeriods: 12,
};
