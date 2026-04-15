# M2-RPT 功能升级 — 可执行任务清单

> **模块编号**: M2-RPT（研报分析增强）  
> **基线版本**: M1-QA（spec_init/）  
> **生成依据**: spec_function_upgrade/ 全套规格文档（01~14）  
> **任务分类**: LLM/算法优化 · 后端开发（模块A+B） · 前端开发  
> **后端分工**: 模块A（当前功能升级） · 模块B（新增研报知识库）  
> **里程碑**: S1 解析增强 → S2 对比优化 → S3 智能对比 → S4 知识库收口

---

## 一、任务总览矩阵

### 1.1 LLM/算法优化任务（公共依赖）

| 任务ID | 分类 | 任务名称 | 归属 | 里程碑 | 优先级 | 依赖 | 关联规格 |
|--------|------|----------|------|--------|--------|------|----------|
| **T-01** | LLM/算法 | 股票代码提取正则优化 | 公共 | S1 | P0 | 无 | `08`§3.1, `13`TC-001~004 |
| **T-02** | LLM/算法 | 核心观点原文定位算法 | 公共 | S1 | P0 | T-01 | `08`§3, `13`TC-010~012 |
| **T-03** | LLM/算法 | 观点相似度计算（n-gram） | 模块A | S3 | P1 | T-02 | `08`§2.2, `13`TC-030~031 |
| **T-04** | LLM/算法 | Mock 股票数据字典 | 模块A | S1 | P0 | 无 | `08`§2.1, `10`§3 |

### 1.2 后端开发任务 — 模块A（当前功能升级）

> **开发人员**: 后端开发人员A  
> **职责范围**: 研报解析增强、股票详情、对比功能优化、相似度计算

| 任务ID | 分类 | 任务名称 | 里程碑 | 优先级 | 依赖 | 关联规格 |
|--------|------|----------|--------|--------|------|----------|
| **T-05A** | 后端A | ReportParser 扩展（股票+观点位置） | S1 | P0 | T-01, T-02 | `08`§3, `10`§2 |
| **T-06A** | 后端A | Storage 扩展（删除+相似度管理） | S2~S3 | P0 | 无 | `10`§5.1~5.2 |
| **T-07A** | 后端A | Mock 股票 API 端点 | S1 | P0 | T-04 | `09`§3 |
| **T-08A** | 后端A | 研报删除 API 端点 | S2 | P0 | T-06A | `09`§4 |
| **T-09A** | 后端A | 研报上传 API 扩展 | S1 | P0 | T-05A | `09`§5 |
| **T-11A** | 后端A | 研报对比 API 扩展（共同/差异观点） | S3 | P1 | T-03, T-06A | `09`§8 |
| **T-12A** | 后端A | 研报详情 API 扩展 | S1 | P0 | T-05A | `09`§6 |

### 1.3 后端开发任务 — 模块B（新增研报知识库）

> **开发人员**: 后端开发人员B  
> **职责范围**: 研报全局查询、多维筛选、知识库数据支撑

| 任务ID | 分类 | 任务名称 | 里程碑 | 优先级 | 依赖 | 关联规格 |
|--------|------|----------|--------|--------|------|----------|
| **T-05B** | 后端B | ReportParser 字段兼容层（stock_codes 默认值） | S1 | P0 | T-01 | `10`§2.3 |
| **T-06B** | 后端B | Storage 扩展（多维筛选方法） | S4 | P1 | 无 | `10`§5.1 |
| **T-10B** | 后端B | 研报列表 API 扩展（多维筛选） | S4 | P1 | T-06B | `09`§7 |
| **T-13B** | 后端B | 知识库聚合接口（机构/代码枚举） | S4 | P1 | T-10B | `06`§18.3 |

### 1.4 前端开发任务

| 任务ID | 分类 | 任务名称 | 里程碑 | 优先级 | 依赖 | 关联规格 |
|--------|------|----------|--------|--------|------|----------|
| **T-13** | 前端 | 研报列表勾选交互（表格列表） | S2 | P0 | T-08A | `06`§15 |
| **T-14** | 前端 | 研报删除交互（确认弹窗+Toast） | S2 | P0 | T-08A, T-13 | `06`§16 |
| **T-15** | 前端 | 股票详情弹窗 + SVG 走势图 | S1 | P0 | T-07A | `06`§13 |
| **T-16** | 前端 | 原文定位弹窗（高亮显示） | S1 | P0 | T-12A | `06`§14 |
| **T-17** | 前端 | 共同/差异观点折叠面板 | S3 | P1 | T-11A | `06`§17 |
| **T-18** | 前端 | 研报知识库页面（新Tab） | S4 | P1 | T-10B | `06`§18 |
| **T-19** | 前端 | 知识库搜索与筛选组件 | S4 | P1 | T-18, T-13B | `06`§18.3 |

### 1.5 测试任务

| 任务ID | 分类 | 任务名称 | 里程碑 | 优先级 | 依赖 | 关联规格 |
|--------|------|----------|--------|--------|------|----------|
| **T-20A** | 测试 | 模块A 测试（解析+股票+对比） | S1~S3 | P0 | T-05A~T-12A | `13` §2~5 |
| **T-20B** | 测试 | 模块B 测试（知识库+筛选） | S4 | P0 | T-10B, T-13B | `13` §6 |
| **T-20C** | 测试 | V1 兼容性测试 | S4 | P0 | 全部后端任务 | `13` §7 |

---

## 二、LLM/算法优化任务（公共依赖）

> **说明**: 此部分任务为公共依赖，建议由后端开发人员A优先完成，为模块A和模块B提供基础支撑。

### T-01 股票代码提取正则优化
**里程碑**: S1 | **优先级**: P0 | **无依赖**

| 项目 | 内容 |
|------|------|
| **目标** | 从研报文本中提取股票代码，支持多种格式 |
| **输入** | 研报原始文本（raw_text） |
| **输出** | 标准化股票代码数组，如 `["SH600519", "SZ000858"]` |
| **支持格式** | `SH600519` · `000858.SZ` · `股票代码：600519` · `代码 688256` |
| **算法** | 多模式正则匹配（见 `08`§3.1） |
| **标准化规则** | 统一转为 `SH/SZ + 6位数字` 格式 |

