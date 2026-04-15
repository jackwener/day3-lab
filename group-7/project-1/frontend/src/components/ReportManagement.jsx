import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, FileText, Eye, Trash2, Search, Filter, Plus, X, Building, Calendar, Tag, Loader2, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import { getReports, uploadReport, deleteReport, analyzeReport, getReportDetail } from '../api'

const ReportManagement = ({ reports: externalReports, onRefresh }) => {
  const [reports, setReports] = useState(externalReports || [])
  const [searchTerm, setSearchTerm] = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(null)
  const [error, setError] = useState(null)
  const [analyzingId, setAnalyzingId] = useState(null)
  const [showFilter, setShowFilter] = useState(false)
  const [filters, setFilters] = useState({
    status: '',
    industry: '',
    dateRange: ''
  })
  const [previewReport, setPreviewReport] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (externalReports) {
      setReports(externalReports)
    } else {
      loadReports()
    }
  }, [externalReports])

  const loadReports = async () => {
    setIsLoading(true)
    try {
      const data = await getReports()
      setReports(data.reports || [])
    } catch (error) {
      console.error('Failed to load reports:', error)
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  // 获取所有行业列表
  const industries = [...new Set(reports.map(r => r.industry).filter(Boolean))]

  // 筛选逻辑
  const filteredReports = reports.filter(r => {
    // 搜索词筛选
    const matchesSearch = !searchTerm || 
      r.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.industry?.toLowerCase().includes(searchTerm.toLowerCase())
    
    // 状态筛选
    const matchesStatus = !filters.status || r.status === filters.status
    
    // 行业筛选
    const matchesIndustry = !filters.industry || r.industry === filters.industry
    
    // 时间筛选
    let matchesDate = true
    if (filters.dateRange && r.uploaded_at) {
      const reportDate = new Date(r.uploaded_at)
      const now = new Date()
      const diffDays = Math.floor((now - reportDate) / (1000 * 60 * 60 * 24))
      
      switch (filters.dateRange) {
        case 'today':
          matchesDate = diffDays < 1
          break
        case 'week':
          matchesDate = diffDays < 7
          break
        case 'month':
          matchesDate = diffDays < 30
          break
        case 'year':
          matchesDate = diffDays < 365
          break
        default:
          matchesDate = true
      }
    }
    
    return matchesSearch && matchesStatus && matchesIndustry && matchesDate
  })

  // 重置筛选
  const handleResetFilters = () => {
    setFilters({ status: '', industry: '', dateRange: '' })
  }

  // 检查是否有激活的筛选
  const hasActiveFilters = filters.status || filters.industry || filters.dateRange

  // 预览研报
  const handlePreview = async (report) => {
    setPreviewLoading(true)
    try {
      const data = await getReportDetail(report.report_id)
      setPreviewReport(data.report || report)
    } catch (error) {
      console.error('Failed to load report detail:', error)
      // 如果获取详情失败，使用列表中的数据
      setPreviewReport(report)
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingFile(file)
    setError(null)

    try {
      await uploadReport(file)
      setShowUpload(false)
      if (onRefresh) {
        onRefresh()
      } else {
        loadReports()
      }
    } catch (error) {
      console.error('Failed to upload report:', error)
      setError(error.message)
    } finally {
      setUploadingFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDelete = async (reportId) => {
    try {
      await deleteReport(reportId)
      setReports(reports.filter(r => r.report_id !== reportId))
      if (onRefresh) {
        onRefresh()
      }
    } catch (error) {
      console.error('Failed to delete report:', error)
      setError(error.message)
    }
  }

  const handleAnalyze = async (reportId) => {
    setAnalyzingId(reportId)
    setError(null)
    try {
      await analyzeReport(reportId)
      if (onRefresh) {
        onRefresh()
      } else {
        loadReports()
      }
    } catch (error) {
      console.error('Failed to analyze report:', error)
      setError(error.message)
    } finally {
      setAnalyzingId(null)
    }
  }

  const getStatusStyle = (status) => {
    switch (status) {
      case 'analyzed':
        return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', icon: CheckCircle, label: '已分析' }
      case 'analyzing':
        return { bg: 'bg-amber-500/10', text: 'text-amber-400', icon: Loader2, label: '分析中' }
      case 'failed':
        return { bg: 'bg-red-500/10', text: 'text-red-400', icon: AlertCircle, label: '分析失败' }
      default:
        return { bg: 'bg-gray-500/10', text: 'text-gray-400', icon: Clock, label: '待分析' }
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-dark-900/50 overflow-hidden">
      {/* 头部 */}
      <div className="p-6 border-b border-dark-400/30">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">研报管理</h2>
            <p className="text-sm text-gray-500 mt-1">管理和上传投研报告文档</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-lg text-white text-sm font-medium shadow-lg shadow-emerald-500/20"
          >
            <Plus className="w-4 h-4" />
            上传研报
          </motion.button>
        </div>

        {/* 搜索和筛选 */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索公司名称或行业..."
              className="w-full bg-dark-700/50 border border-dark-400 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 transition-all"
            />
          </div>
          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowFilter(!showFilter)}
              className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg text-sm transition-all ${
                hasActiveFilters
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-dark-700/50 border-dark-400 text-gray-400 hover:text-white'
              }`}
            >
              <Filter className="w-4 h-4" />
              筛选
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              )}
            </motion.button>
            
            {/* 筛选面板 */}
            <AnimatePresence>
              {showFilter && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute right-0 top-full mt-2 w-72 bg-dark-800 border border-dark-400 rounded-xl p-4 shadow-xl z-20"
                >
                  {/* 状态筛选 */}
                  <div className="mb-4">
                    <label className="text-xs text-gray-500 mb-2 block">状态</label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: '', label: '全部' },
                        { value: 'analyzed', label: '已分析' },
                        { value: 'analyzing', label: '分析中' },
                        { value: 'pending', label: '待分析' },
                        { value: 'failed', label: '失败' }
                      ].map(option => (
                        <button
                          key={option.value}
                          onClick={() => setFilters(prev => ({ ...prev, status: option.value }))}
                          className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                            filters.status === option.value
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-dark-700/50 text-gray-400 border border-dark-400 hover:border-gray-500'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* 行业筛选 */}
                  {industries.length > 0 && (
                    <div className="mb-4">
                      <label className="text-xs text-gray-500 mb-2 block">行业</label>
                      <select
                        value={filters.industry}
                        onChange={(e) => setFilters(prev => ({ ...prev, industry: e.target.value }))}
                        className="w-full bg-dark-700/50 border border-dark-400 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                      >
                        <option value="">全部行业</option>
                        {industries.map(industry => (
                          <option key={industry} value={industry}>{industry}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                  {/* 时间筛选 */}
                  <div className="mb-4">
                    <label className="text-xs text-gray-500 mb-2 block">上传时间</label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: '', label: '全部' },
                        { value: 'today', label: '今天' },
                        { value: 'week', label: '近7天' },
                        { value: 'month', label: '近30天' },
                        { value: 'year', label: '近一年' }
                      ].map(option => (
                        <button
                          key={option.value}
                          onClick={() => setFilters(prev => ({ ...prev, dateRange: option.value }))}
                          className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                            filters.dateRange === option.value
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-dark-700/50 text-gray-400 border border-dark-400 hover:border-gray-500'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* 重置按钮 */}
                  {hasActiveFilters && (
                    <button
                      onClick={handleResetFilters}
                      className="w-full py-2 text-xs text-gray-400 hover:text-white transition-all"
                    >
                      重置筛选
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-6 mt-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-red-400 text-sm"
        >
          <AlertCircle className="w-4 h-4" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* 研报列表 */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          </div>
        ) : filteredReports.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-64 text-center"
          >
            <div className="w-20 h-20 rounded-2xl bg-dark-700/50 flex items-center justify-center mb-6">
              <FileText className="w-10 h-10 text-gray-600" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">暂无研报</h3>
            <p className="text-gray-500 text-sm max-w-md">
              点击上方"上传研报"按钮添加PDF或Word格式的研报文件
            </p>
          </motion.div>
        ) : (
          <div className="grid gap-4">
            <AnimatePresence>
              {filteredReports.map((report, index) => {
                const statusStyle = getStatusStyle(report.status)
                const StatusIcon = statusStyle.icon
                
                return (
                  <motion.div
                    key={report.report_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                    className="glass rounded-xl p-5 card-hover"
                  >
                    <div className="flex items-start gap-4">
                      {/* 文件图标 */}
                      <div className="w-12 h-14 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-6 h-6 text-emerald-400" />
                      </div>

                      {/* 内容 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="text-lg font-semibold text-white mb-1">
                              {report.title || report.filename}
                            </h3>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              {report.institution && (
                                <span className="flex items-center gap-1">
                                  <Building className="w-3.5 h-3.5" />
                                  {report.institution}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                {new Date(report.uploaded_at).toLocaleDateString('zh-CN')}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-1 rounded-full text-xs flex items-center gap-1 ${statusStyle.bg} ${statusStyle.text}`}>
                              <StatusIcon className={`w-3 h-3 ${report.status === 'analyzing' ? 'animate-spin' : ''}`} />
                              {statusStyle.label}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mt-3">
                          {report.company && (
                            <span className="px-2.5 py-1 rounded-full text-xs bg-emerald-500/10 text-emerald-400">
                              {report.company}
                            </span>
                          )}
                          {report.industry && (
                            <span className="px-2.5 py-1 rounded-full text-xs bg-dark-600/50 text-gray-400">
                              {report.industry}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 操作按钮 */}
                      <div className="flex items-center gap-2">
                        {report.status === 'pending' && (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleAnalyze(report.report_id)}
                            disabled={analyzingId === report.report_id}
                            className="px-3 py-2 rounded-lg text-xs bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all disabled:opacity-50"
                          >
                            {analyzingId === report.report_id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              '分析'
                            )}
                          </motion.button>
                        )}
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handlePreview(report)}
                          className="p-2 rounded-lg text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
                        >
                          <Eye className="w-4 h-4" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleDelete(report.report_id)}
                          className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* 上传弹窗 */}
      <AnimatePresence>
        {showUpload && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => !uploadingFile && setShowUpload(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg glass rounded-2xl p-6 m-4"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">上传研报</h3>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => !uploadingFile && setShowUpload(false)}
                  className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-dark-600/50 transition-all disabled:opacity-50"
                  disabled={!!uploadingFile}
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              <div 
                onClick={() => !uploadingFile && fileInputRef.current?.click()}
                className="border-2 border-dashed border-dark-400 rounded-xl p-8 text-center hover:border-emerald-500/50 transition-all cursor-pointer"
              >
                {uploadingFile ? (
                  <div className="flex flex-col items-center">
                    <Loader2 className="w-12 h-12 text-emerald-400 animate-spin mb-4" />
                    <p className="text-gray-300 mb-1">正在上传...</p>
                    <p className="text-sm text-gray-500">{uploadingFile.name}</p>
                  </div>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                      <Upload className="w-8 h-8 text-emerald-400" />
                    </div>
                    <p className="text-gray-300 mb-2">点击或拖拽文件到此处上传</p>
                    <p className="text-sm text-gray-500">支持 PDF、DOC、DOCX 格式，单个文件不超过 50MB</p>
                  </>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileSelect}
                className="hidden"
              />

              <div className="mt-6 flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowUpload(false)}
                  disabled={!!uploadingFile}
                  className="flex-1 py-2.5 bg-dark-600/50 rounded-lg text-gray-300 text-sm hover:bg-dark-600 transition-all disabled:opacity-50"
                >
                  取消
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 预览弹窗 */}
      <AnimatePresence>
        {previewReport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setPreviewReport(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-3xl max-h-[85vh] bg-dark-800 border border-dark-400 rounded-2xl overflow-hidden flex flex-col"
            >
              {/* 头部 */}
              <div className="flex items-center justify-between p-5 border-b border-dark-400/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {previewReport.title || previewReport.filename}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {previewReport.company && `${previewReport.company} · `}
                      {previewReport.industry && `${previewReport.industry} · `}
                      {new Date(previewReport.uploaded_at).toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setPreviewReport(null)}
                  className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-dark-600/50 transition-all"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              {/* 内容 */}
              <div className="flex-1 overflow-y-auto p-5">
                {previewLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* 基本信息 */}
                    <div className="grid grid-cols-2 gap-4">
                      {previewReport.institution && (
                        <div className="p-3 bg-dark-700/30 rounded-lg">
                          <label className="text-xs text-gray-500 block mb-1">发布机构</label>
                          <p className="text-sm text-white">{previewReport.institution}</p>
                        </div>
                      )}
                      {previewReport.author && (
                        <div className="p-3 bg-dark-700/30 rounded-lg">
                          <label className="text-xs text-gray-500 block mb-1">作者</label>
                          <p className="text-sm text-white">{previewReport.author}</p>
                        </div>
                      )}
                      {previewReport.report_date && (
                        <div className="p-3 bg-dark-700/30 rounded-lg">
                          <label className="text-xs text-gray-500 block mb-1">报告日期</label>
                          <p className="text-sm text-white">
                            {new Date(previewReport.report_date).toLocaleDateString('zh-CN')}
                          </p>
                        </div>
                      )}
                      <div className="p-3 bg-dark-700/30 rounded-lg">
                        <label className="text-xs text-gray-500 block mb-1">文件类型</label>
                        <p className="text-sm text-white">
                          {previewReport.file_type?.toUpperCase() || 'PDF'}
                        </p>
                      </div>
                    </div>

                    {/* 分析结果 */}
                    {previewReport.analysis && (
                      <div className="p-4 bg-dark-700/30 rounded-lg border border-dark-400/30">
                        <h4 className="text-sm font-medium text-emerald-400 mb-3 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          分析结果
                        </h4>
                        <div className="text-sm text-gray-300 whitespace-pre-wrap">
                          {typeof previewReport.analysis === 'string' 
                            ? previewReport.analysis 
                            : JSON.stringify(previewReport.analysis, null, 2)}
                        </div>
                      </div>
                    )}

                    {/* 文件路径 */}
                    {previewReport.file_path && (
                      <div className="p-3 bg-dark-700/30 rounded-lg">
                        <label className="text-xs text-gray-500 block mb-1">文件路径</label>
                        <p className="text-xs text-gray-400 font-mono break-all">
                          {previewReport.file_path}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 底部 */}
              <div className="flex items-center justify-between p-5 border-t border-dark-400/30">
                <span className={`px-3 py-1 rounded-full text-xs flex items-center gap-1 ${
                  previewReport.status === 'analyzed' ? 'bg-emerald-500/10 text-emerald-400' :
                  previewReport.status === 'analyzing' ? 'bg-amber-500/10 text-amber-400' :
                  previewReport.status === 'failed' ? 'bg-red-500/10 text-red-400' :
                  'bg-gray-500/10 text-gray-400'
                }`}>
                  {previewReport.status === 'analyzed' ? '已分析' :
                   previewReport.status === 'analyzing' ? '分析中' :
                   previewReport.status === 'failed' ? '分析失败' : '待分析'}
                </span>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setPreviewReport(null)}
                  className="px-5 py-2 bg-dark-600/50 rounded-lg text-gray-300 text-sm hover:bg-dark-600 transition-all"
                >
                  关闭
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default ReportManagement
