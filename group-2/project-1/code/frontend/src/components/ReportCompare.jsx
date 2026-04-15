/**
 * ReportCompare — 研报对比组件。
 * 支持选择多份研报进行关键参数对比和可视化展示。
 */

import { useState, useEffect, useCallback } from "react";
import { getReportList, compareReports } from "../api/client";

/** 评级标签颜色映射 */
const RATING_COLORS = {
  买入: { bg: "#dcfce7", color: "#166534" },
  增持: { bg: "#dbeafe", color: "#1e40af" },
  中性: { bg: "#fef9c3", color: "#854d0e" },
  减持: { bg: "#fee2e2", color: "#991b1b" },
  卖出: { bg: "#fee2e2", color: "#991b1b" },
};

function getRatingStyle(rating) {
  for (const [key, style] of Object.entries(RATING_COLORS)) {
    if (rating && rating.includes(key)) return style;
  }
  return { bg: "#f3f4f6", color: "#6b7280" };
}

/** 格式化数字 */
function fmt(val) {
  if (val === null || val === undefined || val === "—" || val === "") return "—";
  return val;
}

/** 获取数值用于对比高亮（最大/最小） */
function getNumericVal(val) {
  if (!val || val === "—") return null;
  const n = parseFloat(String(val).replace(/[^\d.-]/g, ""));
  return isNaN(n) ? null : n;
}