**实现要点**:
```python
STOCK_CODE_PATTERNS = [
    r'(SH|SZ)\d{6}',                    # SH600519, SZ000858
    r'\d{6}\.(SH|SZ)',                   # 600519.SH, 000858.SZ
    r'(?:股票代码|证券代码)[：:]\s*(\d{6})',  # 股票代码：600519
    r'(?:代码)\s*(\d{6})',                # 代码 688256
]

def normalize_code(code: str) -> str:
    """标准化股票代码为 SH600519 格式"""
    # 实现逻辑...
```

**验收标准**:
- [ ] TC-M02-001: 识别 SH600519 格式
- [ ] TC-M02-002: 识别 000858.SZ 格式
- [ ] TC-M02-003: 识别"股票代码：600519"格式
- [ ] TC-M02-004: 无股票代码文本返回空数组

**产出文件**: `backend/app/report_parser.py`（扩展 `_extract_stock_codes()` 方法）

---

### T-02 核心观点原文定位算法
**里程碑**: S1 | **优先级**: P0 | **依赖**: T-01

| 项目 | 内容 |
|------|------|
| **目标** | 为每条核心观点记录原文位置，支持前端定位高亮 |
| **输入** | 观点文本 + 原始研报文本 |
| **输出** | `{text, source_text, position}` 对象 |

**算法设计**:
1. 在 `raw_text` 中搜索观点文本，记录首次匹配的字符偏移
2. 提取 position 前后各 200 字符作为 `source_text`
3. 未找到匹配时 `position = null`, `source_text = ""`

```python
def _find_position_in_text(viewpoint: str, raw_text: str) -> dict:
    """定位观点在原文中的位置"""
    position = raw_text.find(viewpoint)
    if position == -1:
        return {"text": viewpoint, "source_text": "", "position": None}
    
    start = max(0, position - 200)
    end = min(len(raw_text), position + len(viewpoint) + 200)
    source_text = raw_text[start:end]
    
    return {
        "text": viewpoint,
        "source_text": source_text,
        "position": position
    }
```

**验收标准**:
- [ ] TC-M02-010: core_opinions 返回 object[] 含 text/source_text/position
- [ ] TC-M02-011: position 值与 raw_text 实际位置一致
- [ ] TC-M02-012: 观点未找到时 position 为 null

**产出文件**: `backend/app/report_parser.py`（修改 `_extract_key_info()` 返回值结构）

---

### T-03 观点相似度计算（n-gram）
**里程碑**: S3 | **优先级**: P1 | **依赖**: T-02

| 项目 | 内容 |
|------|------|
| **目标** | 计算多篇研报间观点的文本相似度，归类共同/差异观点 |
| **算法** | 字符级 n-gram 相似度（零外部依赖，见 `08`§2.2） |
| **阈值** | ≥0.7 判定为共同观点 |
| **计算时机** | 新研报解析完成后异步触发 |

**算法实现**:
```python
def ngram_similarity(text_a: str, text_b: str, n: int = 3) -> float:
    """计算两条文本的 n-gram 相似度"""
    def get_ngrams(text):
        return set(text[i:i+n] for i in range(len(text) - n + 1))
    
    ngrams_a = get_ngrams(text_a)
    ngrams_b = get_ngrams(text_b)
    
    if not ngrams_a or not ngrams_b:
        return 0.0
    
    intersection = ngrams_a & ngrams_b
    union = ngrams_a | ngrams_b
    
    return len(intersection) / len(union)

def analyze_opinions(all_reports: list) -> dict:
    """分析多篇研报的共同/差异观点"""
    # 两两比较，按阈值归类...
```

**验收标准**:
- [ ] TC-M02-030: 相似度 ≥0.7 归为共同观点
- [ ] TC-M02-031: 相似度 <0.7 归为差异观点
- [ ] TC-M02-033: 正确保存/读取相似度数据

**产出文件**: 
- `backend/app/opinion_analyzer.py`（新建）
- `backend/data/opinion_similarity.json`（新建存储文件）

---

### T-04 Mock 股票数据字典
**里程碑**: S1 | **优先级**: P0 | **无依赖**

| 项目 | 内容 |
|------|------|
| **目标** | 维护静态 Mock 股票数据，供前端展示 |
| **数据量** | 4 只常用标的 + 1 个默认兜底 |
| **存储方式** | 内嵌 Python 字典（ADR-005） |

**数据结构**（见 `10`§3）:
```python
MOCK_STOCK_DATA = {
    "SH600519": {
        "code": "SH600519",
        "name": "贵州茅台",
        "current_price": 1856.00,
        "change_percent": 2.3,
        "price_history": [
            {"date": "2026-03-17", "close": 1780.00},
            # ... 30 天数据
        ],
        "financial_summary": {
            "period": "2025Q4",
            "revenue": "1505亿",
            "net_profit": "862亿",
            "yoy_growth": "+15.2%"
        },
        "key_events": [
            {"date": "2026-03-28", "event": "年报发布"},
            {"date": "2026-04-10", "event": "股东大会"}
        ]
    },
    "SZ000858": { ... },  # 五粮液
    "SH688256": { ... },  # 寒武纪
    "default": { ... }    # 默认兜底
}
```

**验收标准**:
- [ ] 包含 3 只真实标的 + 1 个默认兜底
- [ ] 每只标的含 30 日 price_history
- [ ] `get_stock_detail(code)` 接口正常工作

**产出文件**: `backend/app/stock_mock.py`（新建）

---

## 三、后端开发任务 — 模块A（当前功能升级）

> **开发人员**: 后端开发人员A  
> **职责范围**: 研报解析增强、股票详情、对比功能优化、相似度计算  
> **包含任务**: T-05A, T-06A, T-07A, T-08A, T-09A, T-11A, T-12A

