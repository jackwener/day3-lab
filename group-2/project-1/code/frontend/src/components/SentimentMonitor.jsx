import { useState, useEffect, useCallback } from "react";
import { getNews } from "../api/client";

// ── 优先级配置 ──
const PRIORITY_CONFIG = {
  urgent: { label: "紧急预警", color: "#dc2626", bg: "#fef2f2", border: "#fecaca", icon: "🔴", badge: "URGENT" },
  high:   { label: "重要关注", color: "#d97706", bg: "#fffbeb", border: "#fde68a", icon: "🟡", badge: "HOT" },
  medium: { label: "值得关注", color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe", icon: "🔵", badge: "INFO" },
  normal: { label: "一般资讯", color: "#64748b", bg: "#f8fafc", border: "#e2e8f0", icon: "⚪", badge: "" },
};

const PRIORITY_TABS = ["全部", "紧急预警", "重要关注", "值得关注", "一般资讯"];

// 时间格式化
function formatTime(isoStr) {
  try {
    const d = new Date(isoStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "刚刚";
    if (diffMin < 60) return `${diffMin}分钟前`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}小时前`;
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  } catch { return ""; }
}

// 热度条组件
function HeatBar({ score }) {
  const pct = Math.max(5, Math.min(100, score));
  const color =
    pct >= 80 ? "#dc2626" :
    pct >= 60 ? "#d97706" :
    pct >= 40 ? "#2563eb" : "#94a3b8";
  return (
    <div className="sm-heat-bar" title={`热度 ${pct}`}>
      <div className="sm-heat-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

// 新闻卡片
function NewsCard({ item, highlight }) {
  const p = item.priority || { level: "normal", label: "一般资讯", heatScore: 20 };
  const cfg = PRIORITY_CONFIG[p.level] || PRIORITY_CONFIG.normal;
  return (
    <div
      className={`sm-card sm-card-${p.level} ${highlight ? "sm-card-highlight" : ""}`}
      style={{ borderColor: highlight ? cfg.color : undefined }}
    >
      {/* 卡片头部 */}
      <div className="sm-card-header">
        <span className="sm-priority-icon" title={cfg.label}>{cfg.icon}</span>
        <span
          className="sm-priority-badge"
          style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}
        >
          {p.label}
        </span>
        <span className="sm-source-chip">{item.sourceName}</span>
        <span className="sm-card-time">{formatTime(item.publishedAt)}</span>
      </div>

      {/* 标题 */}
      <a
        className="sm-card-title"
        href={item.url !== "#" ? item.url : undefined}
        target={item.url !== "#" ? "_blank" : undefined}
        rel="noopener noreferrer"
        onClick={item.url === "#" ? (e) => e.preventDefault() : undefined}
      >
        {item.title}
      </a>

      {/* 摘要 */}
      {item.summary && item.summary !== item.title && (
        <p className="sm-card-summary">{item.summary}</p>
      )}

      {/* 底部：热度 + 标签 */}
      <div className="sm-card-footer">
        <div className="sm-heat-wrap">
          <span className="sm-heat-label">热度</span>
          <HeatBar score={p.heatScore || 20} />
          <span className="sm-heat-val">{Math.round(p.heatScore || 20)}</span>
        </div>
        {item.tags && item.tags.length > 0 && (
          <div className="sm-tags">
            {item.tags.map((tag) => (
              <span key={tag} className="sm-tag">{tag}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// 顶部预警面板（仅展示 urgent/high）
function AlertPanel({ items }) {
  const alerts = items.filter((i) =>
    i.priority?.level === "urgent" || i.priority?.level === "high"
  ).slice(0, 3);
  if (alerts.length === 0) return null;

  return (
    <div className="sm-alert-panel">
      <div className="sm-alert-header">
        <span className="sm-alert-dot" />
        <span className="sm-alert-title">重点预警</span>
        <span className="sm-alert-sub">以下资讯需优先关注</span>
      </div>
      <div className="sm-alert-list">
        {alerts.map((item) => {
          const cfg = PRIORITY_CONFIG[item.priority.level];
          return (
            <a
              key={item.id}
              className="sm-alert-item"
              href={item.url !== "#" ? item.url : undefined}
              target="_blank"
              rel="noopener noreferrer"
              onClick={item.url === "#" ? (e) => e.preventDefault() : undefined}
            >
              <span className="sm-alert-icon">{cfg.icon}</span>
              <span className="sm-alert-text">{item.title}</span>
              <span className="sm-alert-time">{formatTime(item.publishedAt)}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}

// ── 主组件 ──
export default function SentimentMonitor() {
  const [newsData, setNewsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("全部");
  const [keyword, setKeyword] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const fetchNews = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await getNews(forceRefresh);
      setNewsData(data);
    } catch (e) {
      setError(e.message || "获取新闻失败");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNews(false);
    const timer = setInterval(() => fetchNews(false), 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, [fetchNews]);

  const allItems = newsData?.items || [];

  // 筛选
  const filteredItems = allItems.filter((item) => {
    const tabMatch =
      activeTab === "全部" ||
      (item.priority?.label === activeTab);
    const kwMatch =
      !keyword ||
      item.title.toLowerCase().includes(keyword.toLowerCase()) ||
      item.summary?.toLowerCase().includes(keyword.toLowerCase()) ||
      item.tags?.some((t) => t.toLowerCase().includes(keyword.toLowerCase()));
    return tabMatch && kwMatch;
  });

  // 统计各优先级数量
  const tabCounts = { 全部: allItems.length };
  allItems.forEach((item) => {
    const label = item.priority?.label || "一般资讯";
    tabCounts[label] = (tabCounts[label] || 0) + 1;
  });

  // 找出紧急/重要条目用于 alert panel（不受筛选影响）
  const alertItems = allItems.filter(
    (i) => i.priority?.level === "urgent" || i.priority?.level === "high"
  );

  return (
    <div className="sentiment-monitor">
      {/* ── 工具栏 ── */}
      <div className="sm-toolbar">
        <div className="sm-toolbar-left">
          <h2 className="sm-title">📡 舆情监控</h2>
          {newsData && (
            <div className="sm-meta">
              {newsData.isMock
                ? <span className="sm-badge sm-badge-mock">演示数据</span>
                : <span className="sm-badge sm-badge-live">● 实时</span>
              }
              <span className="sm-meta-text">{allItems.length} 条</span>
              <span className="sm-meta-sep">·</span>
              <span className="sm-meta-text">
                更新 {newsData.fetchedAt ? formatTime(newsData.fetchedAt) : "--"}
              </span>
            </div>
          )}
        </div>
        <div className="sm-toolbar-right">
          <div className="sm-search-box">
            <span className="sm-search-icon">🔍</span>
            <input
              className="sm-search-input"
              type="text"
              placeholder="搜索关键词…"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
            {keyword && (
              <button className="sm-search-clear" onClick={() => setKeyword("")}>✕</button>
            )}
          </div>
          <button
            className={`sm-refresh-btn ${refreshing ? "sm-refreshing" : ""}`}
            onClick={() => fetchNews(true)}
            disabled={refreshing}
          >
            {refreshing ? "刷新中…" : "↺ 刷新"}
          </button>
        </div>
      </div>

      {/* ── 重点预警面板 ── */}
      {!loading && alertItems.length > 0 && (
        <AlertPanel items={alertItems} />
      )}

      {/* ── 优先级 Tab ── */}
      <div className="sm-priority-tabs">
        {PRIORITY_TABS.map((tab) => {
          const levelEntry = Object.entries(PRIORITY_CONFIG).find(([, v]) => v.label === tab);
          const cfg = levelEntry ? levelEntry[1] : null;
          return (
            <button
              key={tab}
              className={`sm-ptab ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
              style={activeTab === tab && cfg ? {
                borderColor: cfg.color,
                color: cfg.color,
                background: cfg.bg,
              } : {}}
            >
              {cfg ? <span>{cfg.icon} </span> : null}
              {tab}
              <span className="sm-ptab-count">{tabCounts[tab] || 0}</span>
            </button>
          );
        })}
      </div>

      {/* ── 内容区 ── */}
      <div className="sm-content">
        {loading && (
          <div className="sm-state-box">
            <div className="sm-spinner" />
            <span>正在获取最新资讯…</span>
          </div>
        )}
        {error && !loading && (
          <div className="sm-state-box sm-state-error">
            <span style={{ fontSize: 28 }}>⚠️</span>
            <div>
              <p style={{ fontWeight: 700, margin: "0 0 4px" }}>获取失败</p>
              <p style={{ margin: 0, fontSize: 13 }}>{error}</p>
            </div>
            <button className="sm-refresh-btn" onClick={() => fetchNews(false)}>重试</button>
          </div>
        )}
        {!loading && !error && filteredItems.length === 0 && (
          <div className="sm-state-box">
            <span style={{ fontSize: 32 }}>🔍</span>
            <p>暂无符合条件的资讯</p>
            {keyword && (
              <button className="sm-refresh-btn" onClick={() => setKeyword("")}>清除搜索</button>
            )}
          </div>
        )}
        {!loading && !error && filteredItems.length > 0 && (
          <div className="sm-news-list">
            {filteredItems.map((item) => (
              <NewsCard
                key={item.id}
                item={item}
                highlight={item.priority?.level === "urgent"}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── 数据源状态 ── */}
      {newsData?.sources && (
        <div className="sm-sources-bar">
          <span className="sm-sources-label">数据源：</span>
          {newsData.sources.map((s) => (
            <span
              key={s.name}
              className={`sm-src ${s.status === "ok" ? "sm-src-ok" : "sm-src-err"}`}
              title={s.status === "ok" ? `${s.count} 条` : s.error}
            >
              {s.status === "ok" ? "●" : "○"} {s.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
