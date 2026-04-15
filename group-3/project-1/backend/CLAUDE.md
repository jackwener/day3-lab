# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

基于机器学习的基金评级系统，预测基金未来超额收益，映射为 A/B/C/D/E 五档评级。覆盖数据获取、特征工程、模型训练和评级生成。

## 常用命令

```bash
# 安装依赖
pip install -r requirements.txt

# 数据获取（从 akshare API 拉取基金数据）
python src/fetch_data/run.py

# 基金评级完整流程（需在 src/fund_rating/ 目录下运行，使用相对导入）
cd src/fund_rating && python main.py
```

## 架构

项目分为三个主要模块：

### 数据获取层 (`src/fetch_data/`)
通过 akshare API 获取基金数据。`run.py` 是入口，调用 `fetch_fund_info.py` 获取基础信息并保存到 `data/mutual_fund/`。各 fetch 模块独立运行，覆盖基金信息、净值、持仓、费率、排名等。`calculate_fund_performance.py` 使用 6 个并行 worker 计算多时间段（1m/3m/6m/1y/2y/3y）的收益率、夏普比率、最大回撤等指标。

### 评级模型层 (`src/fund_rating/`)
`data_processor.py` 从 `data/` 加载经理、持仓、收益、风险四类特征并合并预处理。`model_trainer.py` 使用 **RandomForest**（非 LightGBM）训练模型，以信息比率为目标变量，按绝对阈值生成 A-E 评级。`main.py` 串联完整流程。**注意：此模块使用相对导入（`from data_processor import ...`），需在 `src/fund_rating/` 目录下运行。**

### 工具层 (`src/utils/`)
`utils.py` 提供日期格式化、基金代码补零、API 重试装饰器、CSV 读写、规模解析等通用函数。`db.py` 提供数据库相关工具。通过 `__init__.py` 统一导出。

## 数据流

```
akshare API → src/fetch_data/*.py → data/mutual_fund/ (CSV)
                                         ↓
                              src/fund_rating/data_processor.py (特征合并)
                                         ↓
                              src/fund_rating/model_trainer.py (训练+评级)
                                         ↓
                                   终端输出评级结果
```

## 关键注意事项

- **Python 路径**：多数模块通过 `sys.path.append` 添加项目根目录。`src/fetch_data/` 脚本从项目根目录运行；`src/fund_rating/` 需在其自身目录下运行（使用相对导入）
- **硬编码路径**：`src/utils/utils.py:191` 存在 `e:\codes\fund_analysis\data\trade_date.csv` 的硬编码绝对路径，迁移环境时需修改
- **模型差异**：`models/` 目录存储 85 个 LightGBM 模型文件（`model_YYYYMM.txt`，2018-01 至 2025-01），但当前 `model_trainer.py` 实际使用 RandomForest。LightGBM 模型为历史产物
- **评级阈值**：A(IR>=0.5) / B(0.2-0.5) / C(0-0.2) / D(-0.2-0) / E(<-0.2)，基于预测信息比率的绝对阈值，非百分位数
- **缺失文件**：CLAUDE.md 中提到的 `test_refactored_code.py` 已不存在
- **项目语言**：代码注释和文档均为中文