### T-05A ReportParser 扩展（股票+观点位置）
**里程碑**: S1 | **优先级**: P0 | **依赖**: T-01, T-02

| 项目 | 内容 |
|------|------|
| **目标** | 扩展 `report_parser.py`，集成股票代码提取和观点位置记录 |
| **变更** | `_extract_key_info()` 返回结构变更 + 新增 `_extract_stock_codes()` |

**变更清单**:
- [ ] 新增 `_extract_stock_codes(text)` 方法（调用 T-01 算法）
- [ ] 修改 `_extract_key_info()` 返回的 `key_points` 为 object[]（调用 T-02 算法）
- [ ] `parse_report()` 返回值新增 `stock_codes` 字段
- [ ] V1 兼容性：读取旧研报时自动转换 core_opinions 格式

**extracted_data 新结构**（见 `10`§2）:
```json
{
  "rating": "买入",
  "target_price": "2100.00",
  "stock_codes": ["SH600519"],
  "key_points": [
    {
      "text": "公司业绩超预期",
      "source_text": "...上下文...",
      "position": 1256
    }
  ],
  "summary": "...",
  "raw_text": "..."
}
```

**验收标准**:
- [ ] 上传含股票代码的研报，返回 stock_codes 数组
- [ ] 核心观点含 source_text 和 position
- [ ] V1 旧研报读取时 core_opinions 自动转换

**产出文件**: `backend/app/report_parser.py`（修改）

---

### T-06A Storage 扩展（删除+相似度管理）
**里程碑**: S2~S3 | **优先级**: P0 | **依赖**: 无

| 项目 | 内容 |
|------|------|
| **目标** | 扩展 `storage.py`，支持研报删除、观点相似度管理 |

**方法变更/新增**（见 `10`§5）:

| 方法 | 签名 | 阶段 | 说明 |
|------|------|------|------|
| `delete_report` | `(report_id) → bool` | S2 | 删除元数据 + 原始文件 + 清理相似度缓存 |
| `save_opinion_similarity` | `(report_id, similarities: list) → None` | S3 | 保存观点相似度数据 |
| `get_opinion_similarity` | `(report_ids: list) → dict` | S3 | 获取共同/差异观点 |
| `delete_opinion_similarity` | `(report_id) → None` | S3 | 清理关联相似度数据 |

**delete_report 级联逻辑**:
```python
def delete_report(self, report_id):
    """删除研报 + 原始文件 + 相似度缓存"""
    # 1. 删除元数据
    reports = self._read(self.reports_file)
    report = next((r for r in reports if r["report_id"] == report_id), None)
    if not report:
        return False
    
    # 2. 删除原始文件
    file_path = report.get("file_path")
    if file_path and os.path.exists(file_path):
        os.remove(file_path)
    
    # 3. 清理相似度缓存
    self.delete_opinion_similarity(report_id)
    
    # 4. 写入元数据
    new_reports = [r for r in reports if r["report_id"] != report_id]
    self._write(self.reports_file, new_reports)
    return True
```

**验收标准**:
- [ ] TC-M02-020: 删除研报成功
- [ ] TC-M02-023: 级联删除元数据+文件+缓存

**产出文件**: `backend/app/storage.py`（修改）

---

### T-07A Mock 股票 API 端点
**里程碑**: S1 | **优先级**: P0 | **依赖**: T-04

| 项目 | 内容 |
|------|------|
| **目标** | 实现 `GET /api/v1/agent/stock/<code>/detail` 端点 |
| **契约** | `09`§3 |

**实现要点**:
```python
@agent_bp.route('/stock/<code>/detail', methods=['GET'])
def get_stock_detail(code):
    """获取股票 Mock 详情"""
    # 1. 校验 code 格式
    if not re.match(r'^(SH|SZ)\d{6}$', code):
        return jsonify({"error": {"code": "INVALID_STOCK_CODE", "message": "股票代码格式非法"}}), 400
    
    # 2. 查询 Mock 数据
    stock_data = get_stock_detail(code)
    if not stock_data:
        return jsonify({"error": {"code": "STOCK_NOT_FOUND", "message": "股票代码不存在"}}), 404
    
    # 3. 返回响应
    return jsonify({
        "traceId": generate_trace_id(),
        **stock_data
    })
```

**验收标准**:
- [ ] TC-M02-005: 有效代码返回 200 + 完整数据
- [ ] TC-M02-006: 非法代码返回 400 `INVALID_STOCK_CODE`
- [ ] TC-M02-007: 不存在代码返回 404 `STOCK_NOT_FOUND`

**产出文件**: `backend/app/agent_bp.py`（新增路由）

---

### T-08A 研报删除 API 端点
**里程碑**: S2 | **优先级**: P0 | **依赖**: T-06

| 项目 | 内容 |
|------|------|
| **目标** | 实现 `DELETE /api/v1/agent/reports/<id>` 端点 |
| **契约** | `09`§4 |

**实现要点**:
```python
@agent_bp.route('/reports/<report_id>', methods=['DELETE'])
def delete_report(report_id):
    """删除研报"""
    # 1. 校验 UUID 格式
    if not is_valid_uuid(report_id):
        return jsonify({"error": {"code": "INVALID_REPORT_ID"}}), 400
    
    # 2. 执行删除
    success = storage.delete_report(report_id)
    if not success:
        return jsonify({"error": {"code": "REPORT_NOT_FOUND"}}), 404
    
    return jsonify({
        "traceId": generate_trace_id(),
        "message": "研报已删除",
        "deleted_report_id": report_id
    })
```

**验收标准**:
- [ ] TC-M02-020: 删除成功返回 200
- [ ] TC-M02-021: 不存在的 ID 返回 404
- [ ] TC-M02-022: 非法 UUID 返回 400

**产出文件**: `backend/app/agent_bp.py`（新增路由）

---

### T-09A 研报上传 API 扩展
**里程碑**: S1 | **优先级**: P0 | **依赖**: T-05

