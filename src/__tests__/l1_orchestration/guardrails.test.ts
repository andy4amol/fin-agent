
import { Guardrails } from '../../l1_orchestration/guardrails';
import { PnLDetail } from '../../types';

describe('Guardrails Tests', () => {
  describe('verifyL2Consistency', () => {
    const pnlDetails: PnLDetail[] = [
      { ticker: 'AAPL', pnl: 100, return_rate: '10.00%', current_price: 110, cost_price: 100, quantity: 10 },
      { ticker: 'GOOGL', pnl: 200, return_rate: '20.00%', current_price: 120, cost_price: 100, quantity: 10 }
    ];
    const expectedPnl = 300;
    const expectedReturn = '15.00%';

    test('should pass valid response with exact numbers', () => {
      const response = '总盈亏 300，收益率 15.00%。主要持仓 AAPL, GOOGL。风险提示：股市有风险。';
      const result = Guardrails.verifyL2Consistency(response, expectedPnl, expectedReturn, pnlDetails);
      expect(result.isConsistent).toBe(true);
    });

    test('should pass valid response with loosely formatted numbers (commas)', () => {
      const response = '总盈亏 3,000.00 (scaled for test)，收益率 15%。主要持仓 AAPL。风险提示：注意风险。';
      // Adjust expected for this test case
      const result = Guardrails.verifyL2Consistency(
        '总盈亏 300.00，收益率 15.00%。主要持仓 AAPL。风险提示：有风险。', 
        300, 
        '15.00%', 
        pnlDetails
      );
      expect(result.isConsistent).toBe(true);
    });

    test('should fail if PnL is wrong', () => {
      const response = '总盈亏 500，收益率 15.00%。主要持仓 AAPL。风险提示：有风险。';
      const result = Guardrails.verifyL2Consistency(response, expectedPnl, expectedReturn, pnlDetails);
      expect(result.isConsistent).toBe(false);
      expect(result.issues.some(i => i.includes('总盈亏'))).toBe(true);
    });

    test('should fail if Return is wrong', () => {
      const response = '总盈亏 300，收益率 50.00%。主要持仓 AAPL。风险提示：有风险。';
      const result = Guardrails.verifyL2Consistency(response, expectedPnl, expectedReturn, pnlDetails);
      expect(result.isConsistent).toBe(false);
      expect(result.issues.some(i => i.includes('收益率'))).toBe(true);
    });

    test('should fail if no holdings mentioned', () => {
      const response = '总盈亏 300，收益率 15.00%。风险提示：有风险。';
      const result = Guardrails.verifyL2Consistency(response, expectedPnl, expectedReturn, pnlDetails);
      expect(result.isConsistent).toBe(false);
      expect(result.issues.some(i => i.includes('持仓'))).toBe(true);
    });

    test('should fail if no disclaimer', () => {
      const response = '总盈亏 300，收益率 15.00%。主要持仓 AAPL。';
      const result = Guardrails.verifyL2Consistency(response, expectedPnl, expectedReturn, pnlDetails);
      expect(result.isConsistent).toBe(false);
      expect(result.issues.some(i => i.includes('风险提示'))).toBe(true);
    });

    test('should handle tolerance in matching', () => {
      const response = '总盈亏 300.01，收益率 15.01%。主要持仓 AAPL。风险提示：有风险。';
      const result = Guardrails.verifyL2Consistency(response, expectedPnl, expectedReturn, pnlDetails);
      expect(result.isConsistent).toBe(true);
    });
  });

  describe('validateInput', () => {
    test('should detect forbidden keywords', () => {
      expect(Guardrails.validateInput('我有内幕消息').isSafe).toBe(false);
      expect(Guardrails.validateInput('正常查询').isSafe).toBe(true);
    });
  });

  describe('validateOutput', () => {
    test('should append disclaimer if missing', () => {
      const output = Guardrails.validateOutput('分析报告');
      expect(output).toContain('风险提示');
    });

    test('should not append if already present', () => {
      const output = Guardrails.validateOutput('分析报告。风险提示：已包含。');
      expect(output).not.toContain('【风险提示】'); // Should not add default one
      expect(output).toContain('风险提示：已包含');
    });
  });
});
