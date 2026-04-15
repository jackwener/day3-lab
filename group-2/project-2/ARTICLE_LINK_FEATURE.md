# 基金视点文章跳转功能说明

## 功能概述

为基金视点模块的文章添加了点击跳转到原文的功能。用户点击文章标题或"阅读全文"按钮后，会在新标签页中打开原文链接。

## 实现细节

### 后端改动

#### 1. `providers/news_provider.py`
- 在返回的文章数据中添加 `original_url` 字段
- 从 AkShare 的 `ak.stock_news_em()` 获取的 `新闻链接` 字段映射到 `original_url`

```python
articles.append({
    ...
    "original_url": row.get("新闻链接", ""),  # 添加原文链接
})
```

#### 2. `repositories/mock_data.py`
- 为 Mock 数据的所有文章添加 `original_url` 字段（值为空字符串）
- 保持数据结构一致性

### 前端改动

#### `frontend/src/pages/InsightsPage.tsx`

##### 1. 更新 Article 接口
```typescript
interface Article {
  ...
  originalUrl?: string  // 原文链接
}
```

##### 2. 数据映射
```typescript
const list = (res.list || []).map((a: any, i: number) => ({
  ...
  originalUrl: a.original_url || '',  // 添加原文链接
}))
```

##### 3. 点击处理函数
```typescript
const handleArticleClick = (article: Article) => {
  if (article.originalUrl) {
    // 有原文链接，打开新标签页
    window.open(article.originalUrl, '_blank', 'noopener,noreferrer')
  } else {
    // 没有原文链接，不做处理
    console.log('该文章暂无原文链接')
  }
}
```

##### 4. 可点击区域

**置顶文章（头条）：**
- ✅ 标题可点击
- ✅ "阅读全文"按钮可点击
- 📍 无链接时按钮禁用

**文章列表：**
- ✅ 标题可点击
- 🎨 有链接时标题显示蓝色，鼠标指针为手型
- 🎨 无链接时标题颜色正常，鼠标指针为默认

**热门文章侧边栏：**
- ✅ 整个文章项可点击
- 🎨 有链接时正常显示，无链接时降低透明度

## 用户体验

### 有原文链接的文章
1. 标题显示为蓝色（#1677ff）
2. 鼠标悬停时显示手型指针
3. 点击后在新标签页打开原文
4. "阅读全文"按钮可点击

### 无原文链接的文章（Mock 数据）
1. 标题显示为默认颜色
2. 鼠标悬停时显示默认指针
3. 点击无反应（控制台输出提示）
4. "阅读全文"按钮显示为禁用状态

## 安全性

使用 `window.open()` 时添加了安全参数：
- `_blank`: 在新标签页打开
- `noopener`: 防止新页面通过 `window.opener` 访问原页面
- `noreferrer`: 不发送 Referer 头，保护隐私

## 示例数据

### 真实数据（有链接）
```json
{
  "title": "基金回报榜：72只基金昨日回报超3%",
  "original_url": "http://finance.eastmoney.com/a/202604143704129550.html"
}
```

### Mock 数据（无链接）
```json
{
  "title": "2025年Q2基金市场展望：结构性机会仍在",
  "original_url": ""
}
```

## 测试验证

### 测试场景
1. ✅ 点击有链接的真实文章 → 新标签页打开原文
2. ✅ 点击无链接的 Mock 文章 → 无反应
3. ✅ 置顶文章标题点击 → 正常跳转
4. ✅ 置顶文章"阅读全文"按钮 → 正常跳转
5. ✅ 列表文章标题点击 → 正常跳转
6. ✅ 热门文章侧边栏点击 → 正常跳转

## 后续优化方向

1. 为 Mock 文章添加模拟详情页面
2. 添加文章阅读历史记录
3. 支持文章收藏功能
4. 添加文章分享功能
5. 优化移动端点击体验