| 项目 | 内容 |
|------|------|
| **目标** | 扩展 `POST /api/v1/agent/reports/upload` 响应字段 |
| **契约** | `09`§5 |

**变更要点**:
- [ ] 解析响应新增 `stock_codes` 字段
- [ ] `key_points` 改为对象数组 `{text, source_text, position}`
- [ ] 前端兼容处理：旧格式 string[] 转为 object[]

**验收标准**:
- [ ] 上传后返回 stock_codes 数组
- [ ] key_points 为 object[] 结构

**产出文件**: `backend/app/agent_bp.py`（修改上传处理逻辑）

---

### T-11A 研报对比 API 扩展（共同/差异观点）
**里程碑**: S3 | **优先级**: P1 | **依赖**: T-03, T-06A

| 项目 | 内容 |
|------|------|
| **目标** | 扩展 `POST /api/v1/agent/reports/compare` 返回共同/差异观点 |
| **契约** | `09`§8 |

**实现要点**:
```python
@agent_bp.route('/reports/compare', methods=['POST'])
def compare_reports():
    report_ids = request.json.get('report_ids', [])
    
    # 1. 基础对比表（基线功能不变）
    comparison_table = build_comparison_table(report_ids)
    
    # 2. 获取预计算的共同/差异观点
    opinion_analysis = storage.get_opinion_similarity(report_ids)
    
    return jsonify({
        "traceId": generate_trace_id(),
        "comparison_table": comparison_table,
        "common_opinions": opinion_analysis.get("common_opinions", []),
        "diff_opinions": opinion_analysis.get("diff_opinions", [])
    })
```

**验收标准**:
- [ ] TC-M02-032: 响应含 common_opinions 和 diff_opinions
- [ ] 对比结果正确分组展示

**产出文件**: `backend/app/agent_bp.py`（修改对比接口）

---

### T-12A 研报详情 API 扩展
**里程碑**: S1 | **优先级**: P0 | **依赖**: T-05

| 项目 | 内容 |
|------|------|
| **目标** | 扩展 `GET /api/v1/agent/reports/<id>` 响应字段 |
| **契约** | `09`§6 |

**变更要点**:
- [ ] 响应体 extracted_data 新增 stock_codes
- [ ] key_points 改为 object[] 结构

**验收标准**:
- [ ] TC-M02-013: 响应含 source_text 字段

**产出文件**: `backend/app/agent_bp.py`（修改详情查询逻辑）

---

## 四、后端开发任务 — 模块B（新增研报知识库）

> **开发人员**: 后端开发人员B  
> **职责范围**: 研报全局查询、多维筛选、知识库数据支撑  
> **包含任务**: T-05B, T-06B, T-10B, T-13B

### T-05B ReportParser 字段兼容层（stock_codes 默认值）
**里程碑**: S1 | **优先级**: P0 | **依赖**: T-01

| 项目 | 内容 |
|------|------|
| **目标** | 确保 V1 旧研报兼容新数据模型，stock_codes 默认空数组 |
| **变更** | 读取研报时自动添加缺失字段 |

**实现要点**:
```python
def normalize_report_data(report: dict) -> dict:
    """规范化研报数据，确保 V1 兼容"""
    # 确保 stock_codes 存在
    if 'stock_codes' not in report.get('extracted_data', {}):
        report.setdefault('extracted_data', {})['stock_codes'] = []
    
    # 确保 core_opinions 为 object[] 格式
    opinions = report.get('extracted_data', {}).get('key_points', [])
    if opinions and isinstance(opinions[0], str):
        report['extracted_data']['key_points'] = [
            {"text": op, "source_text": "", "position": None}
            for op in opinions
        ]
    
    return report
```

**验收标准**:
- [ ] TC-M02-050: V1 研报读取后自动添加 stock_codes=[]
- [ ] TC-M02-051: V1 研报 core_opinions 自动转为 object[]

**产出文件**: `backend/app/report_parser.py` 或 `backend/app/storage.py`（新增兼容方法）

---

### T-06B Storage 扩展（多维筛选方法）
**里程碑**: S4 | **优先级**: P1 | **依赖**: 无

| 项目 | 内容 |
|------|------|
| **目标** | 扩展 `storage.py` 的 `get_reports()` 方法，支持多维筛选 |

**方法扩展**（见 `10`§5.1）:

| 方法 | 签名 | 说明 |
|------|------|------|
| `get_reports` | `(session_id=None, search=None, institution=None, stock_code=None) → list` | 支持多维筛选 |

**实现要点**:
```python
def get_reports(self, session_id=None, search=None, institution=None, stock_code=None):
    """获取研报列表，支持多维筛选"""
    reports = self._read(self.reports_file)
    
    # session_id 过滤（不传则返回全部）
    if session_id:
        reports = [r for r in reports if r.get('session_id') == session_id]
    
    # 文件名模糊搜索
    if search:
        reports = [r for r in reports if search.lower() in r.get('file_name', '').lower()]
    
    # 机构筛选
    if institution:
        reports = [r for r in reports if r.get('extracted_data', {}).get('institution') == institution]
    
    # 股票代码筛选
    if stock_code:
        reports = [r for r in reports if stock_code in r.get('extracted_data', {}).get('stock_codes', [])]
    
    return reports
```

**验收标准**:
- [ ] TC-M02-040: 不传 session_id 返回所有研报
- [ ] TC-M02-044: 多维筛选逻辑正确

**产出文件**: `backend/app/storage.py`（修改 `get_reports()` 方法）

---

### T-10B 研报列表 API 扩展（多维筛选）
**里程碑**: S4 | **优先级**: P1 | **依赖**: T-06B

| 项目 | 内容 |
|------|------|
| **目标** | 扩展 `GET /api/v1/agent/reports` 支持搜索和筛选 |
| **契约** | `09`§7 |

**新增 Query 参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| `search` | string | 按文件名模糊搜索（≤50 字符） |
| `institution` | string | 按发布机构筛选 |
| `stock_code` | string | 按股票代码筛选 |

