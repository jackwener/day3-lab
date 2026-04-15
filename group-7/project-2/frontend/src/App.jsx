/**
 * M1-QA 投研问答助手 — React SPA
 * 对齐 spec/06 功能规格说明
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  getCapabilities, getSessions, createSession, deleteSession,
  getRecords, askStream, searchRecords, findSimilar, getStockInfo,
  uploadReport, importReportUrl, getReports, deleteReport,
  compareReports, exportComparison, getSentiment,
} from './api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './App.css';

// ── 股票标签组件 ──
function StockTag({ name, code, onStockClick }) {
  return (
    <span className="stock-tag" onClick={() => onStockClick(code, name)} title={`查看 ${name}(${code})`}>
      {name}({code})
    </span>
  );
}

// ── 回答文本：内嵌股票标签渲染 ──
function AnswerText({ text, stocks, onStockClick }) {
  if (!stocks || stocks.length === 0) return <div className="answer-text markdown-body"><ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown></div>;
  // 替换股票名称/代码为可点击标签
  let parts = [text];
  stocks.forEach(({ name, code }) => {
    const newParts = [];
    parts.forEach((part) => {
      if (typeof part !== 'string') { newParts.push(part); return; }
      const pattern = `${name}(${code})`;
      const idx = part.indexOf(pattern);
      if (idx === -1) { newParts.push(part); return; }
      if (idx > 0) newParts.push(part.slice(0, idx));
      newParts.push(<StockTag key={`${code}-${idx}`} name={name} code={code} onStockClick={onStockClick} />);
      newParts.push(part.slice(idx + pattern.length));
    });
    parts = newParts;
  });
  // When stocks are present, render text parts with markdown and stock tags
  return <div className="answer-text markdown-body">{parts.map((part, idx) => typeof part === 'string' ? <ReactMarkdown key={idx} remarkPlugins={[remarkGfm]}>{part}</ReactMarkdown> : part)}</div>;
}

// ── 来源标签 ──
function SourceBadge({ source, llmUsed }) {
  const map = { copaw: 'CoPaw', bailian: '百炼', demo: '离线演示' };
  const cls = source === 'demo' ? 'badge-gray' : 'badge-blue';
  return <span className={`source-badge ${cls}`}>{map[source] || source}</span>;
}

// ── 相似提问弹窗 ──
function SimilarModal({ records, onViewHistory, onNewAsk, onClose, onRecordClick }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>发现相似历史提问</h3>
        <div className="similar-list">
          {records.map((r, i) => (
            <div key={i} className="similar-item" style={{ cursor: 'pointer' }} onClick={() => onRecordClick?.(r)}>
              <p className="similar-q">Q: {r.query}</p>
              <p className="similar-a">A: {r.answer?.slice(0, 100)}...</p>
              <small>相似度: {(r._similarity * 100).toFixed(0)}%</small>
            </div>
          ))}
        </div>
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onViewHistory}>查看历史</button>
          <button className="btn-primary" onClick={onNewAsk}>发起新提问</button>
        </div>
      </div>
    </div>
  );
}

// ── 股票信息弹窗（含舆情）──
function StockModal({ stockInfo, sentimentData, onClose }) {
  if (!stockInfo) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal stock-modal" onClick={(e) => e.stopPropagation()}>
        <h3>{stockInfo.name}（{stockInfo.code}）</h3>
        <p>{stockInfo.summary}</p>
        {stockInfo.latest_reports?.map((r, i) => (
          <div key={i} className="stock-report">
            <span>{r.title}</span>
            <small>{r.broker} · {r.date}</small>
          </div>
        ))}
        {/* 舆情区块 S7-FE */}
        <div className="sentiment-section">
          <h4>最新舆情</h4>
          {sentimentData?.is_expired && <div className="sentiment-expired">⚠ 数据已过期</div>}
          {!sentimentData || !sentimentData.items || sentimentData.items.length === 0 ? (
            <p className="sentiment-empty">暂无舆情信息</p>
          ) : (
            sentimentData.items.map((item, i) => (
              <div key={i} className="sentiment-card">
                <div className="sentiment-card-header">
                  <strong>{item.title}</strong>
                  <span className={`sentiment-tag sentiment-${item.sentiment || 'neutral'}`}>
                    {item.sentiment === 'positive' ? '正面' : item.sentiment === 'negative' ? '负面' : '中性'}
                  </span>
                </div>
                <p className="sentiment-summary">{item.summary}</p>
                <div className="sentiment-meta">
                  <span>{item.source}</span>
                  <span>{item.published_at}</span>
                </div>
              </div>
            ))
          )}
        </div>
        <button className="btn-secondary" onClick={onClose}>关闭</button>
      </div>
    </div>
  );
}

