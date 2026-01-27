# Fin-Agent

A five-layer financial AI architecture system with L2→L4 anti-hallucination mechanism.

## 🚀 Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Run tests
python3 tests/test_l2_l4_consistency.py

# Start the agent
python3 main.py
```

## 📖 Documentation

- [README.md](README.md) - Complete architecture documentation
- [IMPROVEMENTS.md](IMPROVEMENTS.md) - Improvement summary report

## 🏗️ Architecture

```
L1: Orchestration (编排层)
L2: Quantitative Engine (量化计算引擎)
L3: RAG (检索增强生成)
L4: Inference (推理层)
L5: Data Layer (数据层)
```

## 🔒 Key Features

- **Anti-Hallucination**: L4 responses are strictly based on L2 calculations
- **Multi-layer Security**: Input validation, prompt constraints, output verification
- **Financial Compliance**: Mandatory risk warnings and disclaimers
- **Comprehensive Testing**: 6 core tests with 100% pass rate

## 📊 Status

| Component | Status |
|-----------|--------|
| L1 Orchestration | ✅ |
| L2 Engine | ✅ |
| L3 RAG | ✅ |
| L4 Inference | ✅ |
| L5 Data | ✅ |
| Tests | ✅ (6/6) |

## 📄 License

MIT License