**实现要点**:
```python
@agent_bp.route('/reports', methods=['GET'])
def get_reports():
    session_id = request.args.get('session_id')
    search = request.args.get('search')
    institution = request.args.get('institution')
    stock_code = request.args.get('stock_code')
    
    # 搜索关键词长度校验
    if search and len(search) > 50:
        return jsonify({"error": {"code": "INVALID_QUERY", "message": "搜索关键词过长"}}), 400
    
    reports = storage.get_reports(
        session_id=session_id,
        search=search,
        institution=institution,
        stock_code=stock_code
    )
    
    return jsonify({
        "traceId": generate_trace_id(),
        "reports": reports
    })
```

**验收标准**:
- [ ] TC-M02-040: 不传 session_id 返回所有研报
- [ ] TC-M02-041: search=茅台 返回含"茅台"的研报
- [ ] TC-M02-042: institution=中信证券 正确筛选
- [ ] TC-M02-043: stock_code=SH600519 正确筛选

**产出文件**: `backend/app/agent_bp.py`（修改列表查询逻辑）

---

### T-13B 知识库聚合接口（机构/代码枚举）
**里程碑**: S4 | **优先级**: P1 | **依赖**: T-10B

| 项目 | 内容 |
|------|------|
| **目标** | 提供聚合数据接口，用于前端知识库筛选下拉框 |
| **契约** | `06`§18.3 |

**新增 API 端点**:
```
GET /api/v1/agent/reports/aggregations
```

**响应结构**:
```json
{
  "traceId": "tr_agg001...",
  "institutions": ["中信证券", "国泰君安", "招商证券"],
  "stock_codes": ["SH600519", "SZ000858", "SH688256"]
}
```

**实现要点**:
```python
@agent_bp.route('/reports/aggregations', methods=['GET'])
def get_report_aggregations():
    """获取研报聚合数据（用于筛选下拉框）"""
    reports = storage.get_reports()
    
    institutions = set()
    stock_codes = set()
    
    for report in reports:
        data = report.get('extracted_data', {})
        if data.get('institution'):
            institutions.add(data['institution'])
        for code in data.get('stock_codes', []):
            stock_codes.add(code)
    
    return jsonify({
        "traceId": generate_trace_id(),
        "institutions": sorted(list(institutions)),
        "stock_codes": sorted(list(stock_codes))
    })
```

**验收标准**:
- [ ] 返回去重后的机构列表
- [ ] 返回去重后的股票代码列表
- [ ] 按字母顺序排序

**产出文件**: `backend/app/agent_bp.py`（新增路由）

---

## 五、前端开发任务

### T-13 研报列表勾选交互（表格列表）
**里程碑**: S2 | **优先级**: P0 | **依赖**: T-08

| 项目 | 内容 |
|------|------|
| **目标** | 替换卡片式研报展示为表格列表，支持勾选对比 |
| **规格** | `06`§15 |

**实现要点**:
- [ ] 研报表格列：☑ 勾选框 | 文件名 | 评级 | 目标价 | 股票代码 | 上传时间 | 🗑️ 操作
- [ ] 勾选规则：最少 2 份、最多 5 份
- [ ] 底部实时显示"已选 N/5"
- [ ] 勾选 ≥2 份时显示"对比已选 (N)"按钮
- [ ] 表头提供全选复选框（最多选前 5 个）
- [ ] 复用组件：研报分析 Tab 和知识库 Tab 共用同一列表组件

**State 变量扩展**（见 `06`§19）:
```javascript
const [selectedReports, setSelectedReports] = useState([])
// 已存在，需调整交互逻辑
```

**验收标准**:
- [ ] AC-008-01: 列表展示完整字段
- [ ] AC-008-02: 勾选 2~5 份显示对比按钮
- [ ] AC-008-03: 不足 2 份禁用，超过 5 份无法勾选

**产出文件**: `frontend/src/App.jsx`（修改研报列表渲染逻辑）

---

### T-14 研报删除交互（确认弹窗+Toast）
**里程碑**: S2 | **优先级**: P0 | **依赖**: T-08, T-13

| 项目 | 内容 |
|------|------|
| **目标** | 实现研报删除的交互流程 |
| **规格** | `06`§16 |

**交互流程**:
1. 点击列表行 🗑️ 按钮
2. 弹出确认弹窗："确认删除研报「{file_name}」？此操作不可恢复。"
3. 确认后调用 `DELETE /reports/{id}`
4. 删除成功：从列表移除 + Toast 提示"删除成功"
5. 如该研报正在对比结果中，自动关闭对比结果

**State 变量扩展**:
```javascript
const [deleteConfirm, setDeleteConfirm] = useState(null) // {reportId, fileName}
```

**验收标准**:
- [ ] AC-008-04: 每行有删除按钮，点击弹出确认
- [ ] AC-008-05: 确认后研报移除，文件清理
- [ ] AC-008-06: 对比结果可关闭

**产出文件**: `frontend/src/App.jsx`（新增删除交互逻辑）

---

### T-15 股票详情弹窗 + SVG 走势图
**里程碑**: S1 | **优先级**: P0 | **依赖**: T-07

| 项目 | 内容 |
|------|------|
| **目标** | 实现股票详情弹窗，含 SVG 折线图展示股价走势 |
| **规格** | `06`§13 |

**弹窗结构**（见 `06`§13.2）:
```
┌───────────────────────────────────────┐
│  ×  贵州茅台 (SH600519)                │
├───────────────────────────────────────┤
│  当前价: ¥1,856.00  涨跌: +2.3%       │
├───────────────────────────────────────┤
│  📈 近30日股价走势图（SVG折线图）       │
├───────────────────────────────────────┤
│  最近财报 (2025Q4)                     │
│  营收: 1,505亿  净利润: 862亿          │
├───────────────────────────────────────┤
│  关键时点                              │
│  • 2026-03-28  年报发布                │
└───────────────────────────────────────┘
```

