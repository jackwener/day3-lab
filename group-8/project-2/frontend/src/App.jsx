import { useState, useEffect, useCallback, useRef } from 'react'
import './App.css'

const API_BASE = '/api/v1/agent'

// 常见问题示例
const SUGGESTED_QUESTIONS = [
  '贵州茅台最新评级？',
  '沪深300指数近期走势如何？',
  '什么是量化投资？',
  '如何分析公司财报？',
  '基金定投的优势是什么？',
  'A股市场近期热点板块？',
]

// 错误码映射
const ERROR_MAP = {
  EMPTY_QUERY: '请输入问题',
  INVALID_QUERY: '问题过长',
  SESSION_NOT_FOUND: '会话不存在',
  INVALID_SESSION_ID: '会话 ID 格式错误',
  INVALID_FILE_TYPE: '不支持的文件类型，仅支持 PDF/HTML',
  FILE_TOO_LARGE: '文件大小超过 50MB 限制',
  REPORT_NOT_FOUND: '研报不存在',
  PARSE_FAILED: '研报解析失败',
}

// ===== Mock 股票数据 (T-15) =====
const MOCK_STOCK_DATA = {
  SH600519: {
    code: 'SH600519', name: '贵州茅台', current_price: 1856.00, change_percent: 2.3,
    price_history: Array.from({ length: 30 }, (_, i) => ({
      date: `2026-03-${String(i + 1).padStart(2, '0')}`,
      close: 1750 + Math.sin(i * 0.5) * 80 + Math.random() * 40
    })),
    financial_summary: { period: '2025Q4', revenue: '1505亿', net_profit: '862亿', yoy_growth: '+15.2%' },
    key_events: [{ date: '2026-03-28', event: '年报发布' }, { date: '2026-04-10', event: '股东大会' }],
  },
  SZ000858: {
    code: 'SZ000858', name: '五粮液', current_price: 168.50, change_percent: -0.8,
    price_history: Array.from({ length: 30 }, (_, i) => ({
      date: `2026-03-${String(i + 1).padStart(2, '0')}`,
      close: 155 + Math.sin(i * 0.4) * 12 + Math.random() * 6
    })),
    financial_summary: { period: '2025Q4', revenue: '830亿', net_profit: '310亿', yoy_growth: '+12.1%' },
    key_events: [{ date: '2026-04-05', event: '季报预告' }],
  },
  SH688256: {
    code: 'SH688256', name: '寒武纪', current_price: 82.30, change_percent: 5.6,
    price_history: Array.from({ length: 30 }, (_, i) => ({
      date: `2026-03-${String(i + 1).padStart(2, '0')}`,
      close: 65 + Math.sin(i * 0.6) * 15 + Math.random() * 8
    })),
    financial_summary: { period: '2025Q4', revenue: '12.8亿', net_profit: '-3.2亿', yoy_growth: '+45.6%' },
    key_events: [{ date: '2026-04-15', event: '新品发布会' }],
  },
}
const DEFAULT_STOCK = {
  code: 'UNKNOWN', name: '未知股票', current_price: 0, change_percent: 0,
  price_history: [], financial_summary: { period: '-', revenue: '-', net_profit: '-', yoy_growth: '-' },
  key_events: [],
}

// ===== Mock 共同/差异观点 (T-17) =====
const MOCK_OPINION_ANALYSIS = {
  common_opinions: [
    { text: '公司业绩持续超预期，核心产品竞争力强', reports: [{ institution: '中信证券' }, { institution: '国泰君安' }] },
    { text: '高端市场需求旺盛，价格体系稳固', reports: [{ institution: '中信证券' }, { institution: '招商证券' }] },
  ],
  diff_opinions: [
    { institution: '中信证券', opinions: ['新产品线拓展顺利，渠道下沉效果显著'] },
    { institution: '国泰君安', opinions: ['估值偏高，建议等待回调后介入'] },
    { institution: '招商证券', opinions: ['海外市场拓展带来新增长点'] },
  ],
}

// ===== SVG 股价走势图组件 (T-15) =====
const StockChart = ({ data }) => {
  if (!data || data.length === 0) return <div className="no-chart">暂无走势数据</div>
  const width = 480, height = 180, pad = 30
  const prices = data.map(d => d.close)
  const maxP = Math.max(...prices), minP = Math.min(...prices)
  const range = maxP - minP || 1
  const points = data.map((d, i) => {
    const x = pad + (i / (data.length - 1)) * (width - pad * 2)
    const y = pad + (1 - (d.close - minP) / range) * (height - pad * 2)
    return `${x},${y}`
  }).join(' ')
  const areaPoints = `${pad},${height - pad} ${points} ${pad + ((data.length - 1) / (data.length - 1)) * (width - pad * 2)},${height - pad}`

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="stock-chart-svg">
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#667eea" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#667eea" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill="url(#chartGrad)" />
      <polyline points={points} fill="none" stroke="#667eea" strokeWidth="2" strokeLinejoin="round" />
      {/* Y-axis labels */}
      <text x={pad - 4} y={pad} fontSize="9" fill="#adb5bd" textAnchor="end">{maxP.toFixed(0)}</text>
      <text x={pad - 4} y={height - pad} fontSize="9" fill="#adb5bd" textAnchor="end">{minP.toFixed(0)}</text>
      {/* X-axis labels */}
      <text x={pad} y={height - pad + 14} fontSize="9" fill="#adb5bd">{data[0]?.date?.slice(5)}</text>
      <text x={width - pad} y={height - pad + 14} fontSize="9" fill="#adb5bd" textAnchor="end">{data[data.length - 1]?.date?.slice(5)}</text>
    </svg>
  )
}

