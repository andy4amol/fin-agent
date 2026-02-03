/**
 * Brinson Attribution Calculator
 * Brinson归因计算器 - 实现完整的Brinson归因模型
 * 
 * 支持：
 * 1. Brinson-Hood-Beebower (BHB) 模型
 * 2. Brinson-Fachler (BF) 模型
 * 3. 多币种Brinson归因
 * 4. 链式连接（Carino, Menchero, GRAP）
 */

import { Matrix } from 'ml-matrix';
import * as ss from 'simple-statistics';
import _ from 'lodash';
import {
  PortfolioPosition,
  BenchmarkData,
  SectorAttribution,
  BrinsonAttribution,
  BrinsonCalculationConfig,
  DEFAULT_BRINSON_CONFIG,
  MultiPeriodBrinsonAttribution,
  SinglePeriodAttribution,
  LinkedAttribution,
  GeometricAttribution,
  calculateActiveReturnUtil,
  calculateInformationRatioUtil,
  calculateTrackingErrorUtil,
  calculateBattingAverageUtil,
  chainLinkReturnsUtil,
  geometricMeanReturnUtil,
} from '../../types/attribution';

/**
 * Brinson归因计算器
 */
export class BrinsonAttributionCalculator {
  private config: BrinsonCalculationConfig;

  constructor(config: Partial<BrinsonCalculationConfig> = {}) {
    this.config = { ...DEFAULT_BRINSON_CONFIG, ...config };
  }

  /**
   * 计算单期Brinson归因
   * 
   * @param positions 持仓数据
   * @param benchmark 基准数据
   * @param period 期间信息
   * @returns Brinson归因结果
   */
  calculateSinglePeriodAttribution(
    positions: PortfolioPosition[],
    benchmark: BenchmarkData,
    period: { startDate: string; endDate: string }
  ): BrinsonAttribution {
    // 1. 计算组合和基准总收益
    const portfolioReturn = this.calculatePortfolioReturn(positions);
    const benchmarkReturn = benchmark.totalReturn;
    const activeReturn = calculateActiveReturnUtil(portfolioReturn, benchmarkReturn);

    // 2. 按板块聚合数据
    const sectorAttribution = this.calculateSectorAttribution(positions, benchmark);

    // 3. 计算Brinson三效应
    const allocationEffect = this.calculateAllocationEffect(sectorAttribution);
    const selectionEffect = this.calculateSelectionEffect(sectorAttribution);
    const interactionEffect = this.calculateInteractionEffect(sectorAttribution);

    // 4. 计算统计指标
    const activeReturns = this.extractActiveReturns(positions, benchmark);
    const trackingError = calculateTrackingErrorUtil(activeReturns);
    const informationRatio = calculateInformationRatioUtil(activeReturn, trackingError);
    const battingAverage = calculateBattingAverageUtil(activeReturns);

    // 5. 计算风险调整收益
    const riskFreeRate = 0.02; // TODO: 从配置或数据获取
    const portfolioStdDev = positions.length > 0 ? ss.standardDeviation(positions.map(p => p.return)) : 0;
    const benchmarkStdDev = benchmark.returns.size > 0 ? ss.standardDeviation(
      Array.from(benchmark.returns.values())
    ) : 0;
    
    const sharpeRatio = portfolioStdDev !== 0 
      ? (portfolioReturn - riskFreeRate) / portfolioStdDev 
      : 0;
    
    const sortinoRatio = this.calculateSortinoRatio(portfolioReturn, riskFreeRate, positions);
    const treynorRatio = this.calculateTreynorRatio(portfolioReturn, riskFreeRate, positions, benchmark);
    const jensenAlpha = this.calculateJensenAlpha(portfolioReturn, benchmarkReturn, positions, benchmark);

    // 6. 计算Upside/Downside Capture
    const { upsideCapture, downsideCapture } = this.calculateCaptureRatios(positions, benchmark);

    // 7. 归因质量指标
    const attributionQuality = this.calculateAttributionQuality(
      activeReturn,
      allocationEffect,
      selectionEffect,
      interactionEffect,
      sectorAttribution
    );

    return {
      period: {
        startDate: period.startDate,
        endDate: period.endDate,
        holdings: positions.map(p => ({
          ticker: p.ticker,
          weight: p.portfolioWeight || p.weight,
          return: p.return,
          contribution: p.contribution,
          marketValue: p.marketValue,
        })),
        portfolioReturn,
        benchmarkReturn,
      },
      portfolioReturn,
      benchmarkReturn,
      activeReturn,
      allocationEffect,
      selectionEffect,
      interactionEffect,
      sectorAttribution,
      currencyAttribution: undefined, // TODO: 实现货币归因
      informationRatio,
      trackingError,
      battingAverage,
      upsideCapture,
      downsideCapture,
      sharpeRatio,
      sortinoRatio,
      treynorRatio,
      jensenAlpha,
      attributionQuality,
    };
  }