**SVG 走势图实现**（ADR-008，无 Chart.js）:
```jsx
const StockChart = ({ data }) => {
  // data: [{date, close}, ...] 30 天数据
  const width = 500, height = 200
  const maxPrice = Math.max(...data.map(d => d.close))
  const minPrice = Math.min(...data.map(d => d.close))
  
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((d.close - minPrice) / (maxPrice - minPrice)) * height
    return `${x},${y}`
  }).join(' ')
  
  return (
    <svg width={width} height={height}>
      <polyline points={points} fill="none" stroke="#1890ff" strokeWidth="2" />
    </svg>
  )
}
```

**State 变量扩展**:
```javascript
const [stockDetail, setStockDetail] = useState(null)
const [stockDetailLoading, setStockDetailLoading] = useState(false)
```

**验收标准**:
- [ ] AC-006-01: 股票代码为可点击标签
- [ ] AC-006-02: 点击弹出详情页含走势图
- [ ] AC-006-03: 详情页含名称/价格/财报/时点

**产出文件**: `frontend/src/App.jsx`（新增股票弹窗组件 + SVG 折线图）

---

### T-16 原文定位弹窗（高亮显示）
**里程碑**: S1 | **优先级**: P0 | **依赖**: T-12

| 项目 | 内容 |
|------|------|
| **目标** | 实现核心观点的原文定位弹窗 |
| **规格** | `06`§14 |

**弹窗结构**（见 `06`§14.2）:
```
┌─────────────────────────────────┐
│  ×  原文引用 — 茅台-中信.pdf      │
├─────────────────────────────────┤
│                                 │
│  ……前文内容（灰色）……            │
│  ██ 高亮标记的观点原文 ██         │
│  ……后文内容（灰色）……            │
│                                 │
├─────────────────────────────────┤
│  位置：第 1,256 字符处            │
└─────────────────────────────────┘
```

**高亮实现**:
```jsx
const SourceTextModal = ({ text, position, fileName }) => {
  const sourceText = text.source_text // 观点前后各 200 字符
  const viewText = text.text // 观点文本
  
  // 分割并高亮
  const parts = sourceText.split(viewText)
  
  return (
    <div className="modal">
      <h3>原文引用 — {fileName}</h3>
      <div className="source-content">
        {parts[0]} {/* 前文 */}
        <mark className="highlight">{viewText}</mark> {/* 高亮观点 */}
        {parts[1]} {/* 后文 */}
      </div>
      <div className="position-info">位置：第 {position?.toLocaleString() ?? '—'} 字符处</div>
    </div>
  )
}
```

**State 变量扩展**:
```javascript
const [sourceTextModal, setSourceTextModal] = useState(null) // {text, position, fileName}
```

**验收标准**:
- [ ] AC-007-01: 每条观点旁有"查看原文"图标
- [ ] AC-007-02: 弹窗展示原文片段并高亮
- [ ] AC-007-03: 显示位置信息
- [ ] AC-007-04: position 为 null 时显示"不可用"

**产出文件**: `frontend/src/App.jsx`（新增原文定位弹窗组件）

---

### T-17 共同/差异观点折叠面板
**里程碑**: S3 | **优先级**: P1 | **依赖**: T-11

| 项目 | 内容 |
|------|------|
| **目标** | 在对比结果中新增共同观点和差异观点展示 |
| **规格** | `06`§17 |

**展示结构**（见 `06`§17.1）:
```
┌─────────────────────────────────┐
│  [维度对比表格 - 同现有]          │
├─────────────────────────────────┤
│  ▼ 共同观点 (3)                  │
│  1. 业绩超预期...                │
│     📎 中信证券 · 国泰君安        │
│  2. 高端白酒需求...               │
│     📎 中信 · 国泰 · 高盛         │
├─────────────────────────────────┤
│  ▼ 差异观点 (4)                  │
│  中信证券:                       │
│    • 新产品线拓展顺利             │
│  国泰君安:                       │
│    • 估值偏高，建议等待回调        │
└─────────────────────────────────┘
```

**组件设计**:
```jsx
const OpinionAnalysis = ({ commonOpinions, diffOpinions }) => {
  const [commonExpanded, setCommonExpanded] = useState(true)
  const [diffExpanded, setDiffExpanded] = useState(true)
  
  return (
    <div className="opinion-analysis">
      {/* 共同观点 */}
      <div className="section">
        <h4 onClick={() => setCommonExpanded(!commonExpanded)}>
          ▼ 共同观点 ({commonOpinions.length})
        </h4>
        {commonExpanded && (
          <ul>
            {commonOpinions.map((op, i) => (
              <li key={i}>
                <div>{op.text}</div>
                <div className="reports">
                  📎 {op.reports.map(r => r.institution).join(' · ')}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      
      {/* 差异观点 - 类似结构 */}
    </div>
  )
}
```

**验收标准**:
- [ ] AC-009-01: 对比结果新增共同/差异观点区域
- [ ] AC-009-02: 共同观点标注涉及研报
- [ ] AC-009-03: 差异观点按研报分组
- [ ] AC-009-04: 预计算数据直接展示

**产出文件**: `frontend/src/App.jsx`（新增观点分析组件）

---

### T-18 研报知识库页面（新Tab）
**里程碑**: S4 | **优先级**: P1 | **依赖**: T-10B

| 项目 | 内容 |
|------|------|
| **目标** | 新增"知识库"Tab，展示全局研报管理界面 |
| **规格** | `06`§18 |

**页面布局**（见 `06`§18.2）:
```
┌─────────────────────────────────────┐
│  搜索: [________] 筛选: [机构▼] [代码▼]│
├─────────────────────────────────────┤
│  ☐ 文件名  │评级│目标价│代码│机构│操作│
│  ☑ 茅台-中信│买入│¥2100│600519│中信│🗑️│
│  ☐ 寒武纪  │增持│¥85 │688256│招商│🗑️│
├─────────────────────────────────────┤
│             已选 2/5  [对比已选(2)]    │
└─────────────────────────────────────┘
```