function ReportCompare() {
  const [reportList, setReportList] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [compareData, setCompareData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview"); // overview | financial | detail

  // 加载研报列表
  useEffect(() => {
    getReportList()
      .then((data) => setReportList(data.reports || []))
      .catch((e) => setError("加载研报列表失败: " + e.message));
  }, []);

  // 切换选中
  const toggleSelect = useCallback((filename) => {
    setSelectedFiles((prev) => {
      if (prev.includes(filename)) return prev.filter((f) => f !== filename);
      if (prev.length >= 5) return prev;
      return [...prev, filename];
    });
  }, []);

  // 全选/取消全选
  const toggleAll = useCallback(() => {
    if (selectedFiles.length === reportList.length) {
      setSelectedFiles([]);
    } else {
      setSelectedFiles(reportList.slice(0, 5).map((r) => r.filename));
    }
  }, [selectedFiles, reportList]);

  // 执行对比
  const handleCompare = useCallback(async () => {
    if (selectedFiles.length < 2) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await compareReports(selectedFiles);
      setCompareData(data.reports || []);
    } catch (e) {
      setError("对比失败: " + e.message);
    } finally {
      setIsLoading(false);
    }
  }, [selectedFiles]);

  // 清除对比结果，返回选择
  const handleBack = useCallback(() => {
    setCompareData(null);
    setActiveTab("overview");
  }, []);

  // ── 选择区域 ──
  const renderSelector = () => (
    <div className="rc-selector">
      <div className="rc-selector-header">
        <h3>选择研报</h3>
        <div className="rc-selector-actions">
          <button className="btn btn-secondary btn-sm" onClick={toggleAll}>
            {selectedFiles.length === reportList.length ? "取消全选" : "全选"}
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleCompare}
            disabled={selectedFiles.length < 2 || isLoading}
          >
            {isLoading ? "对比中…" : `对比 (${selectedFiles.length})`}
          </button>
        </div>
      </div>
      <div className="rc-report-cards">
        {reportList.map((report) => {
          const selected = selectedFiles.includes(report.filename);
          const rStyle = getRatingStyle(report.rating);
          return (
            <div
              key={report.filename}
              className={`rc-report-card ${selected ? "selected" : ""}`}
              onClick={() => toggleSelect(report.filename)}
            >
              <div className="rc-card-check">
                <input type="checkbox" checked={selected} readOnly />
              </div>
              <div className="rc-card-info">
                <div className="rc-card-title">{report.companyName}</div>
                <div className="rc-card-code">{report.stockCode}</div>
                <div className="rc-card-meta">
                  <span
                    className="rc-rating-badge"
                    style={{ background: rStyle.bg, color: rStyle.color }}
                  >
                    {report.rating || "未知"}
                  </span>
                  <span className="rc-card-org">{report.institution}</span>
                </div>
                <div className="rc-card-prices">
                  <span>目标价 <strong>¥{report.targetPrice}</strong></span>
                  <span>当前价 ¥{report.currentPrice}</span>
                  {report.upside !== null && (
                    <span className={`rc-upside ${report.upside > 0 ? "up" : "down"}`}>
                      {report.upside > 0 ? "↑" : "↓"}{Math.abs(report.upside)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {reportList.length === 0 && !error && (
        <div className="rc-empty">暂无可用研报</div>
      )}
    </div>
  );

  // ── 对比结果标签页 ──
  const renderTabs = () => (
    <div className="rc-tabs">
      {[
        { key: "overview", label: "估值概览" },
        { key: "financial", label: "财务对比" },
        { key: "detail", label: "深度分析" },
      ].map((tab) => (
        <button
          key={tab.key}
          className={`rc-tab ${activeTab === tab.key ? "active" : ""}`}
          onClick={() => setActiveTab(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );

  // ── 估值概览卡片 ──
  const renderOverview = () => {
    if (!compareData) return null;
    return (
      <div className="rc-overview">
        <div className="rc-overview-cards">
          {compareData.map((r) => {
            const rStyle = getRatingStyle(r.rating);
            return (
              <div key={r.filename} className="rc-ov-card">
                <div className="rc-ov-header">
                  <span className="rc-ov-company">{r.companyName}</span>
                  <span className="rc-ov-code">{r.stockCode}</span>
                </div>
                <div className="rc-ov-rating" style={{ background: rStyle.bg, color: rStyle.color }}>
                  {r.rating}
                </div>
                <div className="rc-ov-prices">
                  <div className="rc-ov-price-item">
                    <span className="rc-ov-label">目标价</span>
                    <span className="rc-ov-value">¥{r.targetPrice}</span>
                  </div>
                  <div className="rc-ov-price-item">
                    <span className="rc-ov-label">当前价</span>
                    <span className="rc-ov-value">¥{r.currentPrice}</span>
                  </div>
                  <div className="rc-ov-price-item">
                    <span className="rc-ov-label">上涨空间</span>
                    <span className={`rc-ov-value ${r.upside > 0 ? "positive" : "negative"}`}>
                      {r.upside > 0 ? "+" : ""}{r.upside}%
                    </span>
                  </div>
                </div>
                <div className="rc-ov-meta-grid">
                  <div><span>研发人员</span><strong>{r.rdStaff?.toLocaleString() || "—"}</strong></div>
                  <div><span>专利数</span><strong>{r.patents || "—"}</strong></div>
                  <div><span>资产负债率</span><strong>{r.debtRatio ? r.debtRatio + "%" : "—"}</strong></div>
                  <div><span>现金储备</span><strong>{r.cashBalance ? r.cashBalance + "亿" : "—"}</strong></div>
                </div>
                <div className="rc-ov-institution">
                  {r.institution} · {r.publishDate}
                </div>
              </div>
            );
          })}
        </div>

        {/* 关键指标横向对比条 */}
        <div className="rc-compare-bars">
          <h4>上涨空间对比</h4>
          <div className="rc-bars">
            {compareData.map((r) => {
              const maxUpside = Math.max(...compareData.map(d => d.upside || 0));
              const width = maxUpside > 0 ? ((r.upside || 0) / maxUpside * 100) : 0;
              return (
                <div key={r.filename} className="rc-bar-row">
                  <span className="rc-bar-label">{r.companyName}</span>
                  <div className="rc-bar-track">
                    <div
                      className={`rc-bar-fill ${r.upside > 15 ? "high" : r.upside > 5 ? "mid" : "low"}`}
                      style={{ width: `${Math.max(width, 5)}%` }}
                    />
                  </div>
                  <span className="rc-bar-val">{r.upside}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // ── 财务对比表格 ── 单一汇总表，按指标分组
  const renderFinancial = () => {
    if (!compareData) return null;
    const years = ["2023A", "2024A", "2025E", "2026E", "2027E"];
    const metrics = [
      { key: "revenue", label: "营业收入（亿元）" },
      { key: "revenueGrowth", label: "营收增速（%）" },
      { key: "netProfit", label: "归母净利润（亿元）" },
      { key: "profitGrowth", label: "利润增速（%）" },
      { key: "grossMargin", label: "毛利率（%）" },
      { key: "netMargin", label: "净利率（%）" },
      { key: "eps", label: "EPS（元/股）" },
      { key: "pe", label: "PE（倍）" },
    ];

    // 找出特定指标+年份中最大值的公司索引
    const getBestIdx = (metricKey, year) => {
      let bestIdx = -1;
      let bestVal = -Infinity;
      compareData.forEach((r, i) => {
        const v = getNumericVal(r.financials?.[metricKey]?.[year]);
        if (v !== null && v > bestVal) {
          bestVal = v;
          bestIdx = i;
        }
      });
      return bestIdx;
    };

    return (
      <div className="rc-financial">
        {metrics.map((m) => (
          <div key={m.key} className="rc-fin-section">
            <h4 className="rc-fin-year">{m.label}</h4>
            <table className="rc-fin-table">
              <thead>
                <tr>
                  <th>公司</th>
                  {years.map((y) => (
                    <th key={y}>{y}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {compareData.map((r, i) => (
                  <tr key={r.filename}>
                    <td className="rc-metric-label">{r.companyName}</td>
                    {years.map((y) => {
                      const bestIdx = getBestIdx(m.key, y);
                      return (
                        <td key={y} className={i === bestIdx ? "rc-best" : ""}>
                          {fmt(r.financials?.[m.key]?.[y])}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    );
  };

  // ── 深度分析对比 ──
  const renderDetail = () => {
    if (!compareData) return null;
    return (
      <div className="rc-detail">
        {/* 核心观点对比 */}
        <div className="rc-detail-section">
          <h4>核心观点</h4>
          <div className="rc-detail-grid">
            {compareData.map((r) => (
              <div key={r.filename} className="rc-detail-col">
                <div className="rc-detail-company">{r.companyName}</div>
                <ul className="rc-view-list">
                  {(r.coreViews || []).map((v, i) => (
                    <li key={i}>{v}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* 风险提示对比 */}
        <div className="rc-detail-section">
          <h4>风险提示</h4>
          <div className="rc-detail-grid">
            {compareData.map((r) => (
              <div key={r.filename} className="rc-detail-col">
                <div className="rc-detail-company">{r.companyName}</div>
                <ul className="rc-risk-list">
                  {(r.risks || []).map((v, i) => (
                    <li key={i}>{v}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* 研发实力对比 */}
        <div className="rc-detail-section">
          <h4>研发实力</h4>
          <table className="rc-fin-table">
            <thead>
              <tr>
                <th>指标</th>
                {compareData.map((r) => (
                  <th key={r.filename}>{r.companyName}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="rc-metric-label">研发人员</td>
                {compareData.map((r) => (
                  <td key={r.filename}>{r.rdStaff?.toLocaleString() || "—"}</td>
                ))}
              </tr>
              <tr>
                <td className="rc-metric-label">研发占比</td>
                {compareData.map((r) => (
                  <td key={r.filename}>{r.rdRatio ? r.rdRatio + "%" : "—"}</td>
                ))}
              </tr>
              <tr>
                <td className="rc-metric-label">发明专利</td>
                {compareData.map((r) => (
                  <td key={r.filename}>{r.patents || "—"}</td>
                ))}
              </tr>
              <tr>
                <td className="rc-metric-label">资产负债率</td>
                {compareData.map((r) => (
                  <td key={r.filename}>{r.debtRatio ? r.debtRatio + "%" : "—"}</td>
                ))}
              </tr>
              <tr>
                <td className="rc-metric-label">现金储备（亿元）</td>
                {compareData.map((r) => (
                  <td key={r.filename}>{r.cashBalance || "—"}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="report-compare">
      {renderSelector()}

      {error && <div className="rc-error">{error}</div>}

      {compareData && (
        <div className="rc-results">
          <div className="rc-results-header">
            <div className="rc-results-left">
              <button className="btn btn-secondary btn-sm rc-back-btn" onClick={handleBack}>
                ← 返回重选
              </button>
              <h3>对比结果</h3>
              <span className="rc-results-count">{compareData.length} 份研报</span>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={handleBack} title="关闭对比">
              ✕ 关闭
            </button>
          </div>
          {renderTabs()}
          <div className="rc-results-body">
            {activeTab === "overview" && renderOverview()}
            {activeTab === "financial" && renderFinancial()}
            {activeTab === "detail" && renderDetail()}
          </div>
        </div>
      )}

      {!compareData && !error && selectedFiles.length < 2 && (
        <div className="rc-hint">
          <div className="rc-hint-icon">📊</div>
          <h3>研报对比</h3>
          <p>选择至少 2 份研报，对比关键财务指标、估值水平和核心观点</p>
        </div>
      )}
    </div>
  );
}

export default ReportCompare;
