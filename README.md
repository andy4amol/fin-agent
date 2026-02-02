# Fin-Agent TypeScript Edition

一个五层金融AI架构系统，**TypeScript 实现**。

**核心设计理念**：**L4 的 AI 回复必须严格基于 L2 的计算数值，严禁幻觉**。

---

## 项目结构

```
src/
├── types/              # 核心类型定义
├── l1_orchestration/   # L1 调度层
│   ├── dispatcher.ts
│   ├── prompt_factory.ts
│   └── guardrails.ts
├── l2_engine/         # L2 计算引擎层
│   ├── pnl_analyzer.ts
│   ├── risk_model.ts
│   └── behavior_analyzer.ts
├── l3_rag/            # L3 RAG检索层
│   ├── search_engine.ts
│   ├── vector_db.ts
│   └── source_ranker.ts
├── l4_inference/      # L4 AI推理层
│   ├── llm_service.ts
│   └── llm_router.ts
├── l5_data/           # L5 数据层
│   ├── user_db.ts
│   ├── market_mcp.ts
│   └── news_data.ts
├── main.ts            # 主入口
└── index.ts           # 库导出
```

---

## 安装

### 前提条件

- Node.js >= 18.0.0
- npm 或 yarn

### 安装依赖

```bash
npm install
```

---

## 使用方法

### 开发模式
```bash
npm run dev
```

### 构建
```bash
npm run build
```

### 运行
```bash
npm start
```

### 测试
```bash
npm test
```

### 类型检查
```bash
npm run typecheck
```

### 代码检查
```bash
npm run lint
```

---

## API Keys

在使用实际 LLM 服务前，请设置环境变量：

```bash
export SILICONFLOW_API_KEY="your-api-key"
```

或者在项目根目录创建 `.env` 文件：

```
SILICONFLOW_API_KEY=your-api-key
```

---

## 架构特性

### 1. 五层架构

- **L1: Orchestration (调度层)** - Prompt编排、安全防护
- **L2: Engine (计算层)** - 盈亏计算、风险模型
- **L3: RAG (检索层)** - 向量检索、新闻搜索
- **L4: Inference (推理层)** - LLM调用、流式输出
- **L5: Data (数据层)** - 用户数据、市场行情

### 2. 防幻觉机制

1. **Prompt 层面约束**：明确要求使用 L2 提供的数值
2. **后验验证**：L1 层检查 L4 输出是否包含正确的 L2 数值
3. **System Prompt**：强制禁止编造数值

### 3. TypeScript 优势

- 完整的类型安全
- 更好的IDE支持
- 易于集成到现有Node.js项目
- 现代化的JavaScript特性

---

## 安全机制

### 输入 Guardrails
```typescript
const forbiddenKeywords = ['内幕', '诈骗', '非法'];
```

### 输出 Guardrails
```typescript
const requiredDisclaimers = ['风险提示', '仅供参考'];
```

### L2 一致性验证
```typescript
verifyL2Consistency(response, expectedPnl, expectedReturn, pnlDetails);
```

---

## 从 Python 迁移到 TypeScript

### 主要变更

1. **类型系统**：Python 的灵活类型 → TypeScript 的严格类型
2. **异步处理**：Python 的 `asyncio` → TypeScript 的 `async/await`
3. **HTTP 请求**：Python 的 `aiohttp` → TypeScript 的 `axios`
4. **金融市场数据**：Python 的 `yfinance` → TypeScript 的 `yahoo-finance2`

### 优势

- **类型安全**：编译时捕获类型错误
- **IDE支持**：更好的自动补全和重构
- **生态系统**：丰富的 npm 包
- **现代特性**：支持最新的 JavaScript 特性

---

## 示例输出

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
- [ ] 添加更多单元测试
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