**Tab 栏扩展**:
```jsx
<div className="tab-bar">
  <button className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}>问答</button>
  <button className={`tab-btn ${activeTab === 'report' ? 'active' : ''}`} onClick={() => setActiveTab('report')}>研报分析</button>
  <button className={`tab-btn ${activeTab === 'knowledge' ? 'active' : ''}`} onClick={() => setActiveTab('knowledge')}>📚 知识库</button>
</div>
```

**数据加载**:
```javascript
const loadKnowledgeReports = async () => {
  // 不传 session_id，获取全部研报
  const res = await fetch('/api/v1/agent/reports')
  const data = await res.json()
  setKnowledgeReports(data.reports || [])
}
```

**验收标准**:
- [ ] AC-010-01: 新增"知识库"Tab 入口
- [ ] AC-010-02: 展示所有研报（不限会话）
- [ ] AC-010-04: 支持勾选 2~5 份对比
- [ ] AC-010-05: 支持删除研报

**产出文件**: `frontend/src/App.jsx`（新增知识库 Tab 和页面）

---

### T-19 知识库搜索与筛选组件
**里程碑**: S4 | **优先级**: P1 | **依赖**: T-18, T-13B

| 项目 | 内容 |
|------|------|
| **目标** | 实现知识库页面的搜索和筛选功能 |
| **规格** | `06`§18.3 |

**功能清单**:
- [ ] 按文件名模糊搜索（debounce 300ms）
- [ ] 机构下拉筛选（选项从已有研报聚合）
- [ ] 股票代码下拉筛选（选项从已有研报聚合）
- [ ] "重置"按钮清空所有筛选条件

**State 变量扩展**（见 `06`§19）:
```javascript
const [searchKeyword, setSearchKeyword] = useState('')
const [filterInstitution, setFilterInstitution] = useState(null)
const [filterStockCode, setFilterStockCode] = useState(null)
```

**筛选逻辑**:
```javascript
// 前端筛选（debounce）+ 后端 API 筛选（可选）
const filteredReports = knowledgeReports.filter(report => {
  if (searchKeyword && !report.file_name.includes(searchKeyword)) return false
  if (filterInstitution && report.extracted_data?.institution !== filterInstitution) return false
  if (filterStockCode && !report.extracted_data?.stock_codes?.includes(filterStockCode)) return false
  return true
})
```

**验收标准**:
- [ ] 搜索实时过滤（debounce 300ms）
- [ ] 机构/代码筛选正确
- [ ] 重置清空所有条件

**产出文件**: `frontend/src/App.jsx`（新增搜索筛选组件）

---

## 六、测试任务

### T-20A 模块A 测试（解析+股票+对比）
**里程碑**: S1~S3 | **优先级**: P0 | **依赖**: T-05A~T-12A

| 测试范围 | 用例数量 | 覆盖任务 |
|----------|----------|----------|
| 股票代码提取 | 4个 | T-01, T-05A |
| 观点原文定位 | 4个 | T-02, T-05A, T-12A |
| Mock 股票详情 | 3个 | T-04, T-07A |
| 研报删除 | 7个 | T-06A, T-08A |
| 共同/差异观点 | 4个 | T-03, T-11A |
| **合计** | **22个** | TC-M02-001~007, 010~013, 020~026, 030~033 |

**质量门禁**:
- [ ] G-UNIT-V2: V2 Unit 测试全绿
- [ ] G-INT-V2: V2 Integration 测试全绿

**产出文件**: 
- `backend/tests/test_report_parser_v2.py`
- `backend/tests/test_api_v2.py`
- `backend/tests/test_storage_v2.py`

---

### T-20B 模块B 测试（知识库+筛选）
**里程碑**: S4 | **优先级**: P0 | **依赖**: T-10B, T-13B

| 测试范围 | 用例数量 | 覆盖任务 |
|----------|----------|----------|
| 研报列表全局查询 | 1个 | T-06B, T-10B |
| 多维筛选 | 4个 | T-06B, T-10B |
| 聚合接口 | 1个 | T-13B |
| **合计** | **6个** | TC-M02-040~044, 新增 |

**验收标准**:
- [ ] TC-M02-040: 不传 session_id 返回所有研报
- [ ] TC-M02-041: search 参数正确过滤
- [ ] TC-M02-042: institution 参数正确过滤
- [ ] TC-M02-043: stock_code 参数正确过滤
- [ ] TC-M02-044: 多维组合筛选正确

**产出文件**: 
- `backend/tests/test_api_knowledge_base.py`

---

### T-20C V1 兼容性测试
**里程碑**: S4 | **优先级**: P0 | **依赖**: 全部后端任务

| 测试范围 | 用例数量 | 覆盖任务 |
|----------|----------|----------|
| V1 数据兼容 | 3个 | T-05A, T-05B |
| 基线回归测试 | 全部 | 所有基线功能 |

**验收标准**:
- [ ] TC-M02-050: V1 研报读取后自动添加 stock_codes=[]
- [ ] TC-M02-051: V1 研报 core_opinions 自动转为 object[]
- [ ] TC-M02-052: V1 研报上传后可正常出现在知识库列表中
- [ ] G-COMPAT: V1 兼容性测试全绿
- [ ] G-BASELINE: V1 基线测试不退化

---

## 七、任务执行顺序建议

### S1 解析增强（第 1~2 周）
```
【公共依赖】
T-01 股票代码正则 → T-02 观点定位算法
                  ↓
【模块A】                              【模块B】
T-04 Mock 数据字典 → T-05A ReportParser 扩展  T-05B 字段兼容层
                  ↓
T-07A Mock 股票 API → T-09A 上传 API 扩展
                  ↓
T-12A 详情 API 扩展
                  ↓
【前端对接模块A】
T-15 股票详情弹窗
T-16 原文定位弹窗
                  ↓
T-20A 单元测试（股票+观点）
```

### S2 对比优化（第 3~4 周）
```
【模块A】
T-06A Storage 扩展（删除方法） → T-08A 删除 API
                             ↓
【前端对接模块A】
                    T-13 列表勾选交互
                    T-14 删除交互
                             ↓
                    T-20A 集成测试（删除+对比）
```

