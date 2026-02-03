# Fin-Agent 核心架构设计文档

## 1. 系统架构总览

### 1.1 架构哲学

Fin-Agent 采用**五层微内核架构**，核心理念是：

```
┌─────────────────────────────────────────────────────┐
│  数据驱动 (Data-Driven)                             │
│  ├── L2层计算必须可验证、可溯源                      │
│  └── L4层AI必须基于L2数据，严禁幻觉                   │
├─────────────────────────────────────────────────────┤
│  分层解耦 (Layered Decoupling)                      │
│  ├── 每层只依赖下层，不依赖上层                      │
│  └── 层内高内聚，层间低耦合                         │
├─────────────────────────────────────────────────────┤
│  可扩展性 (Extensibility)                           │
│  ├── 支持多种数据源、多种模型                        │
│  └── 插件化架构，易于添加新功能                       │
└─────────────────────────────────────────────────────┘
```

### 1.2 五层架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                           L5: Data Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  Market MCP  │  │   User DB    │  │   News API   │              │
│  │  (实时行情)   │  │  (持仓数据)   │  │  (新闻数据)   │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
└─────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        L4: Inference Layer                          │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │                 LLM Router & Service                     │      │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │      │
│  │  │  DeepSeek    │  │   GPT-4      │  │    Claude    │  │      │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  │      │
│  └──────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         L3: RAG Layer                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │   Search     │  │  Vector DB   │  │    News      │              │
│  │   Engine     │  │  (Milvus/    │  │    RAG       │              │
│  │              │  │   Pinecone)  │  │              │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
└─────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      L2: Attribution Engine                         │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                   Core Attribution Models                    │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │   │
│  │  │   Return     │  │    Risk      │  │   Factor     │      │   │
│  │  │ Attribution  │  │ Attribution  │  │ Attribution  │      │   │
│  │  │  (Brinson)   │  │   (VaR/      │  │  (Style/      │      │   │
│  │  │              │  │   CVaR)      │  │   Industry)  │      │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘      │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     L1: Orchestration Layer                         │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                      Dispatcher Controller                     │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │   │
│  │  │   Input      │  │   Prompt     │  │   Output     │      │   │
│  │  │  Guardrails  │  │   Factory    │  │  Guardrails  │      │   │
│  │  │              │  │              │  │  + L2 Verify │      │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘      │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. 核心组件详解

### 2.1 L2: Attribution Engine（归因引擎）

归因引擎是整个系统的**核心计算层**，负责将投资收益分解为多个维度的贡献。

#### 2.1.1 归因模型架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Attribution Engine                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              Return Attribution Model                    ││
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    ││
│  │  │  Allocation │  │  Selection  │  │ Interaction │    ││
│  │  │   Effect    │  │   Effect    │  │   Effect    │    ││
│  │  │  (配置效应)  │  │  (选股效应)  │  │  (交互效应)  │    ││
│  │  └─────────────┘  └─────────────┘  └─────────────┘    ││
│  │                                                         ││
│  │  Brinson Model:                                        ││
│  │  R_portfolio - R_benchmark =                           ││
│  │    Σ(w_p - w_b) × R_b  [Allocation]                    ││
│  │    + Σw_b × (R_p - R_b) [Selection]                    ││
│  │    + Σ(w_p - w_b) × (R_p - R_b) [Interaction]          ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              Risk Attribution Model                      ││
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      ││
│  │  │    VaR    │  │   CVaR     │  │Volatility │      ││
│  │  │ Attribution│ │ Attribution│ │Attribution│      ││
│  │  └─────────────┘  └─────────────┘  └─────────────┘      ││
│  │                                                         ││
│  │  Risk Contribution =                                    ││
│  │    Σw_i × ∂σ_p/∂w_i =                                 ││
│  │    Σw_i × (Σ_j w_j × σ_ij) / σ_p                      ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              Factor Attribution Model                    ││
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      ││
│  │  │  Industry   │  │    Style    │  │   Custom    │      ││
│  │  │ Attribution│ │ Attribution│ │  │   Factors   │      ││
│  │  │ (行业归因)  │  │ (风格归因)  │  │  (自定义因子) │      ││
│  │  └─────────────┘  └─────────────┘  └─────────────┘      ││
│  │                                                         ││
│  │  Factor Model:                                         ││
│  │  R_p = α + Σβ_i × F_i + ε                             ││
│  │                                                         ││
│  │  Industry: GICS/申万行业分类                            ││
│  │  Style: Value/Growth/Quality/Momentum                    ││
│  │  Custom: User-defined factors                          ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              Time-Series Attribution                     ││
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      ││
│  │  │    Daily   │  │   Weekly   │  │   Monthly  │      ││
│  │  │Attribution │  │Attribution │  │Attribution │      ││
│  │  └─────────────┘  └─────────────┘  └─────────────┘      ││
│  │                                                         ││
│  │  Performance Drift Analysis:                            ││
│  │  - Attribution consistency over time                    ││
│  │  - Style drift detection                                ││
│  │  - Factor exposure evolution                            ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. 核心功能设计

