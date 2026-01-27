# Fin-Agent 架构文档

## 系统概述

Fin-Agent 是一个五层金融 AI 架构系统，专门用于金融分析和投资建议。核心设计理念是：**L4 的 AI 回复必须严格基于 L2 的计算数值，严禁幻觉**。

---

## 架构层次

### L1: Orchestration (编排层)

**职责**：
- 统筹协调各层组件
- Prompt 编排和组装
- 输入/输出 Guardrails（安全防护）
- L2 数据一致性验证

**核心组件**：
- `dispatcher.py`: 主调度器，协调整个请求流程
- `prompt_factory.py`: Prompt 模板工厂，注入 L2 计算结果
- `guardrails.py`: 安全防护和 L2 一致性验证

**关键特性**：
```python
# L2→L4 防幻觉验证机制
is_consistent, issues = Guardrails.verify_l2_consistency(
    raw_response,
    expected_pnl=pnl_data['total_pnl'],
    expected_return=pnl_data['total_return_rate'],
    pnl_details=pnl_data['details']
)
```

---

### L2: Quantitative Engine (量化计算引擎)

**职责**：
- 盈亏计算
- 风险评估
- 行为分析
- 提供可验证的数值结果

**核心组件**：
- `pnl_analyzer.py`: 盈亏归因分析
- `risk_model.py`: 投资组合风险模型
- `behavior_analyzer.py`: 交易行为分析

**输出数据结构**：
```python
{
    "total_pnl": 15000.00,           # 总盈亏（必须被 L4 引用）
    "total_return_rate": "15.00%",   # 总收益率（必须被 L4 引用）
    "details": [
        {
            "ticker": "0700.HK",
            "current_price": 345.00,
            "cost_price": 300.00,
            "pnl": 4500.00,
            "return_rate": "15.00%"
        }
    ],
    "summary": "盈利"
}
```

---

### L3: RAG (检索增强生成)

**职责**：
- 市场资讯检索
- 新闻/研报获取
- 向量化检索（可选）
- 源排序和过滤

**核心组件**：
- `search_engine.py`: 搜索引擎
- `vector_db.py`: 向量数据库（可扩展）
- `source_ranker.py`: 检索结果排序

---

### L4: Inference (推理层)

**职责**：
- LLM 模型调用
- 支持多模型路由
- 流式输出

**核心组件**：
- `llm_router.py`: 模型路由器
- `llm_service.py`: LLM 服务封装

**防幻觉机制**：
1. **Prompt 层面约束**：明确要求使用 L2 提供的数值
2. **后验验证**：L1 层检查 L4 输出是否包含正确的 L2 数值
3. **System Prompt**：强制禁止编造数值

---

### L5: Data Layer (数据层)

**职责**：
- 实时行情数据获取
- 用户数据管理
- 新闻数据源

**核心组件**：
- `market_mcp.py`: 市场数据接口（基于 yfinance）
- `user_db.py`: 用户持仓数据
- `news_data.py`: 新闻数据源

---

## 数据流图

```
用户请求
   ↓
[L1 Dispatcher]
   ├─→ [L5] 获取持仓数据
   ├─→ [L5] 获取实时行情
   ├─→ [L2] 计算盈亏 ← 必须被 L4 引用
   ├─→ [L2] 计算风险
   └─→ [L3] 检索资讯
   ↓
[L1 PromptFactory] 注入 L2 数值到 Prompt
   ↓
[L4 LLM Service] 生成回复
   ↓
[L1 Guardrails] 验证 L4 回复是否包含正确的 L2 数值
   ↓
最终回复
```

---

## 核心设计原则

### 1. 数值真实性保证

**问题**：LLM 容易产生数值幻觉

**解决方案**：
- L2 计算所有数值
- L1 在 Prompt 中明确注入 L2 结果
- L1 在输出后验证 L4 是否使用了正确的数值

### 2. 可审计性

所有计算结果都有明确的来源：
- 盈亏 → `pnl_analyzer.py`
- 风险 → `risk_model.py`
- 行为 → `behavior_analyzer.py`

### 3. 可扩展性

- 模型路由：支持多个 LLM 提供商
- 数据源：可添加更多市场数据源
- RAG：可集成真实的向量数据库

---

## 安全机制

### 输入 Guardrails
```python
forbidden_keywords = ["内幕", "诈骗", "非法"]
```

### 输出 Guardrails
```python
required_disclaimers = ["风险提示", "仅供参考"]
```

### L2 一致性验证
```python
verify_l2_consistency(response, expected_pnl, expected_return, pnl_details)
```

---

## 配置说明

### 环境变量
- `SILICONFLOW_API_KEY`: SiliconFlow API 密钥（用于 LLM）

### 依赖安装
```bash
pip install -r requirements.txt
```

---

## 使用示例

```python
python main.py
```

示例输出：
```
=== Financial AI Agent (Fin-Agent) Initializing... ===

[User] ID: user_001, Query: 帮我分析一下我的持仓盈亏，并给出后续操作建议。

[L1] Received request from user user_001: 帮我分析一下我的持仓盈亏，并给出后续操作建议。
[L1] Dispatching tasks to L2, L3, L5...
[L1] Calling LLM (L4)...

[L1] Verifying L4 response against L2 data...
[L1] Consistency Check Results:
  ✅ 包含正确的总盈亏数值 15000.0
  ✅ 包含正确的收益率 15.00%
  ✅ 提及了 3 个主要持仓
  ✅ 包含风险提示

==================================================
=== Agent Response ===
==================================================
（AI 生成的分析报告）
==================================================
```

---

## 改进方向

### 短期
- [ ] 添加单元测试
- [ ] 完善错误处理
- [ ] 添加日志系统

### 中期
- [ ] 集成真实向量数据库（如 Milvus）
- [ ] 添加更多数据源（如 Bloomberg API）
- [ ] 实现缓存机制

### 长期
- [ ] 支持多用户并发
- [ ] 添加实时推送
- [ ] 实现策略回测

---

## 许可证

MIT License

---

## 贡献指南

欢迎提交 Issue 和 Pull Request！

---

## 联系方式

如有问题，请联系项目维护者。