### S3 智能对比（第 5~6 周）
```
【模块A】
T-03 相似度算法 → T-11A 对比 API 扩展
                ↓
【前端对接模块A】
        T-17 共同/差异观点面板
                ↓
        T-20A 测试（相似度+对比）
```

### S4 知识库收口（第 7~8 周）
```
【模块B】
T-06B Storage 扩展（筛选方法） → T-10B 列表 API 扩展
                             ↓
                    T-13B 聚合接口
                             ↓
【前端对接模块B】
                    T-18 知识库页面
                    T-19 搜索筛选组件
                             ↓
                    T-20B 知识库测试
                    T-20C V1 兼容性测试 + 回归测试
```

---

## 八、后端分工说明

### 模块A vs 模块B 职责划分

| 维度 | 模块A（当前功能升级） | 模块B（新增研报知识库） |
|------|---------------------|----------------------|
| **开发人员** | 后端开发人员A | 后端开发人员B |
| **核心职责** | 研报解析增强、股票详情、对比优化 | 全局查询、多维筛选、数据聚合 |
| **包含任务** | T-05A, T-06A, T-07A, T-08A, T-09A, T-11A, T-12A | T-05B, T-06B, T-10B, T-13B |
| **修改文件** | `report_parser.py`（核心逻辑）<br>`storage.py`（删除+相似度）<br>`stock_mock.py`（新增）<br>`opinion_analyzer.py`（新增）<br>`agent_bp.py`（股票/删除/对比/详情） | `storage.py`（筛选方法）<br>`agent_bp.py`（列表查询+聚合） |
| **里程碑** | S1~S3（第1-6周） | S1, S4（第1-2周 + 第7-8周） |
| **优先级** | P0 为主（核心功能） | P1 为主（增强功能） |
| **测试用例** | 22个（TC-M02-001~007, 010~013, 020~026, 030~033） | 6个（TC-M02-040~044, 新增聚合） |

### 并行开发建议

1. **第1-2周（S1）**:
   - 后端A: T-01, T-02, T-04, T-05A, T-07A, T-09A, T-12A
   - 后端B: T-05B（字段兼容层，可与 T-05A 并行）
   - **依赖协调**: T-01, T-02 完成后，A和B可并行开发

2. **第3-4周（S2）**:
   - 后端A: T-06A（删除方法）, T-08A
   - 后端B: 空闲或协助前端联调

3. **第5-6周（S3）**:
   - 后端A: T-03（相似度算法）, T-11A
   - 后端B: 空闲或协助前端联调

4. **第7-8周（S4）**:
   - 后端A: 协助模块B接口对接
   - 后端B: T-06B（筛选方法）, T-10B, T-13B

### 接口契约约定

**后端A 提供的接口**（模块B 不修改）:
- `GET /stock/<code>/detail` - 股票 Mock 详情
- `DELETE /reports/<id>` - 删除研报
- `POST /reports/upload` - 上传（扩展字段）
- `GET /reports/<id>` - 详情（扩展字段）
- `POST /reports/compare` - 对比（扩展共同/差异观点）

**后端B 提供的接口**（模块A 不修改）:
- `GET /reports` - 列表（扩展多维筛选）
- `GET /reports/aggregations` - 聚合数据（新增）

**共享依赖**:
- `storage.py` - A和B都需要修改，建议通过 Git 分支协调
- `report_parser.py` - A负责核心逻辑，B负责兼容层

---

## 九、风险与应对

| 风险 | 严重度 | 影响任务 | 应对措施 |
|------|--------|----------|----------|
| 股票代码正则覆盖不全 | 中 | T-01, T-05 | 持续补充正则 + 默认 Mock 兜底 |
| 观点相似度计算不准确 | 中 | T-03, T-11, T-17 | 可调节阈值 + 用户反馈迭代 |
| V1 数据兼容性 | 高 | T-05, T-09 | 惰性兼容转换 + 全量回归测试 |
| SVG 走势图兼容 | 低 | T-15 | 仅 30 个数据点，现代浏览器全支持 |
| 前端单文件过大 | 低 | T-13~T-19 | MVP 阶段可接受，后续可拆分组件 |

---

## 十、产出物清单

### 后端新增/修改文件

#### 模块A（后端开发人员A）
| 文件 | 操作 | 任务 |
|------|------|------|
| `backend/app/report_parser.py` | 修改 | T-01, T-02, T-05A |
| `backend/app/storage.py` | 修改（删除+相似度） | T-06A |
| `backend/app/stock_mock.py` | **新增** | T-04, T-07A |
| `backend/app/opinion_analyzer.py` | **新增** | T-03 |
| `backend/app/agent_bp.py` | 修改（股票/删除/对比/详情） | T-07A, T-08A, T-09A, T-11A, T-12A |
| `backend/data/opinion_similarity.json` | **新增** | T-03, T-06A |

#### 模块B（后端开发人员B）
| 文件 | 操作 | 任务 |
|------|------|------|
| `backend/app/storage.py` | 修改（筛选方法） | T-06B |
| `backend/app/report_parser.py` | 修改（兼容层） | T-05B |
| `backend/app/agent_bp.py` | 修改（列表查询+聚合） | T-10B, T-13B |

#### 测试文件
| 文件 | 操作 | 任务 |
|------|------|------|
| `backend/tests/test_report_parser_v2.py` | **新增** | T-20A |
| `backend/tests/test_api_v2.py` | **新增** | T-20A |
| `backend/tests/test_storage_v2.py` | **新增** | T-20A |
| `backend/tests/test_api_knowledge_base.py` | **新增** | T-20B |

### 前端修改文件
| 文件 | 操作 | 任务 |
|------|------|------|
| `frontend/src/App.jsx` | 修改 | T-13~T-19 |
| `frontend/src/App.css` | 修改 | T-13~T-19（新增样式） |

---

> **最后更新**: 2026-04-15  
> **文档版本**: v1.0  
> **关联文档**: spec_function_upgrade/ 全套规格文档（01~14）