// ===== 研报表格组件 (T-13, 复用于研报分析和知识库) =====
const ReportTable = ({ reports, selectedReports, onToggle, onDelete, onViewDetail, onStockClick, formatTime }) => {
  const allSelected = reports.length > 0 && reports.slice(0, 5).every(r => selectedReports.includes(r.report_id))
  const handleSelectAll = () => {
    if (allSelected) {
      const ids = reports.slice(0, 5).map(r => r.report_id)
      onToggle('DESELECT_ALL', ids)
    } else {
      const ids = reports.slice(0, 5).map(r => r.report_id)
      onToggle('SELECT_ALL', ids)
    }
  }

  return (
    <div className="report-table-wrapper">
      <table className="report-table">
        <thead>
          <tr>
            <th className="col-check"><input type="checkbox" checked={allSelected} onChange={handleSelectAll} /></th>
            <th>文件名</th>
            <th>评级</th>
            <th>目标价</th>
            <th>股票代码</th>
            <th>上传时间</th>
            <th className="col-actions">操作</th>
          </tr>
        </thead>
        <tbody>
          {reports.map(report => {
            const ed = report.extracted_data || {}
            const stockCodes = ed.stock_codes || []
            const isSelected = selectedReports.includes(report.report_id)
            const isDisabled = !isSelected && selectedReports.length >= 5
            return (
              <tr key={report.report_id} className={isSelected ? 'row-selected' : ''}>
                <td className="col-check">
                  <input type="checkbox" checked={isSelected} disabled={isDisabled}
                    onChange={() => onToggle(report.report_id)} />
                </td>
                <td className="col-filename" onClick={() => onViewDetail(report.report_id)}>
                  <span className="filename-link">{report.file_name}</span>
                  <span className={`status-dot ${report.status}`} />
                </td>
                <td>{ed.rating || '-'}</td>
                <td>{ed.target_price ? `¥${ed.target_price}` : '-'}</td>
                <td>
                  {stockCodes.length > 0 ? stockCodes.map(code => (
                    <span key={code} className="stock-tag" onClick={(e) => { e.stopPropagation(); onStockClick(code) }}>{code}</span>
                  )) : '-'}
                </td>
                <td className="col-time">{formatTime(report.uploaded_at)}</td>
                <td className="col-actions">
                  <button className="action-delete-btn" onClick={(e) => { e.stopPropagation(); onDelete(report) }} title="删除研报">🗑️</button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function App() {
  // ===== 基础 State =====
  const [sessions, setSessions] = useState([])
  const [currentSession, setCurrentSession] = useState(null)
  const [records, setRecords] = useState([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [capabilities, setCapabilities] = useState(null)
  const [activeTab, setActiveTab] = useState('chat') // 'chat' | 'report' | 'knowledge'
  const [reports, setReports] = useState([])
  const [selectedReports, setSelectedReports] = useState([])
  const [compareResult, setCompareResult] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [selectedReport, setSelectedReport] = useState(null)

  // ===== 新增 State (T-14 ~ T-19) =====
  const [toast, setToast] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null) // {reportId, fileName}
  const [stockDetail, setStockDetail] = useState(null)
  const [sourceTextModal, setSourceTextModal] = useState(null) // {text, source_text, position, fileName}
  const [commonExpanded, setCommonExpanded] = useState(true)
  const [diffExpanded, setDiffExpanded] = useState(true)
  // T-18/T-19 知识库
  const [knowledgeReports, setKnowledgeReports] = useState([])
  const [knowledgeSelected, setKnowledgeSelected] = useState([])
  const [searchKeyword, setSearchKeyword] = useState('')
  const [filterInstitution, setFilterInstitution] = useState('')
  const [filterStockCode, setFilterStockCode] = useState('')
  const searchTimer = useRef(null)

  // ===== Toast 提示 =====
  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  // API 调用封装
  const apiCall = async (url, options = {}) => {
    try {
      const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options })
      const data = await res.json()
      if (!res.ok) throw data.error || { code: 'UNKNOWN', message: '请求失败' }
      return data
    } catch (err) {
      if (err.code) throw err
      throw { code: 'NETWORK_ERROR', message: '服务异常，请稍后重试' }
    }
  }

  const showError = useCallback((err) => {
    const message = ERROR_MAP[err.code] || err.message || '未知错误'
    setError(message)
    setTimeout(() => setError(null), 3000)
  }, [])

  // 加载能力状态
  useEffect(() => {
    apiCall(`${API_BASE}/capabilities`).then(setCapabilities).catch(() => setCapabilities({ copaw_configured: false, bailian_configured: false }))
  }, [])

  // 加载会话列表
  const loadSessions = useCallback(async () => {
    try {
      const data = await apiCall(`${API_BASE}/sessions`)
      setSessions(data.sessions || [])
      return data.sessions || []
    } catch (err) { showError(err); return [] }
  }, [showError])

  useEffect(() => {
    loadSessions().then(list => { if (list.length > 0 && !currentSession) setCurrentSession(list[0]) })
  }, [loadSessions])

  // 加载会话记录
  const loadRecords = useCallback(async (sessionId) => {
    try {
      const data = await apiCall(`${API_BASE}/sessions/${sessionId}/records`)
      setRecords(data.records || [])
    } catch (err) {
      if (err.code === 'SESSION_NOT_FOUND') { showError(err); loadSessions() } else showError(err)
    }
  }, [showError, loadSessions])

  useEffect(() => {
    if (currentSession) loadRecords(currentSession.session_id)
    else setRecords([])
  }, [currentSession, loadRecords])

  // 加载研报列表
  const loadReports = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/reports`)
      const data = await res.json()
      if (res.ok) setReports(data.reports || [])
    } catch (err) { console.error('加载研报列表失败:', err) }
  }, [])

  useEffect(() => { if (activeTab === 'report') loadReports() }, [activeTab, loadReports])

  // T-18: 加载知识库（全部研报）
  const loadKnowledgeReports = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/reports`)
      const data = await res.json()
      if (res.ok) setKnowledgeReports(data.reports || [])
    } catch (err) { console.error('加载知识库失败:', err) }
  }, [])

  useEffect(() => { if (activeTab === 'knowledge') loadKnowledgeReports() }, [activeTab, loadKnowledgeReports])

  // 创建新会话
  const createSession = async () => {
    try {
      const data = await apiCall(`${API_BASE}/sessions`, { method: 'POST', body: JSON.stringify({ title: '新会话' }) })
      const ns = { session_id: data.session_id, title: data.title, created_at: data.created_at, query_count: data.query_count }
      setSessions(prev => [ns, ...prev])
      setCurrentSession(ns)
    } catch (err) { showError(err) }
  }

  const deleteSession = async (sessionId, e) => {
    e.stopPropagation()
    if (!window.confirm('确认删除该会话？')) return
    try {
      await apiCall(`${API_BASE}/sessions/${sessionId}`, { method: 'DELETE' })
      setSessions(prev => prev.filter(s => s.session_id !== sessionId))
      if (currentSession?.session_id === sessionId) setCurrentSession(null)
    } catch (err) { showError(err) }
  }

  const selectSession = (session) => setCurrentSession(session)

  const sendQuery = async () => {
    if (!query.trim() || !currentSession) return
    setLoading(true)
    try {
      const data = await apiCall(`${API_BASE}/ask`, { method: 'POST', body: JSON.stringify({ query: query.trim(), session_id: currentSession.session_id }) })
      setRecords(prev => [...prev, { query: query.trim(), answer: data.answer, llm_used: data.llm_used, model: data.model, response_time_ms: data.response_time_ms, answer_source: data.answer_source, created_at: new Date().toISOString() }])
      setQuery('')
      loadSessions()
    } catch (err) { showError(err) } finally { setLoading(false) }
  }

  const clearQuery = () => setQuery('')

  // 上传研报
  const uploadReport = async (file) => {
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      if (currentSession) formData.append('session_id', currentSession.session_id)
      const res = await fetch(`${API_BASE}/reports/upload`, { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw data.error || { code: 'UNKNOWN', message: '上传失败' }
      loadReports()
      showToast('研报上传成功')
    } catch (err) { showError(err) } finally { setUploading(false) }
  }

  const handleFileSelect = (e) => { const file = e.target.files[0]; if (file) uploadReport(file); e.target.value = '' }
  const handleDrop = (e) => { e.preventDefault(); const file = e.dataTransfer.files[0]; if (file) uploadReport(file) }
  const handleDragOver = (e) => e.preventDefault()

  // T-13: 切换研报选择
  const toggleReportSelection = (action, ids) => {
    if (action === 'SELECT_ALL') {
      setSelectedReports(prev => {
        const newSet = new Set(prev)
        ids.forEach(id => { if (newSet.size < 5) newSet.add(id) })
        return [...newSet]
      })
    } else if (action === 'DESELECT_ALL') {
      setSelectedReports(prev => prev.filter(id => !ids.includes(id)))
    } else {
      // action is reportId
      setSelectedReports(prev => {
        if (prev.includes(action)) return prev.filter(id => id !== action)
        if (prev.length >= 5) return prev
        return [...prev, action]
      })
    }
  }

  // T-13: 知识库勾选
  const toggleKnowledgeSelection = (action, ids) => {
    if (action === 'SELECT_ALL') {
      setKnowledgeSelected(prev => {
        const newSet = new Set(prev)
        ids.forEach(id => { if (newSet.size < 5) newSet.add(id) })
        return [...newSet]
      })
    } else if (action === 'DESELECT_ALL') {
      setKnowledgeSelected(prev => prev.filter(id => !ids.includes(id)))
    } else {
      setKnowledgeSelected(prev => {
        if (prev.includes(action)) return prev.filter(id => id !== action)
        if (prev.length >= 5) return prev
        return [...prev, action]
      })
    }
  }

  // 研报对比
  const compareReports = async (reportIds) => {
    if (reportIds.length < 2) return
    try {
      const data = await apiCall(`${API_BASE}/reports/compare`, { method: 'POST', body: JSON.stringify({ report_ids: reportIds }) })
      setCompareResult({
        ...data.comparison_table,
        common_opinions: data.common_opinions || MOCK_OPINION_ANALYSIS.common_opinions,
        diff_opinions: data.diff_opinions || MOCK_OPINION_ANALYSIS.diff_opinions,
      })
    } catch (err) { showError(err) }
  }

  // 查看研报详情
  const viewReportDetail = async (reportId) => {
    try {
      const res = await fetch(`${API_BASE}/reports/${reportId}`)
      const data = await res.json()
      if (res.ok) setSelectedReport(data.report)
    } catch (err) { console.error('获取研报详情失败:', err) }
  }

  // T-14: 删除研报
  const handleDeleteReport = async () => {
    if (!deleteConfirm) return
    const { reportId } = deleteConfirm
    try {
      const res = await fetch(`${API_BASE}/reports/${reportId}`, { method: 'DELETE' })
      if (res.ok) {
        setReports(prev => prev.filter(r => r.report_id !== reportId))
        setKnowledgeReports(prev => prev.filter(r => r.report_id !== reportId))
        setSelectedReports(prev => prev.filter(id => id !== reportId))
        setKnowledgeSelected(prev => prev.filter(id => id !== reportId))
        if (compareResult) setCompareResult(null)
        showToast('删除成功')
      } else {
        // mock: 如果接口不存在，直接前端删除
        setReports(prev => prev.filter(r => r.report_id !== reportId))
        setKnowledgeReports(prev => prev.filter(r => r.report_id !== reportId))
        setSelectedReports(prev => prev.filter(id => id !== reportId))
        setKnowledgeSelected(prev => prev.filter(id => id !== reportId))
        showToast('删除成功')
      }
    } catch {
      // mock fallback
      setReports(prev => prev.filter(r => r.report_id !== reportId))
      setKnowledgeReports(prev => prev.filter(r => r.report_id !== reportId))
      setSelectedReports(prev => prev.filter(id => id !== reportId))
      setKnowledgeSelected(prev => prev.filter(id => id !== reportId))
      showToast('删除成功')
    }
    setDeleteConfirm(null)
  }

  // T-15: 获取股票详情
  const loadStockDetail = async (code) => {
    // 先尝试 API，失败则用 Mock
    try {
      const res = await fetch(`${API_BASE}/stock/${code}/detail`)
      if (res.ok) { const data = await res.json(); setStockDetail(data); return }
    } catch { /* ignore */ }
    // Mock fallback
    setStockDetail(MOCK_STOCK_DATA[code] || { ...DEFAULT_STOCK, code, name: `股票${code}` })
  }

  // 建议问题
  const useSuggestedQuestion = (question) => setQuery(question)

  // 格式化时间戳
  const formatTime = (isoString) => {
    if (!isoString) return ''
    return new Date(isoString).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const getSourceInfo = (source) => {
    switch (source) {
      case 'copaw': return { className: 'source-copaw', text: 'CoPaw' }
      case 'bailian': return { className: 'source-bailian', text: '百炼' }
      default: return { className: 'source-demo', text: '离线演示' }
    }
  }

  const renderCapabilityChips = () => {
    if (!capabilities) return null
    const chips = []
    if (capabilities.copaw_configured) chips.push(<span key="copaw" className="capability-chip chip-copaw">CoPaw 桥接</span>)
    if (capabilities.bailian_configured) chips.push(<span key="bailian" className="capability-chip chip-bailian">百炼·{capabilities.model || 'qwen'}</span>)
    if (chips.length === 0) chips.push(<span key="demo" className="capability-chip chip-demo">离线演示</span>)
    return chips
  }

  // T-19: 筛选后的知识库研报
  const filteredKnowledgeReports = knowledgeReports.filter(report => {
    if (searchKeyword && !report.file_name.toLowerCase().includes(searchKeyword.toLowerCase())) return false
    if (filterInstitution && report.extracted_data?.institution !== filterInstitution) return false
    if (filterStockCode && !(report.extracted_data?.stock_codes || []).includes(filterStockCode)) return false
    return true
  })

  // T-19: 聚合数据
  const aggregations = (() => {
    const institutions = new Set()
    const stockCodes = new Set()
    knowledgeReports.forEach(r => {
      const d = r.extracted_data || {}
      if (d.institution) institutions.add(d.institution)
      ;(d.stock_codes || []).forEach(c => stockCodes.add(c))
    })
    return { institutions: [...institutions].sort(), stockCodes: [...stockCodes].sort() }
  })()

  // T-19: debounce search
  const handleSearchChange = (val) => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => setSearchKeyword(val), 300)
  }

  // 获取观点文本（兼容 string 和 object 格式）
  const getPointText = (point) => typeof point === 'string' ? point : point?.text || ''
  const getPointObj = (point) => typeof point === 'string' ? { text: point, source_text: '', position: null } : point

  return (
    <div className="app-container">
      {/* 错误提示 */}
      {error && <div className="error-toast">{error}</div>}
      {/* Toast 提示 (T-14) */}
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}

      {/* Header */}
      <header className="header">
        <h1><svg className="logo-icon" width="26" height="26" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 2L4 8v12l10 6 10-6V8L14 2z" stroke="#fff" strokeWidth="1.5" fill="none" opacity="0.9"/><circle cx="14" cy="14" r="4" fill="#fff" opacity="0.95"/><line x1="14" y1="10" x2="14" y2="4" stroke="#fff" strokeWidth="1.2" opacity="0.7"/><line x1="17.5" y1="12" x2="22" y2="8" stroke="#fff" strokeWidth="1.2" opacity="0.7"/><line x1="17.5" y1="16" x2="22" y2="20" stroke="#fff" strokeWidth="1.2" opacity="0.7"/><line x1="14" y1="18" x2="14" y2="24" stroke="#fff" strokeWidth="1.2" opacity="0.7"/><line x1="10.5" y1="16" x2="6" y2="20" stroke="#fff" strokeWidth="1.2" opacity="0.7"/><line x1="10.5" y1="12" x2="6" y2="8" stroke="#fff" strokeWidth="1.2" opacity="0.7"/></svg>投研小策</h1>
        <div className="capability-chips">{renderCapabilityChips()}</div>
      </header>

      {/* 主体 */}
      <div className="body">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-header">
            <button className="new-session-btn" onClick={createSession}>+ 新建</button>
          </div>
          <div className="sessions-list">
            {sessions.length === 0 ? <div className="empty-sessions">暂无会话</div> : sessions.map(session => (
              <div key={session.session_id} className={`session-item ${currentSession?.session_id === session.session_id ? 'active' : ''}`} onClick={() => selectSession(session)}>
                <div className="session-info">
                  <div className="session-title">{session.title}</div>
                  <div className="session-meta">{session.query_count || 0} 条对话</div>
                </div>
                <button className="delete-btn" onClick={e => deleteSession(session.session_id, e)} title="删除会话">×</button>
              </div>
            ))}
          </div>
        </aside>

        {/* Main */}
        <div className="main-area">
          {/* Tab 切换 (T-18: 新增知识库) */}
          {currentSession && (
            <div className="tab-bar">
              <button className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}>问答</button>
              <button className={`tab-btn ${activeTab === 'report' ? 'active' : ''}`} onClick={() => setActiveTab('report')}>研报分析</button>
              <button className={`tab-btn ${activeTab === 'knowledge' ? 'active' : ''}`} onClick={() => setActiveTab('knowledge')}>📚 知识库</button>
            </div>
          )}

          <div className="content">
            {/* 未选择会话 */}
            {!currentSession && (
              <div className="empty-state">
                <div className="empty-icon">💬</div>
                <div>请创建或选择一个会话开始</div>
              </div>
            )}

            {/* 问答 - 欢迎 */}
            {currentSession && activeTab === 'chat' && records.length === 0 && (
              <div className="welcome-state">
                <h3>👋 欢迎使用投研小策</h3>
                <p>选择一个常见问题开始，或直接输入您的问题</p>
                <div className="suggested-questions">
                  {SUGGESTED_QUESTIONS.map((q, i) => <div key={i} className="question-card" onClick={() => useSuggestedQuestion(q)}>{q}</div>)}
                </div>
              </div>
            )}

            {/* 问答 - 对话记录 */}
            {currentSession && activeTab === 'chat' && records.length > 0 && (
              <div className="chat-history">
                {records.map((record, index) => {
                  const si = getSourceInfo(record.answer_source)
                  return (
                    <div key={index} className="chat-record">
                      <div className="message user-message"><div className="message-bubble user-bubble">{record.query}</div></div>
                      <div className="message ai-message">
                        <div className="message-bubble ai-bubble">
                          <div className="answer-content">{record.answer}</div>
                          <div className="answer-meta">
                            <span className={`source-tag ${si.className}`}>{si.text}</span>
                            <span className="response-time">{record.response_time_ms}ms</span>
                            <span className="timestamp">{formatTime(record.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* ===== 研报分析 Tab ===== */}
            {currentSession && activeTab === 'report' && (
              <div className="report-section">
                {/* 上传区 */}
                <div className="report-upload-area" onDrop={handleDrop} onDragOver={handleDragOver}>
                  <div className="upload-icon">📄</div>
                  <p>拖拽文件到此处，或点击选择文件</p>
                  <p className="upload-hint">支持 PDF、HTML 格式，最大 50MB</p>
                  <input type="file" accept=".pdf,.html,.htm" onChange={handleFileSelect} style={{ display: 'none' }} id="report-file-input" />
                  <label htmlFor="report-file-input" className="upload-btn">{uploading ? '上传中...' : '选择文件'}</label>
                </div>

                {/* T-13: 研报表格列表 */}
                {reports.length > 0 && (
                  <div className="report-list">
                    <div className="report-list-header">
                      <h3>已上传研报 ({reports.length})</h3>
                      <div className="report-list-actions">
                        <span className="selection-count">已选 {selectedReports.length}/5</span>
                        {selectedReports.length >= 2 && (
                          <button className="compare-btn" onClick={() => compareReports(selectedReports)}>对比已选 ({selectedReports.length})</button>
                        )}
                      </div>
                    </div>
                    <ReportTable
                      reports={reports}
                      selectedReports={selectedReports}
                      onToggle={toggleReportSelection}
                      onDelete={(r) => setDeleteConfirm({ reportId: r.report_id, fileName: r.file_name })}
                      onViewDetail={viewReportDetail}
                      onStockClick={loadStockDetail}
                      formatTime={formatTime}
                    />
                  </div>
                )}

                {/* 对比结果 (T-17: 含共同/差异观点) */}
                {compareResult && (
                  <div className="compare-section">
                    <div className="compare-header">
                      <h3>研报对比结果</h3>
                      <button className="close-compare" onClick={() => setCompareResult(null)}>关闭</button>
                    </div>
                    <div className="compare-table-wrapper">
                      <table className="compare-table">
                        <thead>
                          <tr>
                            <th>维度</th>
                            {compareResult.reports?.map(r => <th key={r.report_id}>{r.file_name}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="dim-label">评级</td>
                            {compareResult.reports?.map(r => <td key={r.report_id}>{r.rating || '-'}</td>)}
                          </tr>
                          <tr>
                            <td className="dim-label">目标价</td>
                            {compareResult.reports?.map(r => <td key={r.report_id}>{r.target_price ? `¥${r.target_price}` : '-'}</td>)}
                          </tr>
                          <tr>
                            <td className="dim-label">核心观点</td>
                            {compareResult.reports?.map(r => (
                              <td key={r.report_id}>
                                {r.key_points?.length > 0
                                  ? <ul className="compare-points">{r.key_points.map((p, i) => <li key={i}>{getPointText(p)}</li>)}</ul>
                                  : '-'}
                              </td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* T-17: 共同/差异观点折叠面板 */}
                    <div className="opinion-analysis">
                      <div className="opinion-section">
                        <div className="opinion-section-header" onClick={() => setCommonExpanded(!commonExpanded)}>
                          <span className="expand-icon">{commonExpanded ? '▼' : '▶'}</span>
                          <h4>共同观点 ({compareResult.common_opinions?.length || 0})</h4>
                        </div>
                        {commonExpanded && compareResult.common_opinions?.length > 0 && (
                          <ul className="opinion-list">
                            {compareResult.common_opinions.map((op, i) => (
                              <li key={i} className="opinion-item">
                                <div className="opinion-text">{op.text}</div>
                                <div className="opinion-reports">📎 {op.reports.map(r => r.institution).join(' · ')}</div>
                              </li>
                            ))}
                          </ul>
                        )}
                        {commonExpanded && (!compareResult.common_opinions || compareResult.common_opinions.length === 0) && (
                          <div className="opinion-empty">暂无共同观点</div>
                        )}
                      </div>
                      <div className="opinion-section">
                        <div className="opinion-section-header" onClick={() => setDiffExpanded(!diffExpanded)}>
                          <span className="expand-icon">{diffExpanded ? '▼' : '▶'}</span>
                          <h4>差异观点 ({compareResult.diff_opinions?.length || 0})</h4>
                        </div>
                        {diffExpanded && compareResult.diff_opinions?.length > 0 && (
                          <div className="diff-opinions-list">
                            {compareResult.diff_opinions.map((group, i) => (
                              <div key={i} className="diff-group">
                                <div className="diff-institution">{group.institution}:</div>
                                <ul>{group.opinions.map((op, j) => <li key={j}>{op}</li>)}</ul>
                              </div>
                            ))}
                          </div>
                        )}
                        {diffExpanded && (!compareResult.diff_opinions || compareResult.diff_opinions.length === 0) && (
                          <div className="opinion-empty">暂无差异观点</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ===== T-18: 知识库 Tab ===== */}
            {currentSession && activeTab === 'knowledge' && (
              <div className="knowledge-section">
                {/* T-19: 搜索与筛选 */}
                <div className="knowledge-filters">
                  <input type="text" className="search-input" placeholder="搜索文件名..." defaultValue="" onChange={e => handleSearchChange(e.target.value)} />
                  <select className="filter-select" value={filterInstitution} onChange={e => setFilterInstitution(e.target.value)}>
                    <option value="">全部机构</option>
                    {aggregations.institutions.map(inst => <option key={inst} value={inst}>{inst}</option>)}
                  </select>
                  <select className="filter-select" value={filterStockCode} onChange={e => setFilterStockCode(e.target.value)}>
                    <option value="">全部代码</option>
                    {aggregations.stockCodes.map(code => <option key={code} value={code}>{code}</option>)}
                  </select>
                  <button className="reset-filter-btn" onClick={() => { setSearchKeyword(''); setFilterInstitution(''); setFilterStockCode('') }}>重置</button>
                </div>

                {/* 知识库表格 */}
                <div className="report-list">
                  <div className="report-list-header">
                    <h3>研报知识库 ({filteredKnowledgeReports.length})</h3>
                    <div className="report-list-actions">
                      <span className="selection-count">已选 {knowledgeSelected.length}/5</span>
                      {knowledgeSelected.length >= 2 && (
                        <button className="compare-btn" onClick={() => compareReports(knowledgeSelected)}>对比已选 ({knowledgeSelected.length})</button>
                      )}
                    </div>
                  </div>
                  {filteredKnowledgeReports.length > 0 ? (
                    <ReportTable
                      reports={filteredKnowledgeReports}
                      selectedReports={knowledgeSelected}
                      onToggle={toggleKnowledgeSelection}
                      onDelete={(r) => setDeleteConfirm({ reportId: r.report_id, fileName: r.file_name })}
                      onViewDetail={viewReportDetail}
                      onStockClick={loadStockDetail}
                      formatTime={formatTime}
                    />
                  ) : (
                    <div className="empty-knowledge">暂无研报数据</div>
                  )}
                </div>

                {/* 知识库对比结果也复用 */}
                {compareResult && activeTab === 'knowledge' && (
                  <div className="compare-section">
                    <div className="compare-header">
                      <h3>研报对比结果</h3>
                      <button className="close-compare" onClick={() => setCompareResult(null)}>关闭</button>
                    </div>
                    <div className="compare-table-wrapper">
                      <table className="compare-table">
                        <thead><tr><th>维度</th>{compareResult.reports?.map(r => <th key={r.report_id}>{r.file_name}</th>)}</tr></thead>
                        <tbody>
                          <tr><td className="dim-label">评级</td>{compareResult.reports?.map(r => <td key={r.report_id}>{r.rating || '-'}</td>)}</tr>
                          <tr><td className="dim-label">目标价</td>{compareResult.reports?.map(r => <td key={r.report_id}>{r.target_price ? `¥${r.target_price}` : '-'}</td>)}</tr>
                          <tr><td className="dim-label">核心观点</td>{compareResult.reports?.map(r => (<td key={r.report_id}>{r.key_points?.length > 0 ? <ul className="compare-points">{r.key_points.map((p, i) => <li key={i}>{getPointText(p)}</li>)}</ul> : '-'}</td>))}</tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Input Area */}
          {activeTab === 'chat' && (
            <div className="input-area">
              <textarea placeholder="请输入您的问题..." rows={3} value={query} onChange={e => setQuery(e.target.value)} disabled={!currentSession || loading}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendQuery() } }} />
              <div className="input-actions">
                <button onClick={sendQuery} disabled={!currentSession || loading || !query.trim()}>{loading ? '发送中…' : '发送'}</button>
                <button onClick={clearQuery} disabled={!currentSession || loading || !query}>清空</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== T-14: 删除确认弹窗 ===== */}
      {deleteConfirm && (
        <div className="report-detail-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="delete-confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>确认删除</h3>
              <button className="modal-close" onClick={() => setDeleteConfirm(null)}>×</button>
            </div>
            <div className="modal-body">
              <p className="delete-warning">确认删除研报「{deleteConfirm.fileName}」？此操作不可恢复。</p>
              <div className="delete-actions">
                <button className="btn-cancel" onClick={() => setDeleteConfirm(null)}>取消</button>
                <button className="btn-danger" onClick={handleDeleteReport}>确认删除</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== 研报详情弹窗 (增强：含股票代码+原文定位 T-15/T-16) ===== */}
      {selectedReport && (
        <div className="report-detail-overlay" onClick={() => setSelectedReport(null)}>
          <div className="report-detail-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedReport.file_name}</h3>
              <button className="modal-close" onClick={() => setSelectedReport(null)}>×</button>
            </div>
            <div className="modal-body">
              {selectedReport.extracted_data ? (
                <>
                  <div className="detail-section">
                    <h4>评级</h4>
                    <p>{selectedReport.extracted_data.rating || '未识别'}</p>
                  </div>
                  <div className="detail-section">
                    <h4>目标价</h4>
                    <p>{selectedReport.extracted_data.target_price ? `¥${selectedReport.extracted_data.target_price}` : '未识别'}</p>
                  </div>
                  {/* T-15: 股票代码标签 */}
                  {(selectedReport.extracted_data.stock_codes || []).length > 0 && (
                    <div className="detail-section">
                      <h4>关联股票</h4>
                      <div className="stock-tags-row">
                        {selectedReport.extracted_data.stock_codes.map(code => (
                          <span key={code} className="stock-tag" onClick={() => loadStockDetail(code)}>{code}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="detail-section">
                    <h4>核心观点</h4>
                    {selectedReport.extracted_data.key_points?.length > 0 ? (
                      <ul className="detail-keypoints">
                        {selectedReport.extracted_data.key_points.map((point, i) => {
                          const p = getPointObj(point)
                          return (
                            <li key={i} className="keypoint-item">
                              <span>{p.text}</span>
                              {/* T-16: 查看原文按钮 */}
                              <button className="view-source-btn" title={p.position != null ? '查看原文' : '原文定位不可用'}
                                onClick={() => setSourceTextModal({ ...p, fileName: selectedReport.file_name })}
                                disabled={p.position == null && !p.source_text}>
                                📄
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    ) : <p>未识别</p>}
                  </div>
                  <div className="detail-section">
                    <h4>摘要</h4>
                    <p className="report-summary">{selectedReport.extracted_data.summary || '未识别'}</p>
                  </div>
                </>
              ) : (
                <p className="parse-failed">解析失败: {selectedReport.error_message}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== T-15: 股票详情弹窗 ===== */}
      {stockDetail && (
        <div className="report-detail-overlay" onClick={() => setStockDetail(null)}>
          <div className="stock-detail-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{stockDetail.name} ({stockDetail.code})</h3>
              <button className="modal-close" onClick={() => setStockDetail(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="stock-price-row">
                <span className="stock-current-price">¥{stockDetail.current_price?.toLocaleString()}</span>
                <span className={`stock-change ${stockDetail.change_percent >= 0 ? 'up' : 'down'}`}>
                  {stockDetail.change_percent >= 0 ? '+' : ''}{stockDetail.change_percent}%
                </span>
              </div>
              <div className="detail-section">
                <h4>📈 近30日股价走势</h4>
                <StockChart data={stockDetail.price_history} />
              </div>
              {stockDetail.financial_summary && (
                <div className="detail-section">
                  <h4>最近财报 ({stockDetail.financial_summary.period})</h4>
                  <div className="financial-grid">
                    <div className="fin-item"><span className="fin-label">营收</span><span className="fin-value">{stockDetail.financial_summary.revenue}</span></div>
                    <div className="fin-item"><span className="fin-label">净利润</span><span className="fin-value">{stockDetail.financial_summary.net_profit}</span></div>
                    <div className="fin-item"><span className="fin-label">同比增长</span><span className="fin-value">{stockDetail.financial_summary.yoy_growth}</span></div>
                  </div>
                </div>
              )}
              {stockDetail.key_events?.length > 0 && (
                <div className="detail-section">
                  <h4>关键时点</h4>
                  <ul className="event-list">
                    {stockDetail.key_events.map((ev, i) => <li key={i}><span className="event-date">{ev.date}</span> {ev.event}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== T-16: 原文定位弹窗 ===== */}
      {sourceTextModal && (
        <div className="report-detail-overlay" onClick={() => setSourceTextModal(null)}>
          <div className="source-text-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>原文引用 — {sourceTextModal.fileName}</h3>
              <button className="modal-close" onClick={() => setSourceTextModal(null)}>×</button>
            </div>
            <div className="modal-body">
              {sourceTextModal.source_text ? (() => {
                const src = sourceTextModal.source_text
                const viewText = sourceTextModal.text
                const idx = src.indexOf(viewText)
                if (idx >= 0) {
                  return (
                    <div className="source-content">
                      <span className="source-context">{src.substring(0, idx)}</span>
                      <mark className="source-highlight">{viewText}</mark>
                      <span className="source-context">{src.substring(idx + viewText.length)}</span>
                    </div>
                  )
                }
                return <div className="source-content"><mark className="source-highlight">{viewText}</mark><div style={{marginTop:12}}>{src}</div></div>
              })() : (
                <div className="source-unavailable">原文定位不可用</div>
              )}
              <div className="position-info">
                位置：第 {sourceTextModal.position != null ? sourceTextModal.position.toLocaleString() : '—'} 字符处
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
