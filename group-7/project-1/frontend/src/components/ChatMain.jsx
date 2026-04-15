import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Star, FileText, Copy, ChevronDown, Sparkles, AlertCircle, Clock, Zap, Wifi, WifiOff } from 'lucide-react'
import { isFavorite as checkIsFavorite } from '../utils/storage'

const ChatMain = ({ 
  records, 
  currentSession, 
  onSendMessage, 
  onToggleFavorite, 
  favorites,
  isTyping, 
  error,
  role 
}) => {
  const [input, setInput] = useState('')
  const [showSource, setShowSource] = useState(null)
  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)

  // 快捷问题标签
  const quickTags = role === 'manager' 
    ? ['买入建议', '目标价格', '风险评估', '行业对比', '财务指标', '投资评级', '风险点', '估值分析']
    : ['核心观点', '竞争优势', '经营数据', '财务分析', '行业格局', '投资评级', '风险点', '估值分析']

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [records])

  const handleSend = () => {
    if (!input.trim() || isTyping) return
    onSendMessage(input.trim())
    setInput('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleQuickTag = (tag) => {
    setInput(`请分析${tag}`)
    textareaRef.current?.focus()
  }

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text)
  }

  // 获取来源标签样式
  const getSourceTagStyle = (answerSource) => {
    switch (answerSource) {
      case 'copaw':
        return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', icon: Zap, label: 'CoPaw' }
      case 'bailian':
        return { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30', icon: Wifi, label: '百炼' }
      case 'demo':
      default:
        return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', icon: Wifi, label: '智能问答' }
    }
  }

  // 空状态
  if (!currentSession) {
    return (
      <div className="flex-1 flex flex-col bg-dark-900/50 relative">
        <div className="flex-1 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-md px-6"
          >
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center mx-auto mb-6 glow-emerald">
              <MessageSquare className="w-10 h-10 text-emerald-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">请选择或创建会话</h2>
            <p className="text-gray-400 text-sm">
              从左侧列表选择一个历史会话，或点击"新建对话"开始新的问答
            </p>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-dark-900/50 relative">
      {/* 聊天区域 */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {records.length === 0 ? (
          // 常见问题状态
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full text-center"
          >
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center mb-6 glow-emerald">
              <Sparkles className="w-10 h-10 text-emerald-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              开始您的投研问答
            </h2>
            <p className="text-gray-400 text-sm max-w-md mb-8">
              我可以帮您分析研报、提取关键信息、对比行业数据。请输入您的问题，或选择下方的快捷问题开始。
            </p>
            <div className="flex flex-wrap gap-2 justify-center max-w-xl">
              {quickTags.map((tag, index) => (
                <motion.button
                  key={tag}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleQuickTag(tag)}
                  className={`px-4 py-2 rounded-full text-sm transition-all ${
                    role === 'manager'
                      ? 'bg-manager/10 text-manager-light border border-manager/20 hover:bg-manager/20'
                      : 'bg-analyst/10 text-analyst-light border border-analyst/20 hover:bg-analyst/20'
                  }`}
                >
                  {tag}
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : (
          // 消息列表
          <AnimatePresence>
            {records.map((record, index) => {
              const isFavorite = favorites.some(f => f.record_id === record.record_id)
              const sourceStyle = getSourceTagStyle(record.answer_source)
              const SourceIcon = sourceStyle.icon
              
              return (
                <motion.div
                  key={record.record_id || index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                  className="space-y-4"
                >
                  {/* 用户问题 */}
                  <div className="flex justify-end">
                    <div className="max-w-2xl">
                      <div className="message-user px-5 py-3 rounded-2xl rounded-tr-md">
                        <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">
                          {record.query}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 text-right font-mono">
                        {new Date(record.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  {/* AI回答 */}
                  {record.answer && (
                    <div className="flex justify-start">
                      <div className="max-w-2xl w-full">
                        <div className="message-ai px-5 py-4 rounded-2xl rounded-tl-md relative group">
                          {/* 收藏按钮 */}
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => onToggleFavorite(record)}
                            className={`absolute top-3 right-3 p-1.5 rounded-lg transition-all ${
                              isFavorite
                                ? 'text-amber-400'
                                : 'text-gray-500 opacity-0 group-hover:opacity-100 hover:text-amber-400'
                            }`}
                          >
                            <Star className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
                          </motion.button>

                          {/* 来源标签 */}
                          <div className="flex items-center gap-2 mb-3">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${sourceStyle.bg} ${sourceStyle.text} border ${sourceStyle.border}`}>
                              <SourceIcon className="w-3 h-3" />
                              {sourceStyle.label}
                            </span>
                            {record.response_time_ms && (
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {record.response_time_ms}ms
                              </span>
                            )}
                            {record.model && (
                              <span className="text-xs text-gray-600 font-mono">
                                {record.model}
                              </span>
                            )}
                          </div>

                          {/* 回答内容 */}
                          <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap pr-8">
                            {record.answer}
                          </p>

                          {/* 来源信息 */}
                          {record.sources && record.sources.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-dark-400/50">
                              <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                                <FileText className="w-3.5 h-3.5" />
                                <span>参考来源 ({record.sources.length})</span>
                              </div>
                              {record.sources.map((source, sIndex) => (
                                <motion.button
                                  key={sIndex}
                                  whileHover={{ scale: 1.01 }}
                                  onClick={() => setShowSource(showSource === `${record.record_id}-${sIndex}` ? null : `${record.record_id}-${sIndex}`)}
                                  className="w-full flex items-center justify-between p-3 rounded-lg bg-dark-600/30 hover:bg-dark-600/50 transition-all mb-2"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-10 rounded bg-emerald-500/10 flex items-center justify-center">
                                      <FileText className="w-4 h-4 text-emerald-400" />
                                    </div>
                                    <div className="text-left">
                                      <p className="text-sm text-gray-300">
                                        {source.report_title}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {source.institution} · {source.page} · {source.date}
                                      </p>
                                    </div>
                                  </div>
                                  <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${
                                    showSource === `${record.record_id}-${sIndex}` ? 'rotate-180' : ''
                                  }`} />
                                </motion.button>
                              ))}

                              {/* 展开的原文 */}
                              <AnimatePresence>
                                {showSource && showSource.startsWith(record.record_id) && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="mt-2 p-4 rounded-lg bg-dark-700/50 border border-dark-400/30"
                                  >
                                    {record.sources
                                      .filter((_, sIndex) => showSource === `${record.record_id}-${sIndex}`)
                                      .map((source, sIndex) => (
                                        <div key={sIndex}>
                                          <p className="text-xs text-gray-400 leading-relaxed">
                                            "{source.snippet || '暂无原文片段'}"
                                          </p>
                                          <div className="mt-3 flex items-center gap-2">
                                            <button
                                              onClick={() => handleCopy(record.answer)}
                                              className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs text-gray-400 hover:text-white hover:bg-dark-600/50 transition-all"
                                            >
                                              <Copy className="w-3.5 h-3.5" />
                                              复制
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )
            })}
            
            {/* 正在输入指示 */}
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <div className="message-ai px-5 py-4 rounded-2xl rounded-tl-md">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-xs text-gray-500">AI 正在分析...</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 错误提示 */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-center"
              >
                <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              </motion.div>
            )}
            
            <div ref={messagesEndRef} />
          </AnimatePresence>
        )}
      </div>

      {/* 输入区域 */}
      <div className="p-4 border-t border-dark-400/30 bg-dark-800/30 backdrop-blur-xl">
        {/* 快捷标签 */}
        <div className="flex flex-wrap gap-2 mb-3">
          {quickTags.slice(0, 3).map((tag) => (
            <motion.button
              key={tag}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleQuickTag(tag)}
              className={`px-3 py-1.5 rounded-full text-xs transition-all ${
                role === 'manager'
                  ? 'bg-manager/10 text-manager-light border border-manager/20 hover:bg-manager/20'
                  : 'bg-analyst/10 text-analyst-light border border-analyst/20 hover:bg-analyst/20'
              }`}
            >
              {tag}
            </motion.button>
          ))}
        </div>

        {/* 输入框 */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative flex items-center">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入您的问题，按 Enter 发送..."
              className="w-full bg-dark-700/50 border border-dark-400 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all resize-none"
              rows={1}
              style={{ minHeight: '48px', maxHeight: '120px', height: '48px' }}
              maxLength={500}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-mono pointer-events-none">
              {input.length}/500
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="h-12 px-6 bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-xl text-white font-medium flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            <Send className="w-4 h-4" />
            发送
          </motion.button>
        </div>
      </div>
    </div>
  )
}

// 添加缺失的导入
import { MessageSquare } from 'lucide-react'

export default ChatMain