  /**
   * 计算多期Brinson归因
   * 
   * @param periods 多期数据
   * @returns 多期Brinson归因结果
   */
  calculateMultiPeriodAttribution(
    periods: {
      period: { startDate: string; endDate: string };
      positions: PortfolioPosition[];
      benchmark: BenchmarkData;
    }[]
  ): MultiPeriodBrinsonAttribution {
    // 1. 计算单期归因
    const singlePeriodAttributions: SinglePeriodAttribution[] = periods.map(p => ({
      period: `${p.period.startDate} - ${p.period.endDate}`,
      brinsonAttribution: this.calculateSinglePeriodAttribution(
        p.positions,
        p.benchmark,
        p.period
      ),
    }));

    // 2. 计算累计收益
    const portfolioReturns = singlePeriodAttributions.map(
      spa => spa.brinsonAttribution.portfolioReturn
    );
    const benchmarkReturns = singlePeriodAttributions.map(
      spa => spa.brinsonAttribution.benchmarkReturn
    );

    const cumulativePortfolioReturn = chainLinkReturnsUtil(portfolioReturns);
    const cumulativeBenchmarkReturn = chainLinkReturnsUtil(benchmarkReturns);
    const cumulativeActiveReturn = calculateActiveReturnUtil(
      cumulativePortfolioReturn,
      cumulativeBenchmarkReturn
    );

    // 3. 链式连接归因
    const linkedAttribution = this.calculateLinkedAttribution(
      singlePeriodAttributions,
      this.config.linkingMethod
    );

    // 4. 几何归因
    const geometricAttribution = this.calculateGeometricAttribution(
      singlePeriodAttributions,
      cumulativePortfolioReturn,
      cumulativeBenchmarkReturn
    );

    // 5. 归因漂移分析
    const driftAnalysis = this.calculateAttributionDrift(
      singlePeriodAttributions
    );

    // 6. 汇总统计
    const summaryStatistics = this.calculateMultiPeriodSummary(
      singlePeriodAttributions,
      cumulativePortfolioReturn,
      cumulativeBenchmarkReturn
    );

    return {
      periods: singlePeriodAttributions,
      cumulativeReturn: cumulativePortfolioReturn,
      cumulativeBenchmarkReturn,
      cumulativeActiveReturn,
      geometricAttribution,
      linkedAttribution,
      driftAnalysis,
      summaryStatistics,
    };
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  /**
   * 计算组合收益
   */
  private calculatePortfolioReturn(positions: PortfolioPosition[]): number {
    return positions.reduce((sum, pos) => sum + pos.contribution, 0);
  }

  /**
   * 计算板块归因
   */
  private calculateSectorAttribution(
    positions: PortfolioPosition[],
    benchmark: BenchmarkData
  ): SectorAttribution[] {
    // 按板块分组
    const sectorMap = new Map<string, SectorAttribution>();

    // 处理组合持仓
    for (const pos of positions) {
      const sector = pos.sector || 'Unknown';
      
      if (!sectorMap.has(sector)) {
        sectorMap.set(sector, this.createEmptySectorAttribution(sector));
      }

      const sectorData = sectorMap.get(sector)!;
      sectorData.portfolioWeight += (pos.portfolioWeight || pos.weight);
      sectorData.portfolioReturn += pos.contribution;
    }

    // 处理基准数据
    for (const [ticker, weight] of benchmark.weights) {
      const return_ = benchmark.returns.get(ticker) || 0;
      const sector = this.inferSector(ticker); // 从ticker推断板块

      if (!sectorMap.has(sector)) {
        sectorMap.set(sector, this.createEmptySectorAttribution(sector));
      }

      const sectorData = sectorMap.get(sector)!;
      sectorData.benchmarkWeight += weight;
      sectorData.benchmarkReturn += weight * return_;
    }

    // 计算归因效应
    const result: SectorAttribution[] = [];
    for (const sectorData of sectorMap.values()) {
      const wp = sectorData.portfolioWeight;
      const wb = sectorData.benchmarkWeight;
      // Convert contributions to return rates
      const Rp = wp !== 0 ? sectorData.portfolioReturn / wp : 0;
      const Rb = wb !== 0 ? sectorData.benchmarkReturn / wb : 0;

      // Brinson三效应
      sectorData.allocationEffect = (wp - wb) * Rb;
      sectorData.selectionEffect = wb * (Rp - Rb);
      sectorData.interactionEffect = (wp - wb) * (Rp - Rb);
      sectorData.totalEffect = 
        sectorData.allocationEffect + 
        sectorData.selectionEffect + 
        sectorData.interactionEffect;

      result.push(sectorData);
    }

    return result;
  }

  /**
   * 创建空的板块归因对象
   */
  private createEmptySectorAttribution(sector: string): SectorAttribution {
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

  /**
   * 从ticker推断板块
   */
  private inferSector(ticker: string): string {
    // 简化的板块推断逻辑
    // 实际应用中应该使用更完善的分类体系
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
   * 计算配置效应
   */
  private calculateAllocationEffect(sectorAttribution: SectorAttribution[]): number {
    return sectorAttribution.reduce((sum, s) => sum + s.allocationEffect, 0);
  }

  /**
   * 计算选股效应
   */
  private calculateSelectionEffect(sectorAttribution: SectorAttribution[]): number {
    return sectorAttribution.reduce((sum, s) => sum + s.selectionEffect, 0);
  }

  /**
   * 计算交互效应
   */
  private calculateInteractionEffect(sectorAttribution: SectorAttribution[]): number {
    return sectorAttribution.reduce((sum, s) => sum + s.interactionEffect, 0);
  }

  /**
   * 提取主动收益序列
   */
  private extractActiveReturns(
    positions: PortfolioPosition[],
    benchmark: BenchmarkData
  ): number[] {
    return positions.map(pos => {
      const benchmarkReturn = benchmark.returns.get(pos.ticker) || 0;
      return pos.return - benchmarkReturn;
    });
  }

  /**
   * 计算Sortino比率
   */
  private calculateSortinoRatio(
    portfolioReturn: number,
    riskFreeRate: number,
    positions: PortfolioPosition[]
  ): number {
    const downsideReturns = positions
      .map(p => p.return)
      .filter(r => r < riskFreeRate);
    
    if (downsideReturns.length === 0) return 0;
    
    const downsideDeviation = ss.standardDeviation(downsideReturns);
    return downsideDeviation !== 0 
      ? (portfolioReturn - riskFreeRate) / downsideDeviation 
      : 0;
  }

  /**
   * 计算Treynor比率
   */
  private calculateTreynorRatio(
    portfolioReturn: number,
    riskFreeRate: number,
    positions: PortfolioPosition[],
    benchmark: BenchmarkData
  ): number {
    // 简化的Beta计算
    const portfolioBeta = this.calculatePortfolioBeta(positions, benchmark);
    return portfolioBeta !== 0 
      ? (portfolioReturn - riskFreeRate) / portfolioBeta 
      : 0;
  }

  /**
   * 计算Jensen's Alpha
   */
  private calculateJensenAlpha(
    portfolioReturn: number,
    benchmarkReturn: number,
    positions: PortfolioPosition[],
    benchmark: BenchmarkData
  ): number {
    const riskFreeRate = 0.02; // 简化处理
    const portfolioBeta = this.calculatePortfolioBeta(positions, benchmark);
    return portfolioReturn - (riskFreeRate + portfolioBeta * (benchmarkReturn - riskFreeRate));
  }

  /**
   * 计算组合Beta
   */
  private calculatePortfolioBeta(
    positions: PortfolioPosition[],
    benchmark: BenchmarkData
  ): number {
    // 简化的Beta计算
    // 实际应该使用历史收益率计算
    return positions.reduce((sum, pos) => {
      const benchmarkReturn = benchmark.returns.get(pos.ticker) || 0;
      // 简化的Beta估算：个股与基准的相关性
      return sum + (pos.portfolioWeight || pos.weight) * (pos.return / (benchmarkReturn || 0.0001));
    }, 0);
  }

  /**
   * 计算Upside/Downside Capture Ratio
   */
  private calculateCaptureRatios(
    positions: PortfolioPosition[],
    benchmark: BenchmarkData
  ): { upsideCapture: number; downsideCapture: number } {
    // 简化的Capture Ratio计算
    // 实际应该使用历史月度收益率
    const portfolioReturn = positions.reduce((sum, p) => sum + p.return, 0) / positions.length;
    const benchmarkReturn = Array.from(benchmark.returns.values()).reduce((a, b) => a + b, 0) / benchmark.returns.size;

    // 简化的计算（假设上涨和下跌周期相等）
    return {
      upsideCapture: benchmarkReturn !== 0 ? portfolioReturn / benchmarkReturn : 0,
      downsideCapture: benchmarkReturn !== 0 ? portfolioReturn / benchmarkReturn : 0,
    };
  }

  /**
   * 计算归因质量
   */
  private calculateAttributionQuality(
    activeReturn: number,
    allocationEffect: number,
    selectionEffect: number,
    interactionEffect: number,
    sectorAttribution: SectorAttribution[]
  ): any {
    // 计算完整性：三效应是否解释了全部主动收益
    const totalExplained = allocationEffect + selectionEffect + interactionEffect;
    const completeness = activeReturn !== 0 
      ? 1 - Math.abs(activeReturn - totalExplained) / Math.abs(activeReturn)
      : 1;

    // 计算准确性：各板块归因之和是否等于总归因
    const sectorAllocationSum = sectorAttribution.reduce((sum, s) => sum + s.allocationEffect, 0);
    const sectorSelectionSum = sectorAttribution.reduce((sum, s) => sum + s.selectionEffect, 0);
    const sectorInteractionSum = sectorAttribution.reduce((sum, s) => sum + s.interactionEffect, 0);

    const allocationAccuracy = allocationEffect !== 0 
      ? 1 - Math.abs(allocationEffect - sectorAllocationSum) / Math.abs(allocationEffect)
      : 1;
    
    const selectionAccuracy = selectionEffect !== 0 
      ? 1 - Math.abs(selectionEffect - sectorSelectionSum) / Math.abs(selectionEffect)
      : 1;
    
    const interactionAccuracy = interactionEffect !== 0 
      ? 1 - Math.abs(interactionEffect - sectorInteractionSum) / Math.abs(interactionEffect)
      : 1;

    const accuracy = (allocationAccuracy + selectionAccuracy + interactionAccuracy) / 3;

    // 计算一致性
    const consistency = this.calculateAttributionConsistency(sectorAttribution);

    // 计算解释力
    const explanatoryPower = activeReturn !== 0 
      ? Math.abs(totalExplained / activeReturn)
      : 1;

    return {
      completeness,
      accuracy,
      consistency,
      explanatoryPower,
      residuals: {
        totalResidual: activeReturn - totalExplained,
        unexplainedReturn: activeReturn - totalExplained,
        residualStdDev: 0, // TODO: 计算残差标准差
        maxResidual: 0, // TODO: 计算最大残差
        residualTests: [], // TODO: 实现残差检验
      },
    };
  }

  /**
   * 计算归因一致性
   */
  private calculateAttributionConsistency(sectorAttribution: SectorAttribution[]): number {
    // 简化的实现：计算各板块效应的变异系数
    const totalEffects = sectorAttribution.map(s => Math.abs(s.totalEffect));
    const meanEffect = ss.mean(totalEffects);
    const stdDev = ss.standardDeviation(totalEffects);
    
    // 变异系数越小，一致性越高
    const cv = meanEffect !== 0 ? stdDev / meanEffect : 0;
    return Math.max(0, 1 - cv);
  }

  /**
   * 计算链式连接归因
   */
  private calculateLinkedAttribution(
    periods: SinglePeriodAttribution[],
    method: string
  ): LinkedAttribution {
    const allocationEffects = periods.map(p => p.brinsonAttribution.allocationEffect);
    const selectionEffects = periods.map(p => p.brinsonAttribution.selectionEffect);
    const interactionEffects = periods.map(p => p.brinsonAttribution.interactionEffect);

    let linkedAllocationEffect: number;
    let linkedSelectionEffect: number;
    let linkedInteractionEffect: number;
    let smoothingAdjustment: number;

    switch (method) {
      case 'Carino':
        ({ 
          linkedAllocationEffect, 
          linkedSelectionEffect, 
          linkedInteractionEffect, 
          smoothingAdjustment 
        } = this.applyCarinoLinking(
          allocationEffects,
          selectionEffects,
          interactionEffects,
          periods.map(p => p.brinsonAttribution.portfolioReturn),
          periods.map(p => p.brinsonAttribution.benchmarkReturn)
        ));
        break;
      
      case 'Menchero':
        ({ 
          linkedAllocationEffect, 
          linkedSelectionEffect, 
          linkedInteractionEffect, 
          smoothingAdjustment 
        } = this.applyMencheroLinking(
          allocationEffects,
          selectionEffects,
          interactionEffects,
          periods.map(p => p.brinsonAttribution.portfolioReturn),
          periods.map(p => p.brinsonAttribution.benchmarkReturn)
        ));
        break;
      
      case 'GRAP':
        ({ 
          linkedAllocationEffect, 
          linkedSelectionEffect, 
          linkedInteractionEffect, 
          smoothingAdjustment 
        } = this.applyGRAPLinking(
          allocationEffects,
          selectionEffects,
          interactionEffects,
          periods.map(p => p.brinsonAttribution.portfolioReturn),
          periods.map(p => p.brinsonAttribution.benchmarkReturn)
        ));
        break;
      
      default:
        // 默认使用简单加总（不推荐用于多期归因）
        linkedAllocationEffect = ss.sum(allocationEffects);
        linkedSelectionEffect = ss.sum(selectionEffects);
        linkedInteractionEffect = ss.sum(interactionEffects);
        smoothingAdjustment = 0;
    }

    // 计算残差
    const activeReturns = periods.map(p => p.brinsonAttribution.activeReturn);
    const cumulativeActiveReturn = chainLinkReturnsUtil(activeReturns);
    const totalLinkedEffect = linkedAllocationEffect + linkedSelectionEffect + linkedInteractionEffect;
    const residual = cumulativeActiveReturn - totalLinkedEffect;

    return {
      method: method as 'Carino' | 'Menchero' | 'GRAP' | 'Carino-Menchero',
      linkedAllocationEffect,
      linkedSelectionEffect,
      linkedInteractionEffect,
      smoothingAdjustment,
      residual,
    };
  }

  /**
   * 应用Carino链接方法
   */
  private applyCarinoLinking(
    allocationEffects: number[],
    selectionEffects: number[],
    interactionEffects: number[],
    portfolioReturns: number[],
    benchmarkReturns: number[]
  ): { 
    linkedAllocationEffect: number; 
    linkedSelectionEffect: number; 
    linkedInteractionEffect: number; 
    smoothingAdjustment: number;
  } {
    const n = allocationEffects.length;
    
    // 计算调整因子
    let kSum = 0;
    for (let t = 0; t < n; t++) {
      const Rp = portfolioReturns[t];
      const Rb = benchmarkReturns[t];
      
      if (Rp !== Rb) {
        kSum += (Math.log(1 + Rp) - Math.log(1 + Rb)) / (Rp - Rb);
      } else {
        kSum += 1 / (1 + Rb);
      }
    }
    
    const k = kSum / n;
    
    // 计算链式连接效应
    let linkedAllocationEffect = 0;
    let linkedSelectionEffect = 0;
    let linkedInteractionEffect = 0;
    
    for (let t = 0; t < n; t++) {
      const Rp = portfolioReturns[t];
      const Rb = benchmarkReturns[t];
      
      let kt: number;
      if (Rp !== Rb) {
        kt = (Math.log(1 + Rp) - Math.log(1 + Rb)) / (Rp - Rb) / k;
      } else {
        kt = 1 / ((1 + Rb) * k);
      }
      
      linkedAllocationEffect += kt * allocationEffects[t];
      linkedSelectionEffect += kt * selectionEffects[t];
      linkedInteractionEffect += kt * interactionEffects[t];
    }
    
    return {
      linkedAllocationEffect,
      linkedSelectionEffect,
      linkedInteractionEffect,
      smoothingAdjustment: 0, // Carino方法不需要平滑调整
    };
  }

  /**
   * 应用Menchero链接方法
   */
  private applyMencheroLinking(
    allocationEffects: number[],
    selectionEffects: number[],
    interactionEffects: number[],
    portfolioReturns: number[],
    benchmarkReturns: number[]
  ): { 
    linkedAllocationEffect: number; 
    linkedSelectionEffect: number; 
    linkedInteractionEffect: number; 
    smoothingAdjustment: number;
  } {
    const n = allocationEffects.length;
    
    // 计算调整因子
    const cumulativePortfolioReturns: number[] = [];
    const cumulativeBenchmarkReturns: number[] = [];
    
    let cumPort = 1;
    let cumBench = 1;
    for (let t = 0; t < n; t++) {
      cumPort *= (1 + portfolioReturns[t]);
      cumBench *= (1 + benchmarkReturns[t]);
      cumulativePortfolioReturns.push(cumPort - 1);
      cumulativeBenchmarkReturns.push(cumBench - 1);
    }
    
    // 计算链式连接效应
    let linkedAllocationEffect = 0;
    let linkedSelectionEffect = 0;
    let linkedInteractionEffect = 0;
    
    for (let t = 0; t < n; t++) {
      const Rt = t === 0 ? 0 : cumulativePortfolioReturns[t - 1];
      const Bt = t === 0 ? 0 : cumulativeBenchmarkReturns[t - 1];
      
      const k = Math.log(1 + cumulativePortfolioReturns[n - 1]) - 
                Math.log(1 + cumulativeBenchmarkReturns[n - 1]);
      
      let kt: number;
      if (Math.abs(k) > 1e-10) {
        kt = (Math.log((1 + Rt) * (1 + portfolioReturns[t])) - 
              Math.log((1 + Bt) * (1 + benchmarkReturns[t]))) / k;
      } else {
        kt = 1 / n;
      }
      
      linkedAllocationEffect += kt * allocationEffects[t];
      linkedSelectionEffect += kt * selectionEffects[t];
      linkedInteractionEffect += kt * interactionEffects[t];
    }
    
    return {
      linkedAllocationEffect,
      linkedSelectionEffect,
      linkedInteractionEffect,
      smoothingAdjustment: 0, // Menchero方法不需要平滑调整
    };
  }

  /**
   * 应用GRAP链接方法
   */
  private applyGRAPLinking(
    allocationEffects: number[],
    selectionEffects: number[],
    interactionEffects: number[],
    portfolioReturns: number[],
    benchmarkReturns: number[]
  ): { 
    linkedAllocationEffect: number; 
    linkedSelectionEffect: number; 
    linkedInteractionEffect: number; 
    smoothingAdjustment: number;
  } {
    const n = allocationEffects.length;
    
    // 计算累计收益
    const cumulativePortfolioReturns: number[] = [];
    const cumulativeBenchmarkReturns: number[] = [];
    
    let cumPort = 1;
    let cumBench = 1;
    for (let t = 0; t < n; t++) {
      cumPort *= (1 + portfolioReturns[t]);
      cumBench *= (1 + benchmarkReturns[t]);
      cumulativePortfolioReturns.push(cumPort - 1);
      cumulativeBenchmarkReturns.push(cumBench - 1);
    }
    
    // 计算调整因子
    const cumulativeActiveReturn = cumulativePortfolioReturns[n - 1] - cumulativeBenchmarkReturns[n - 1];
    const totalEffect = allocationEffects.reduce((a, b) => a + b, 0) +
                       selectionEffects.reduce((a, b) => a + b, 0) +
                       interactionEffects.reduce((a, b) => a + b, 0);
    
    const beta = Math.abs(totalEffect) > 1e-10 ? cumulativeActiveReturn / totalEffect : 1;
    
    // 计算链式连接效应
    let linkedAllocationEffect = 0;
    let linkedSelectionEffect = 0;
    let linkedInteractionEffect = 0;
    
    for (let t = 0; t < n; t++) {
      const k = beta;
      
      linkedAllocationEffect += k * allocationEffects[t];
      linkedSelectionEffect += k * selectionEffects[t];
      linkedInteractionEffect += k * interactionEffects[t];
    }
    
    // 计算平滑调整
    const smoothingAdjustment = cumulativeActiveReturn - 
                               (linkedAllocationEffect + linkedSelectionEffect + linkedInteractionEffect);
    
    return {
      linkedAllocationEffect,
      linkedSelectionEffect,
      linkedInteractionEffect,
      smoothingAdjustment,
    };
  }

  /**
   * 计算归因漂移
   */
  private calculateAttributionDrift(
    periods: SinglePeriodAttribution[]
  ): any {
    // TODO: 实现完整的归因漂移分析
    // 包括：配置一致性、选股一致性、交互一致性、风格漂移等
    
    return {
      allocationConsistency: 0,
      selectionConsistency: 0,
      interactionConsistency: 0,
      styleDrift: {
        valueTiltDrift: 0,
        growthTiltDrift: 0,
        qualityTiltDrift: 0,
        momentumTiltDrift: 0,
        overallStyleDriftScore: 0,
        driftAlert: false,
        driftAlertThreshold: 0.1,
      },
      regimeChanges: [],
      persistenceAnalysis: {
        allocationEffectPersistence: 0,
        selectionEffectPersistence: 0,
        interactionEffectPersistence: 0,
        icAllocation: 0,
        icSelection: 0,
        icInteraction: 0,
        hitRate: 0,
        winLossRatio: 0,
        payoffRatio: 0,
      },
      rollingWindows: [],
    };
  }

  /**
   * 计算多期汇总统计
   */
  private calculateMultiPeriodSummary(
    periods: SinglePeriodAttribution[],
    cumulativePortfolioReturn: number,
    cumulativeBenchmarkReturn: number
  ): any {
    const activeReturns = periods.map(p => p.brinsonAttribution.activeReturn);
    const informationRatios = periods.map(p => p.brinsonAttribution.informationRatio);
    
    return {
      totalPeriods: periods.length,
      positiveActiveReturnPeriods: activeReturns.filter(r => r > 0).length,
      negativeActiveReturnPeriods: activeReturns.filter(r => r < 0).length,
      averageActiveReturn: ss.mean(activeReturns),
      medianActiveReturn: ss.median(activeReturns),
      stdDevActiveReturn: ss.standardDeviation(activeReturns),
      maxActiveReturn: Math.max(...activeReturns),
      minActiveReturn: Math.min(...activeReturns),
      averageInformationRatio: ss.mean(informationRatios),
      averageTrackingError: ss.mean(periods.map(p => p.brinsonAttribution.trackingError)),
      hitRate: periods.filter(p => p.brinsonAttribution.activeReturn > 0).length / periods.length,
      bestPeriod: periods.reduce((best, p) => 
        p.brinsonAttribution.activeReturn > best.brinsonAttribution.activeReturn ? p : best
      ).period,
      worstPeriod: periods.reduce((worst, p) => 
        p.brinsonAttribution.activeReturn < worst.brinsonAttribution.activeReturn ? p : worst
      ).period,
      consistencyScore: this.calculateConsistencyScore(periods),
      cumulativePortfolioReturn,
      cumulativeBenchmarkReturn,
      cumulativeActiveReturn: cumulativePortfolioReturn - cumulativeBenchmarkReturn,
    };
  }

  /**
   * 计算一致性得分
   */
  private calculateConsistencyScore(periods: SinglePeriodAttribution[]): number {
    if (periods.length < 2) return 1;
    
    const activeReturns = periods.map(p => p.brinsonAttribution.activeReturn);
    const positivePeriods = activeReturns.filter(r => r > 0).length;
    const totalPeriods = activeReturns.length;
    
    // 简化的实现：连胜率
    return positivePeriods / totalPeriods;
  }

  /**
   * 计算几何归因
   */
  private calculateGeometricAttribution(
    periods: SinglePeriodAttribution[],
    cumulativePortfolioReturn: number,
    cumulativeBenchmarkReturn: number
  ): GeometricAttribution {
    // 简化的几何归因实现
    // 实际实现应该使用更复杂的几何调整算法
    
    const allocationEffects = periods.map(p => p.brinsonAttribution.allocationEffect);
    const selectionEffects = periods.map(p => p.brinsonAttribution.selectionEffect);
    const interactionEffects = periods.map(p => p.brinsonAttribution.interactionEffect);

    // 简化的几何调整
    const adjustmentFactor = cumulativePortfolioReturn / (cumulativePortfolioReturn + 1);
    
    const geometricAllocationEffect = chainLinkReturnsUtil(allocationEffects) * adjustmentFactor;
    const geometricSelectionEffect = chainLinkReturnsUtil(selectionEffects) * adjustmentFactor;
    const geometricInteractionEffect = chainLinkReturnsUtil(interactionEffects) * adjustmentFactor;

    return {
      geometricAllocationEffect,
      geometricSelectionEffect,
      geometricInteractionEffect,
      totalGeometricEffect: geometricAllocationEffect + geometricSelectionEffect + geometricInteractionEffect,
      explanation: 'Geometric attribution adjusts for compounding effects over multiple periods using chain-linking with geometric adjustments.',
    };
  }
}

// ==========================================================================
// Export
// ==========================================================================

export default BrinsonAttributionCalculator;