// ── 研报管理面板 ──
function ReportPanel({ reports, onUpload, onImportUrl, onDelete, onClose, reportUrl, setReportUrl, uploading }) {
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onUpload(file);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) onUpload(file);
    e.target.value = '';
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal report-panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <h3>研报管理</h3>
          <button className="btn-delete" onClick={onClose}>×</button>
        </div>
        {/* 上传区 */}
        <div
          className={`upload-area ${dragOver ? 'drag-over' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input ref={fileInputRef} type="file" accept=".pdf,.html" hidden onChange={handleFileSelect} />
          <p>{uploading ? '上传中…' : '拖拽文件到此处或点击选择'}</p>
          <small>支持 .pdf / .html</small>
        </div>
        {/* URL导入 */}
        <div className="url-import-row">
          <input
            type="text" placeholder="输入研报URL…" value={reportUrl}
            onChange={(e) => setReportUrl(e.target.value)}
          />
          <button className="btn-primary" onClick={() => onImportUrl(reportUrl)} disabled={!reportUrl.trim() || uploading}>导入</button>
        </div>
        {/* 研报列表 */}
        <div className="report-table-wrap">
          <table className="report-table">
            <thead>
              <tr><th>标题</th><th>来源</th><th>格式</th><th>状态</th><th>创建时间</th><th>操作</th></tr>
            </thead>
            <tbody>
              {reports.length === 0 && <tr><td colSpan={6} style={{textAlign:'center',color:'var(--text-secondary)'}}>暂无研报</td></tr>}
              {reports.map((r) => (
                <tr key={r.id}>
                  <td title={r.title}>{r.title}</td>
                  <td>{r.source_type}</td>
                  <td>{r.format}</td>
                  <td>
                    <span className={`status-badge status-${r.status}`}>
                      {r.status === 'done' ? '完成' : r.status === 'parsing' ? '解析中' : '失败'}
                    </span>
                  </td>
                  <td>{r.created_at}</td>
                  <td><button className="btn-delete" onClick={() => onDelete(r.id)}>删除</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── 指标对比面板 ──
function ComparePanel({ reports, onClose, setError: setErr }) {
  const [stockCode, setStockCode] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sourcePopup, setSourcePopup] = useState(null);

  const toggleId = (id) => setSelectedIds((prev) => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleCompare = async () => {
    if (!stockCode.trim() || selectedIds.length < 2) { setErr('请输入股票代码并选择至少2份研报'); return; }
    setLoading(true);
    try {
      const data = await compareReports(stockCode.trim(), selectedIds);
      setResult(data);
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  };

  const handleExport = async () => {
    try {
      await exportComparison(stockCode.trim(), selectedIds);
    } catch (e) { setErr(e.message); }
  };

  const indicators = result?.indicators || [];
  const reportCols = result?.reports || [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal compare-panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <h3>指标对比</h3>
          <button className="btn-delete" onClick={onClose}>×</button>
        </div>
        <div className="compare-inputs">
          <input type="text" placeholder="股票代码，如 600519" value={stockCode} onChange={(e) => setStockCode(e.target.value)} />
          <button className="btn-primary" onClick={handleCompare} disabled={loading}>
            {loading ? '对比中…' : '开始对比'}
          </button>
          {result && <button className="btn-secondary" onClick={handleExport}>导出Excel</button>}
        </div>
        {/* 研报选择 */}
        <div className="compare-report-list">
          {reports.map((r) => (
            <label key={r.id} className="compare-report-check">
              <input type="checkbox" checked={selectedIds.includes(r.report_id)} onChange={() => toggleId(r.report_id)} />
              <span>{r.title}</span>
            </label>
          ))}
        </div>
        {/* 对比结果 */}
        {loading && <div className="compare-loading">加载中…</div>}
        {result && !loading && (
          <div className="compare-table-wrap">
            <table className="compare-table">
              <thead>
                <tr><th>指标</th>{reportCols.map((r, i) => <th key={i}>{r.title}</th>)}</tr>
              </thead>
              <tbody>
                {indicators.map((ind, ri) => (
                  <tr key={ri}>
                    <td className="indicator-name">{ind.name}</td>
                    {ind.values.map((v, ci) => (
                      <td key={ci} className="compare-cell" onClick={() => v.source_text && setSourcePopup({ indicator: ind.name, report: reportCols[ci]?.title, text: v.source_text })}>
                        {v.value ?? '-'}
                        {v.source_text && <span className="has-source"> ◉</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {/* 原文溯源弹窗 */}
        {sourcePopup && (
          <div className="source-popup" onClick={() => setSourcePopup(null)}>
            <div className="source-popup-inner" onClick={(e) => e.stopPropagation()}>
              <h4>{sourcePopup.indicator} — {sourcePopup.report}</h4>
              <p>{sourcePopup.text}</p>
              <button className="btn-secondary" onClick={() => setSourcePopup(null)}>关闭</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  // ── 状态 ── 对齐 spec/06 §7
  const [caps, setCaps] = useState({});
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [records, setRecords] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [streamingAnswer, setStreamingAnswer] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [similarRecords, setSimilarRecords] = useState(null);
  const [stockInfo, setStockInfo] = useState(null);
  const [openStockCodes, setOpenStockCodes] = useState(new Set()); // US-004 AC-004-02
  const messagesEndRef = useRef(null);

  // ── 新增状态：研报管理 / 对比 / 舆情 ──
  const [showReportPanel, setShowReportPanel] = useState(false);
  const [reports, setReports] = useState([]);
  const [reportUrl, setReportUrl] = useState('');
  const [reportUploading, setReportUploading] = useState(false);
  const [showComparePanel, setShowComparePanel] = useState(false);
  const [sentimentData, setSentimentData] = useState(null);
  const [uploadedReport, setUploadedReport] = useState(null); // 刚上传成功的研报（触发确认弹窗）

  // ── 初始化：加载能力 + 会话列表 ──
  useEffect(() => {
    getCapabilities().then(setCaps).catch(() => {});
    loadSessions();
  }, []);

  // ── 自动滚动到底部 ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [records, streamingAnswer]);

  const loadSessions = async () => {
    try {
      const list = await getSessions();
      setSessions(list);
    } catch (e) { setError(e.message); }
  };

  const loadRecords = async (sessionId) => {
    try {
      const list = await getRecords(sessionId);
      setRecords(list);
    } catch (e) { setError(e.message); }
  };

  // ── 会话操作 ──
  const handleNewSession = async () => {
    try {
      const s = await createSession();
      setSessions((prev) => [s, ...prev]);
      setCurrentSession(s);
      setRecords([]);
      setSearchResults(null);
    } catch (e) { setError(e.message); }
  };

  const handleDeleteSession = async (sid, e) => {
    e.stopPropagation();
    if (!confirm('确定删除此会话？删除后不可恢复。')) return;
    try {
      await deleteSession(sid);
      setSessions((prev) => prev.filter((s) => s.session_id !== sid));
      if (currentSession?.session_id === sid) {
        setCurrentSession(null);
        setRecords([]);
      }
    } catch (e) { setError(e.message); }
  };

  const handleSelectSession = (s) => {
    setCurrentSession(s);
    setSearchResults(null);
    loadRecords(s.session_id);
  };

  // ── 发送问答（SSE 流式）── 对齐 spec/06 §4.1
  const handleSend = useCallback(async (forceNew = false) => {
    if (!query.trim() || !currentSession || loading) return;
    const q = query.trim();
    setQuery('');
    setError(null);

    // 相似性检测（对齐 US-003 AC-003-02）
    if (!forceNew) {
      try {
        const sim = await findSimilar(q);
        if (sim.has_similar && sim.similar_records.length > 0) {
          setSimilarRecords({ query: q, records: sim.similar_records });
          return;
        }
      } catch { /* 忽略，继续发送 */ }
    }

    doSend(q);
  }, [query, currentSession, loading]);

  const doSend = (q, sessionId) => {
    const sid = sessionId || currentSession?.session_id;
    if (!sid) return;
    setLoading(true);
    setStreamingAnswer('');
    // 添加临时问题卡片
    setRecords((prev) => [...prev, { query: q, answer: null, _pending: true }]);

    askStream(q, sid, {
      onChunk: (text) => setStreamingAnswer((prev) => prev + text),
      onDone: (data) => {
        setStreamingAnswer('');
        setLoading(false);
        // 替换临时卡片为完整记录
        setRecords((prev) => {
          const copy = [...prev];
          const idx = copy.findIndex((r) => r._pending);
          if (idx >= 0) copy[idx] = { ...data, query: q };
          return copy;
        });
        // 刷新会话列表（标题可能更新）
        loadSessions();
      },
      onError: (msg) => {
        setLoading(false);
        setStreamingAnswer('');
        setError(msg);
        setRecords((prev) => prev.filter((r) => !r._pending));
      },
    });
  };

  // ── 搜索 ── 对齐 spec/06 §4.4
  const handleSearch = async () => {
    if (!searchKeyword.trim()) return;
    try {
      const results = await searchRecords(searchKeyword.trim());
      setSearchResults(results);
    } catch (e) { setError(e.message); }
  };

  // ── 股票点击 ── 对齐 spec/06 §4.3, US-004 AC-004-02
  const handleStockClick = async (code, name) => {
    setSentimentData(null);
    const fetchSentiment = async () => {
      try { const s = await getSentiment(code); setSentimentData(s); } catch { /* ignore */ }
    };
    if (openStockCodes.has(code)) {
      try {
        const info = await getStockInfo(code);
        setStockInfo(info);
        fetchSentiment();
      } catch (e) { setError(e.message); }
      return;
    }
    try {
      const info = await getStockInfo(code);
      setStockInfo(info);
      setOpenStockCodes((prev) => new Set(prev).add(code));
      fetchSentiment();
    } catch (e) { setError(e.message); }
  };

  // ── 研报管理操作 ──
  const loadReports = async () => {
    try {
      const data = await getReports();
      setReports(data.reports || []);
    } catch (e) { setError(e.message); }
  };

  // ── 研报上传成功后自动创建会话并发起问答 ──
  const handleReportAutoAsk = async (report) => {
    if (!report || (report.status !== 'done' && !report.report_id)) return;
    // 1. 关闭研报管理面板
    setShowReportPanel(false);
    // 2. 自动创建新会话（标题为研报标题）
    try {
      const session = await createSession(report.title || '研报分析');
      setSessions((prev) => [session, ...prev]);
      setCurrentSession(session);
      setRecords([]);
      setSearchResults(null);
      // 3. 自动发起问答
      const autoQuery = `请总结这篇研报的关键信息，包括：核心观点、投资评级、目标价、关键财务指标、风险提示。研报标题：${report.title || '未命名研报'}`;
      setQuery(autoQuery);
      // 直接用 session.session_id 发送，避免 state 异步问题
      setTimeout(() => doSend(autoQuery, session.session_id), 0);
    } catch (e) { setError(e.message); }
  };

  const handleUploadReport = async (file) => {
    setReportUploading(true);
    try {
      const result = await uploadReport(file);
      await loadReports();
      // 上传成功且解析完成，弹出确认提示
      if (result && result.status === 'done') {
        setUploadedReport(result);
      }
    } catch (e) { setError(e.message); } finally { setReportUploading(false); }
  };

  const handleImportUrl = async (url) => {
    if (!url.trim()) return;
    setReportUploading(true);
    try {
      const result = await importReportUrl(url.trim());
      setReportUrl('');
      await loadReports();
      // URL导入成功且解析完成，弹出确认提示
      if (result && result.status === 'done') {
        setUploadedReport(result);
      }
    } catch (e) { setError(e.message); } finally { setReportUploading(false); }
  };

  const handleDeleteReport = async (id) => {
    if (!confirm('确定删除此研报？')) return;
    try {
      await deleteReport(id);
      await loadReports();
    } catch (e) { setError(e.message); }
  };

  const openReportPanel = () => { setShowReportPanel(true); loadReports(); };
  const openComparePanel = () => { setShowComparePanel(true); loadReports(); };

  // ── 能力芯片 ──
  const renderCapChips = () => {
    if (caps.copaw_configured) return <span className="cap-chip cap-active">CoPaw 桥接</span>;
    if (caps.bailian_configured) return <span className="cap-chip cap-active">百炼</span>;
    return <span className="cap-chip cap-demo">离线演示</span>;
  };

  // ── 渲染 ──
  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <h1>投研问答助手</h1>
        <div className="header-chips">
          <button className="btn-header" onClick={openReportPanel}>研报管理</button>
          <button className="btn-header" onClick={openComparePanel}>指标对比</button>
          {renderCapChips()}
        </div>
      </header>

      <div className="main-layout">
        {/* Sidebar */}
        <aside className="sidebar">
          <button className="btn-new-session" onClick={handleNewSession}>+ 新建会话</button>
          <div className="search-box">
            <input
              type="text" placeholder="搜索历史记录…" value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button onClick={handleSearch} className="btn-search">🔍</button>
          </div>
          <div className="session-list">
            {sessions.map((s) => (
              <div
                key={s.session_id}
                className={`session-item ${currentSession?.session_id === s.session_id ? 'active' : ''}`}
                onClick={() => handleSelectSession(s)}
              >
                <span className="session-title">{s.title}</span>
                <span className="session-count">{s.query_count}条</span>
                <button className="btn-delete" onClick={(e) => handleDeleteSession(s.session_id, e)}>×</button>
              </div>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <main className="content">
          {error && <div className="error-bar" onClick={() => setError(null)}>{error} ×</div>}

          {/* 搜索结果视图 */}
          {searchResults && (
            <div className="search-results">
              <div className="search-header">
                <h3>搜索结果："{searchKeyword}" ({searchResults.length}条)</h3>
                <button className="btn-secondary" onClick={() => setSearchResults(null)}>返回</button>
              </div>
              {searchResults.map((r, i) => (
                <div key={i} className="record-card search-result-card">
                  <div className="record-q">Q: {r.query}</div>
                  <div className="record-a markdown-body"><ReactMarkdown remarkPlugins={[remarkGfm]}>{r.answer?.slice(0, 200) || ''}</ReactMarkdown></div>
                  <small>{r.timestamp}</small>
                </div>
              ))}
            </div>
          )}

          {/* 对话区 */}
          {!searchResults && (
            <>
              <div className="messages">
                {!currentSession && (
                  <div className="empty-state">
                    <h2>请创建或选择一个会话开始</h2>
                    <p>点击左侧"+ 新建会话"开始对话</p>
                  </div>
                )}
                {currentSession && records.length === 0 && !loading && (
                  <div className="empty-state">
                    <h2>新会话</h2>
                    <p>请输入研报相关问题，如：某公司的最新评级和目标价</p>
                  </div>
                )}
                {records.map((r, i) => (
                  <div key={i} className="record-card">
                    <div className="record-q">
                      <span className="label">Q</span> {r.query}
                    </div>
                    {r._pending ? (
                      <div className="record-a streaming">
                        <span className="label">A</span>
                        {streamingAnswer ? (
                          <span className="markdown-body"><ReactMarkdown remarkPlugins={[remarkGfm]}>{streamingAnswer}</ReactMarkdown><span className="cursor">▌</span></span>
                        ) : (
                          <span className="typing">回答中…</span>
                        )}
                      </div>
                    ) : r.answer ? (
                      <div className="record-a">
                        <span className="label">A</span>
                        <AnswerText text={r.answer} stocks={r.stocks} onStockClick={handleStockClick} />
                        <div className="record-meta">
                          <SourceBadge source={r.answer_source} llmUsed={r.llm_used} />
                          {r.response_time_ms != null && <small>{r.response_time_ms}ms</small>}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* 输入区 */}
              {currentSession && (
                <div className="input-area">
                  <textarea
                    rows={3} value={query} placeholder="请输入您的问题..."
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    disabled={loading}
                  />
                  <div className="input-actions">
                    <button className="btn-primary" onClick={() => handleSend()} disabled={loading || !query.trim()}>
                      {loading ? '发送中…' : '发送'}
                    </button>
                    <button className="btn-secondary" onClick={() => setQuery('')} disabled={loading}>清空</button>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* 相似提问弹窗 */}
      {similarRecords && (
        <SimilarModal
          records={similarRecords.records}
          onViewHistory={() => {
            const firstRecord = similarRecords.records[0];
            setSimilarRecords(null);
            if (firstRecord?.session_id) {
              const targetSession = sessions.find(s => s.session_id === firstRecord.session_id);
              if (targetSession) {
                setCurrentSession(targetSession);
                setSearchResults(null);
                loadRecords(targetSession.session_id);
              }
            }
          }}
          onNewAsk={() => { const q = similarRecords.query; setSimilarRecords(null); setQuery(q); setTimeout(() => doSend(q), 0); }}
          onClose={() => setSimilarRecords(null)}
          onRecordClick={(record) => {
            setSimilarRecords(null);
            if (record?.session_id) {
              const targetSession = sessions.find(s => s.session_id === record.session_id);
              if (targetSession) {
                setCurrentSession(targetSession);
                setSearchResults(null);
                loadRecords(targetSession.session_id);
              }
            }
          }}
        />
      )}

      {/* 股票信息弹窗（含舆情）*/}
      {stockInfo && <StockModal stockInfo={stockInfo} sentimentData={sentimentData} onClose={() => { setStockInfo(null); setSentimentData(null); }} />}

      {/* 研报管理面板 */}
      {showReportPanel && (
        <ReportPanel
          reports={reports} onUpload={handleUploadReport} onImportUrl={handleImportUrl}
          onDelete={handleDeleteReport} onClose={() => setShowReportPanel(false)}
          reportUrl={reportUrl} setReportUrl={setReportUrl} uploading={reportUploading}
        />
      )}

      {/* 研报解析完成确认弹窗 */}
      {uploadedReport && (
        <div className="report-confirm-overlay">
          <div className="report-confirm-dialog">
            <p>✅ 研报「{uploadedReport.title}」解析完成</p>
            <p>是否现在查看研报关键信息？</p>
            <div className="report-confirm-buttons">
              <button className="btn-view" onClick={() => {
                const report = uploadedReport;
                setUploadedReport(null);
                handleReportAutoAsk(report);
              }}>查看</button>
              <button className="btn-later" onClick={() => {
                setUploadedReport(null);
                loadReports();
              }}>稍后</button>
            </div>
          </div>
        </div>
      )}

      {/* 指标对比面板 */}
      {showComparePanel && (
        <ComparePanel reports={reports} onClose={() => setShowComparePanel(false)} setError={setError} />
      )}
    </div>
  );
}