### 3.1 持仓归因分析引擎

归因引擎是系统的核心，需要从多个维度深度分析投资组合的表现。

#### 3.1.1 归因维度矩阵

| 维度 | 子维度 | 分析方法 | 输出指标 |
|------|--------|----------|----------|
| **收益归因** | 资产配置 | Brinson模型 | 配置效应、选股效应、交互效应 |
| | 个股选择 | 自下而上 | Alpha、超额收益 |
| | 择时能力 | 市场择时 | 择时Alpha |
| **风险归因** | 总风险 | 方差分解 | 风险贡献度 |
| | 下行风险 | VaR/CVaR | 尾部风险贡献 |
| | 系统性风险 | Beta分解 | 市场/行业Beta |
| **因子归因** | 行业因子 | 行业偏离 | 行业配置收益 |
| | 风格因子 | 风格暴露 | 价值/成长/质量收益 |
| | 宏观因子 | 宏观敏感 | 利率/通胀/汇率敏感 |
| **时间归因** | 短期 | 日/周归因 | 短期漂移 |
| | 中期 | 月/季归因 | 风格持续性 |
| | 长期 | 年归因 | 长期趋势 |

#### 3.1.2 归因分析流程

```
┌─────────────────────────────────────────────────────────────────┐
│                    Attribution Analysis Pipeline                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Phase 1: Data Preparation                                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │  Portfolio  │  │  Benchmark  │  │  Market Data │            │
│  │   Holdings  │  │   Index     │  │   (Prices)   │            │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘            │
│         └───────────────┬───────────────┘                       │
│                         ▼                                      │
│              ┌──────────────────┐                              │
│              │  Aligned Data   │  ← Time alignment, currency   │
│              │    Matrix       │    conversion, corporate       │
│              └────────┬─────────┘    actions handling          │
│                       │                                        │
└───────────────────────┼────────────────────────────────────────┘
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│  Phase 2: Return Attribution                                     │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │               Brinson Attribution Model                    │ │
│  │                                                            │ │
│  │  R_portfolio - R_benchmark =                                │ │
│  │                                                            │ │
│  │  Allocation Effect: Σ(w_p - w_b) × R_b                    │ │
│  │    → 超配/低配行业的贡献                                   │ │
│  │                                                            │ │
│  │  Selection Effect: Σw_b × (R_p - R_b)                     │ │
│  │    → 行业内选股的贡献                                     │ │
│  │                                                            │ │
│  │  Interaction: Σ(w_p - w_b) × (R_p - R_b)                  │ │
│  │    → 配置与选股的交互效应                                 │ │
│  │                                                            │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │             Multi-Period Attribution                        │ │
│  │                                                            │ │
│  │  Chain-Linking: (1+R₁) × (1+R₂) × ... × (1+Rₙ) - 1       │ │
│  │                                                            │ │
│  │  Attribution Drift: Detect style/factor drift over time    │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│  Phase 3: Risk Attribution                                       │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │            Risk Decomposition (Euler's Theorem)              │ │
│  │                                                            │ │
│  │  σ²_p = Σᵢ Σⱼ wᵢ wⱼ σᵢⱼ                                  │ │
│  │                                                            │ │
│  │  Risk Contribution: RCᵢ = wᵢ × ∂σ_p/∂wᵢ                  │ │
│  │                      = wᵢ × (Σⱼ wⱼ σᵢⱼ) / σ_p            │ │
│  │                                                            │ │
│  │  % Risk Contribution: RCᵢ / σ_p × 100                     │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                Tail Risk Attribution                       │ │
│  │                                                            │ │
│  │  VaR Contribution: VaRᵢ = E[Xᵢ | X = VaR]                  │ │
│  │                                                            │ │
│  │  CVaR Contribution: CVaRᵢ = E[Xᵢ | X ≤ VaR]            │ │
│  │                                                            │ │
│  │  Tail Risk Concentration: Herfindahl Index               │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│  Phase 4: Factor Attribution                                     │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │              Multi-Factor Model                             │ │
│  │                                                            │ │
│  │  R_i = α + Σ β_k × F_k + ε                               │ │
│  │                                                            │ │
│  │  Factor Returns: F_k = return of factor-mimicking        │ │
│  │                    portfolio (long-short)                  │ │
│  │                                                            │ │
│  │  Factor Attribution:                                       │ │
│  │    - Industry Factors: GICS/申万一级行业                    │ │
│  │    - Style Factors: Value, Growth, Quality, Momentum      │ │
│  │    - Macro Factors: Rates, Inflation, FX, Credit           │ │
│  │    - Statistical Factors: PCA/Factor Analysis             │ │
│  │                                                            │ │
│  │  Pure Factor Return:                                      │ │
│  │    R_f = (X'X)^(-1) X' R                                 │ │
│  │    where X is factor exposure matrix                     │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │          Factor Timing & Drift Analysis                     │ │
│  │                                                            │ │
│  │  Factor Timing Return:                                     │ │
│  │    Σ(w_actual - w_benchmark) × F_return                  │ │
│  │                                                            │ │
│  │  Factor Drift Detection:                                   │ │
│  │    - Rolling factor exposure (window = 63/126/252 days)    │ │
│  │    - Regime change detection (HMM, Change Point)           │ │
│  │    - Style drift score                                     │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│  Phase 5: Synthesis & Reporting                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │              Integrated Attribution Report                 │ │
│  │                                                            │ │
│  │  Executive Summary:                                        │ │
│  │    - Total Return: X.XX% vs Benchmark: Y.YY%             │ │
│  │    - Active Return: ±Z.ZZ% (Information Ratio: X.XX)     │ │
│  │    - Risk-Adjusted Return: Sharpe X.XX, Sortino X.XX      │ │
│  │                                                            │ │
│  │  Attribution Decomposition:                                │ │
│  │    ┌────────────────────────────────────────┐             │ │
│  │    │  Return Attribution  │  Contribution  │             │ │
│  │    ├────────────────────────────────────────┤             │ │
│  │    │  Allocation Effect   │   +X.XX%       │             │ │
│  │    │  Selection Effect    │   +Y.YY%       │             │ │
│  │    │  Interaction         │   +Z.ZZ%       │             │ │
│  │    │  Currency Effect     │   +W.WW%       │             │ │
│  │    │  Trading Effect      │   +V.VV%       │             │ │
│  │    └────────────────────────────────────────┘             │ │
│  │                                                            │ │
│  │  Risk Attribution:                                         │ │
│  │    - Total Risk: X.XX% (Benchmark: Y.YY%)                  │ │
│  │    - Active Risk (Tracking Error): Z.ZZ%                    │ │
│  │    - Risk Contribution by Position: [Chart]                │ │
│  │    - Tail Risk: VaR X.XX%, CVaR Y.YY%                      │ │
│  │                                                            │ │
│  │  Factor Attribution:                                       │ │
│  │    - Industry Exposure: [Chart]                            │ │
│  │    - Style Factor Tilt: Value X.XX, Growth Y.YY            │ │
│  │    - Macro Sensitivity: Rates X.XX, Inflation Y.YY         │ │
│  │    - Factor Drift: [Time Series Chart]                     │ │
│  │                                                            │ │
│  │  Performance Analytics:                                    │ │
│  │    - Rolling Returns: [1M, 3M, 6M, YTD, 1Y, 3Y]            │ │
│  │    - Drawdown Analysis: Max DD X.XX%, Duration Y days      │ │
│  │    - Win Rate: X.XX%, Profit Factor: Y.YY                  │ │
│  │    - Up/Down Capture: X.XX% / Y.YY%                        │ │
│  │                                                            │ │
│  │  Recommendations:                                           │ │
│  │    Based on L2 quantitative analysis:                       │ │
│  │    1. [Action Item 1 with specific data support]           │ │
│  │    2. [Action Item 2 with risk-adjusted metrics]           │ │
│  │    3. [Action Item 3 with factor exposure analysis]        │ │
│  │                                                            │ │
│  │  Disclaimer: This analysis is based on L2 quantitative      │ │
│  │  calculations and L3 market data. All numerical values     │ │
│  │  are verified against L2 engine outputs.                 │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. 数据流与依赖关系

### 3.1 数据流图

```
User Request
     │
     ▼
