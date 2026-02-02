/**
 * Fin-Agent - TypeScript Edition
 * 
 * 金融AI五层架构系统 - TypeScript 实现
 * 
 * Architecture:
 * - L1: Orchestration Layer (调度层)
 * - L2: Engine Layer (计算引擎层)
 * - L3: RAG Layer (检索增强层)
 * - L4: Inference Layer (AI推理层)
 * - L5: Data Layer (数据层)
 * 
 * Key Features:
 * - 严格的 L2→L4 防幻觉机制
 * - 类型安全的 TypeScript 实现
 * - 支持流式 LLM 输出
 * - 完整的测试覆盖
 */

// Export all modules
export * from './types';
export * from './l1_orchestration';
export * from './l2_engine';
export * from './l3_rag';
export * from './l4_inference';
export * from './l5_data';

// Version info
export const VERSION = '1.1.0';
export const FRAMEWORK = 'Fin-Agent TypeScript';
