# 路由模块集成说明

在 server.js 中添加以下内容即可挂载所有路由模块：

```js
// 在 server.js 顶部 require 区域添加：
const compareRouter = require('./routes/compare');
const sentimentRouter = require('./routes/sentiment');

// 在已有路由定义之后、app.listen() 之前添加：
app.use('/api/v1/agent', compareRouter);
app.use('/api/v1/agent', sentimentRouter);
```

---

## compare 路由（指标对比与 Excel 导出）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/agent/compare` | 指标对比（返回 JSON） |
| POST | `/api/v1/agent/compare/export` | 指标对比 Excel 导出（返回 .xlsx 文件流） |

请求体格式：
```json
{
  "stock_code": "600519",
  "report_ids": ["rpt_xxx", "rpt_yyy"]
}
```

---

## sentiment 路由（舆情与拉取配置）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/agent/stock/:code/sentiment` | 舆情查询（24h缓存） |
| GET | `/api/v1/agent/reports/fetch-config` | AI拉取配置查询 |
| POST | `/api/v1/agent/reports/fetch-config` | 更新/新增AI拉取配置 |

---

### 注意事项

- 各路由模块内部自包含工具函数，不依赖 server.js 导出
- compare 接口在找不到匹配研报时会自动返回 Demo 模拟数据
- `exceljs` 已在 package.json 中声明，无需额外安装
