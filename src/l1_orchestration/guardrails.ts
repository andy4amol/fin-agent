import { PnLDetail, ConsistencyCheckResult } from '../types';

/**
 * L1 Orchestration - Guardrails
 * 防护栏，负责输入输出验证和一致性检查
 */
export class Guardrails {
  private static readonly FORBIDDEN_KEYWORDS = ['内幕', '诈骗', '非法'];

  /**
   * 输入安全拦截
   * @param userQuery 用户查询
   * @returns 验证结果和消息
   */
  static validateInput(userQuery: string): { isSafe: boolean; message: string } {
    for (const keyword of Guardrails.FORBIDDEN_KEYWORDS) {
      if (userQuery.includes(keyword)) {
        return {
          isSafe: false,
          message: `检测到敏感词: ${keyword}`,
        };
      }
    }
    return { isSafe: true, message: '' };
  }

  /**
   * 输出合规审查
   * @param responseText 响应文本
   * @returns 审查后的响应
   */
  static validateOutput(responseText: string): string {
    const requiredDisclaimers = ['风险提示', '仅供参考'];

    // 简单检查，如果没有风险提示则自动追加
    const hasDisclaimer = requiredDisclaimers.some((d) => responseText.includes(d));

    if (!hasDisclaimer) {
      return (
        responseText +
        '\n\n【风险提示】市场有风险，投资需谨慎。本报告仅供参考，不构成投资建议。'
      );
    }

    return responseText;
  }

  /**
   * 验证 L4 回复是否与 L2 计算数据一致
   * @param responseText L4 的回复文本
   * @param expectedPnl 预期的总盈亏值
   * @param expectedReturn 预期的收益率字符串
   * @param pnlDetails 详细的盈亏数据列表
   * @returns 一致性检查结果
   */
  static verifyL2Consistency(
    responseText: string,
    expectedPnl: number,
    expectedReturn: string,
    pnlDetails: PnLDetail[]
  ): ConsistencyCheckResult {
    const issues: string[] = [];

    // 1. 检查总盈亏数值
    if (!responseText.includes(String(expectedPnl))) {
      issues.push(`❌ 缺少或错误的总盈亏数值 ${expectedPnl}`);
    } else {
      issues.push(`✅ 包含正确的总盈亏数值 ${expectedPnl}`);
    }

    // 2. 检查总收益率
    if (!responseText.includes(expectedReturn)) {
      issues.push(`❌ 缺少或错误的收益率 ${expectedReturn}`);
    } else {
      issues.push(`✅ 包含正确的收益率 ${expectedReturn}`);
    }

    // 3. 检查个股盈亏（至少应提及主要持仓）
    let mentionedCount = 0;
    for (const item of pnlDetails.slice(0, 3)) {
      // 检查前3个主要持仓
      const ticker = item.ticker;
      if (responseText.includes(ticker)) {
        mentionedCount++;
      }
    }

    if (mentionedCount === 0) {
      issues.push('⚠️  未提及任何具体持仓的盈亏情况');
    } else {
      issues.push(`✅ 提及了 ${mentionedCount} 个主要持仓`);
    }

    // 4. 检查风险提示
    if (!responseText.includes('风险提示')) {
      issues.push('❌ 缺少风险提示');
    } else {
      issues.push('✅ 包含风险提示');
    }

    const isConsistent = !issues.some((i) => i.includes('❌'));

    return { isConsistent, issues };
  }
}