┌──────────────────────────────────────────────────────────────┐
│ L1: Orchestration                                            │
│  ├─ Parse user intent (attribution type, time range)         │
│  ├─ Validate input (portfolio ID, date range)                  │
│  └─ Route to appropriate attribution model                     │
└──────────────────────────────────────────────────────────────┘
     │
     ├── Parallel Data Fetch ──────────────────────────────┐
     │                                                      │
     ▼                                                      ▼
┌──────────────────────────────────┐  ┌──────────────────────────────────┐
│ L5: Data Layer                   │  │ L5: Data Layer                   │
│  ├─ Portfolio Holdings           │  │  ├─ Market Data (prices,       │
│  ├─ Transaction History         │  │  │   dividends, splits)         │
│  └─ Corporate Actions           │  │  ├─ Benchmark Data             │
│                                   │  │  ├─ Risk-free Rate            │
│                                   │  │  └─ FX Rates (if applicable)  │
└──────────────────────────────────┘  └──────────────────────────────────┘
     │                                      │
     └──────────────┬───────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────────────┐
│ L2: Attribution Engine                                      │
│  ├─ Calculate portfolio returns (TWR, MWR)                   │
│  ├─ Calculate benchmark returns                              │
│  ├─ Return Attribution (Brinson Model):                      │
│  │   ├─ Allocation Effect                                   │
│  │   ├─ Selection Effect                                      │
│  │   └─ Interaction Effect                                   │
│  ├─ Risk Attribution (Euler's Theorem):                     │
│  │   ├─ Volatility Contribution                               │
│  │   ├─ VaR/CVaR Contribution                                 │
│  │   └─ Tail Risk Contribution                               │
│  ├─ Factor Attribution (Multi-Factor Model):                 │
│  │   ├─ Industry Factors                                     │
│  │   ├─ Style Factors (Value/Growth/Quality/Momentum)      │
│  │   └─ Macro Factors (Rates/Inflation/FX/Credit)           │
│  ├─ Time-Series Attribution:                                 │
│  │   ├─ Rolling Attribution (63/126/252 days)               │
│  │   ├─ Regime Analysis (Bull/Bear/Sideways)                   │
│  │   └─ Style Drift Detection                               │
│  └─ Performance Metrics:                                     │
│      ├─ Risk-Adjusted Returns (Sharpe, Sortino, Information)  │
│      ├─ Drawdown Analysis (Max DD, Recovery Time)              │
│      ├─ Win Rate, Profit Factor, Upside/Downside Capture        │
│      └─ Factor Exposure & Contribution                         │
└──────────────────────────────────────────────────────────────┘
     │
     ├── Parallel Enhancement ───────────────────────┐
     │                                                │
     ▼                                                ▼
┌──────────────────────────────────┐  ┌──────────────────────────────────┐
│ L3: RAG Layer                    │  │ L5: Data Layer                   │
│  ├─ Retrieve market news         │  │  ├─ Company fundamentals       │
│  ├─ Analyst reports               │  │  ├─ Earnings data               │
│  ├─ Sector/industry analysis      │  │  ├─ Economic indicators         │
│  └─ Macro commentary              │  │  └─ Alternative data            │
└──────────────────────────────────┘  └──────────────────────────────────┘
     │                                       │
     └──────────────┬────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────────────┐
│ L4: Inference Layer                                          │
│  ├─ Generate narrative explanation                            │
│  ├─ Provide context-aware insights                            │
│  ├─ Synthesize quantitative + qualitative analysis             │
│  ├─ Generate actionable recommendations                        │
│  └─ Create visualization descriptions                          │
└──────────────────────────────────────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────────────────────────────┐
│ L1: Output Synthesis                                           │
│  ├─ Format attribution report                                   │
│  ├─ Generate charts/tables                                      │
│  ├─ L2 consistency verification                               │
│  ├─ Add risk warnings & disclaimers                             │
│  └─ Deliver to user                                            │
└──────────────────────────────────────────────────────────────┘
```

---

## 4. 关键技术决策

### 4.1 归因模型选择

| 归因类型 | 模型 | 适用场景 | 复杂度 |
|---------|------|---------|--------|
| **收益归因** | Brinson-Fachler | 单期归因 | ⭐⭐ |
| | Brinson-Hood-Beebower | 多期归因 | ⭐⭐⭐ |
| | Multi-Currency Brinson | 国际组合 | ⭐⭐⭐⭐ |
| **风险归因** | Euler Allocation | 尾部风险 | ⭐⭐⭐ |
| | Marginal VaR | 增量风险 | ⭐⭐⭐ |
| | Component VaR | 风险贡献 | ⭐⭐⭐⭐ |
| **因子归因** | BARRA USE4 | 美股 | ⭐⭐⭐⭐ |
| | BARRA CNE6 | A股 | ⭐⭐⭐⭐ |
| | Axioma AX-MH | 全球 | ⭐⭐⭐⭐⭐ |

### 4.2 数据存储策略

```
┌─────────────────────────────────────────────────────────────────┐
│                      Data Storage Strategy                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Real-Time (Sub-second)           │  Time-Series (Historical)    │
│  ├─ Redis (Caching)              │  ├─ TimescaleDB/InfluxDB     │
│  ├─ Kafka (Streaming)            │  ├─ Parquet files (S3)       │
│  └─ In-memory (Computation)      │  └─ ClickHouse (Analytics)   │
│                                  │                              │
│  Metadata & Reference            │  Derived & Results           │
│  ├─ PostgreSQL                   │  ├─ PostgreSQL               │
│  ├─ MongoDB (JSON)               │  ├─ Redis (Cache)            │
│  └─ Elasticsearch (Search)       │  └─ S3 (Reports)             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 计算性能优化

| 优化策略 | 适用场景 | 实现方式 | 预期收益 |
|---------|---------|---------|---------|
| **向量化计算** | 大规模矩阵运算 | NumPy/MKL/OpenBLAS | 10-100x |
| **并行计算** | 独立归因计算 | Multiprocessing/ThreadPool | 4-16x |
| **GPU加速** | 深度学习因子 | CUDA/TensorFlow/PyTorch | 10-1000x |
| **缓存策略** | 重复计算 | LRU/Memoization/Redis | 5-50x |
| **增量计算** | 实时归因 | Delta computation | 2-10x |

### 4.4 系统可靠性与异步处理 (System Reliability & Asynchronous Processing)

针对金融计算的高负载特性，引入异步任务队列和熔断机制：

```
┌─────────────────────────────────────────────────────────────┐
│                  Asynchronous Job Processing                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  User Request → [L1 API Gateway] → [Job Queue (Redis)]      │
│                                           │                 │
│        ┌──────────────────────────────────┴────────┐        │
│        ▼                                           ▼        │
│  [Worker A: Fast Track]              [Worker B: Heavy Track]│
│  - Single Period Attribution         - Monte Carlo VaR      │
│  - Simple Risk Metrics               - Multi-Period Chain   │
│  - Real-time Pricing                 - Factor Regression    │
│                                                             │
│        │                                           │        │
│        └─────────────────┬─────────────────────────┘        │
│                          ▼                                  │
│                  [Result Cache (Redis)]                     │
│                          │                                  │
│  User Polling/WebSocket ←┘                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

- **Circuit Breaker (熔断器)**：当外部数据源 (L5 Market MCP) 响应超时或错误率过高时，自动降级为上一次成功的缓存数据或模拟数据，防止级联故障。
- **Rate Limiter (限流)**：针对 L4 LLM API 调用进行令牌桶限流，控制成本并防止配额耗尽。

### 4.5 可观测性与审计 (Observability & Audit)

为了满足金融合规要求，构建 L6 基础设施层：

```
┌─────────────────────────────────────────────────────────────┐
│              L6: Infrastructure & Observability             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Distributed Tracing (OpenTelemetry)                     │
│     - Trace ID贯穿 L1->L5 全链路                            │
│     - 记录每个环节的耗时（数据获取 vs 计算 vs 推理）        │
│                                                             │
│  2. Audit Logging (Immutable Ledger)                        │
│     - 记录：Request ID, User ID, Timestamp                  │
│     - 输入：Raw Query, Portfolio Snapshot                   │
│     - 过程：Attribution Result (JSON), Retrieved News IDs   │
│     - 输出：Final LLM Response                              │
│                                                             │
│  3. Data Snapshotting                                       │
│     - 每次分析锁定 Input Data Snapshot                      │
│     - 确保分析结果的可复现性 (Reproducibility)              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. 实施路线图

### Phase 1: Core Attribution Engine (Week 1-2)
- [ ] 重构 PnLAnalyzer → AttributionEngine
- [ ] 实现 Brinson 单期归因模型
- [ ] 实现多期归因（链式连接）
- [ ] 实现基础风险归因（Euler分配）

### Phase 2: Advanced Analytics (Week 3-4)
- [ ] 实现因子归因（BARRA/自定义）
- [ ] 实现VaR/CVaR归因
- [ ] 实现时间序列归因（滚动窗口）
- [ ] 实现风格漂移检测

### Phase 3: Data & Performance (Week 5-6)
- [ ] 实现数据缓存层（Redis）
- [ ] 构建异步任务队列（BullMQ/Redis）
- [ ] 向量化计算优化
- [ ] 并行计算优化
- [ ] 基准测试与调优

### Phase 4: Integration & UI (Week 7-8)
- [ ] 集成L3 RAG增强
- [ ] 优化LLM Prompt工程
- [ ] 实现全链路日志与审计（OpenTelemetry）
- [ ] 实现报告生成功能
- [ ] 可视化图表集成

---

## 6. 风险评估与缓解策略

| 风险类型 | 风险描述 | 影响程度 | 缓解策略 |
|---------|---------|---------|---------|
| **模型风险** | 归因模型假设不成立 | 🔴 高 | 多模型验证、压力测试 |
| **数据质量** | 脏数据导致错误归因 | 🔴 高 | 数据验证、清洗、监控 |
| **计算错误** | 数值计算精度问题 | 🟡 中 | 单元测试、基准对比 |
| **性能瓶颈** | 大规模数据计算慢 | 🟡 中 | 缓存、并行、向量化 |
| **解释性** | 用户无法理解结果 | 🟡 中 | 可视化、自然语言解释 |

---

## 7. 结论与建议

### 7.1 现状评估

**优势**：
- 五层架构设计合理，符合金融系统最佳实践
- TypeScript迁移成功，类型安全有保障
- 防幻觉机制完善，L2→L4一致性验证到位

**劣势**：
- L2归因引擎过于简单，仅支持基础盈亏计算
- 缺乏专业风险模型（VaR、CVaR、因子模型）
- 数据层缺少缓存和验证机制
- 无投资组合优化和回测功能

### 7.2 优先级建议

**立即执行（P0）**：
1. 重构L2 AttributionEngine，实现Brinson归因
2. 实现基础风险归因（VaR、Euler分配）
3. 添加数据缓存和验证层

**短期执行（P1）**：
4. 实现多期归因和链式连接
5. 实现因子归因（BARRA/自定义）
6. 添加投资组合优化器
7. 构建异步任务队列（应对计算密集型任务）

**中期执行（P2）**：
8. 实现回测引擎
9. 添加机器学习因子
10. 构建实时数据流
11. 建立全链路可观测性与审计系统

### 7.3 成功指标

| 指标 | 当前 | 目标 | 衡量方式 |
|------|------|------|---------|
| 归因维度 | 1维（收益） | 4维（收/险/因/时） | 功能覆盖率 |
| 归因模型 | 简单盈亏 | Brinson+Factor | 模型数量 |
| 计算精度 | 无验证 | 误差<0.01% | 基准对比 |
| 响应时间 | 无优化 | <1s | API延迟 |
| 数据完整性 | mock数据 | 实时数据 | 数据新鲜度 |

---

**文档版本**: v1.1
**作者**: Claude & Gemini
**日期**: 2025-02-03
**状态**: 架构设计 - 已增强 (异步处理 & 可观测性)
