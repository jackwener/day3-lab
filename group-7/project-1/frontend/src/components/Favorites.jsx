import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, Trash2, FileText, Calendar, FileDown, ExternalLink, FileJson, FileText as FileTxt } from 'lucide-react'
import { exportRecords } from '../api'
import { removeFavorite as removeFromStorage } from '../utils/storage'

const Favorites = ({ favorites, onRemoveFavorite }) => {
  const [exportingFormat, setExportingFormat] = useState(null)
  const [error, setError] = useState(null)

  const handleExport = async (format) => {
    setExportingFormat(format)
    setError(null)
    
    try {
      // 由于收藏可能来自不同会话，这里简化处理
      // 生成JSON文件下载
      const data = {
        exported_at: new Date().toISOString(),
        favorites: favorites,
      }
      
      const blob = new Blob(
        [JSON.stringify(data, null, 2)],
        { type: 'application/json' }
      )
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `favorites_${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
      setError(error.message)
    } finally {
      setExportingFormat(null)
    }
  }

  const handleExportTxt = () => {
    setExportingFormat('txt')
    setError(null)
    
    try {
      const lines = favorites.map((item, index) => {
        return [
          `【收藏 ${index + 1}】`,
          `问题：${item.query}`,
          `回答：${item.answer}`,
          item.sources?.[0]?.report_title ? `来源：${item.sources[0].report_title}` : '',
          item.timestamp ? `时间：${new Date(item.timestamp).toLocaleString('zh-CN')}` : '',
          '',
        ].filter(Boolean).join('\n')
      })
      
      const content = `投研问答助手 - 收藏导出\n导出时间：${new Date().toLocaleString('zh-CN')}\n${'='.repeat(50)}\n\n${lines.join('\n' + '-'.repeat(50) + '\n\n')}`
      
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `favorites_${new Date().toISOString().slice(0, 10)}.txt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
      setError(error.message)
    } finally {
      setExportingFormat(null)
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-dark-900/50 overflow-hidden">
      {/* 头部 */}
      <div className="p-6 border-b border-dark-400/30">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">收藏夹</h2>
            <p className="text-sm text-gray-500 mt-1">
              已收藏 {favorites.length} 条问答
            </p>
          </div>
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleExport('json')}
              disabled={favorites.length === 0 || exportingFormat !== null}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-lg text-white text-sm font-medium shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exportingFormat === 'json' ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                />
              ) : (
                <FileJson className="w-4 h-4" />
              )}
              导出 JSON
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleExportTxt}
              disabled={favorites.length === 0 || exportingFormat !== null}
              className="flex items-center gap-2 px-4 py-2.5 bg-dark-700/50 border border-dark-400 rounded-lg text-gray-300 text-sm hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exportingFormat === 'txt' ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-4 h-4 border-2 border-gray-400/30 border-t-gray-400 rounded-full"
                />
              ) : (
                <FileTxt className="w-4 h-4" />
              )}
              导出 TXT
            </motion.button>
          </div>
        </div>
      </div>

      {/* 收藏列表 */}
      <div className="flex-1 overflow-y-auto p-6">
        {favorites.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full text-center"
          >
            <div className="w-20 h-20 rounded-2xl bg-dark-700/50 flex items-center justify-center mb-6">
              <Star className="w-10 h-10 text-gray-600" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">暂无收藏内容</h3>
            <p className="text-gray-500 text-sm max-w-md">
              在对话中点击星星图标即可收藏重要问答，方便后续查阅和导出
            </p>
          </motion.div>
        ) : (
          <div className="grid gap-4">
            <AnimatePresence>
              {favorites.map((item, index) => (
                <motion.div
                  key={item.record_id || index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                  className="glass rounded-xl p-5 card-hover"
                >
                  {/* 问题 */}
                  <div className="mb-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-emerald-400 text-sm font-semibold">Q</span>
                      </div>
                      <h3 className="text-white font-medium leading-relaxed">
                        {item.query}
                      </h3>
                    </div>
                  </div>

                  {/* 回答 */}
                  {item.answer && (
                    <div className="mb-4 pl-11">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-amber-400 text-sm font-semibold">A</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                            {item.answer}
                          </p>
                          
                          {/* 来源信息 */}
                          {item.sources && item.sources.length > 0 && (
                            <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <FileText className="w-3.5 h-3.5" />
                                {item.sources[0].report_title}
                              </span>
                              {item.sources[0].date && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5" />
                                  {item.sources[0].date}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 操作栏 */}
                  <div className="flex items-center justify-between pt-4 border-t border-dark-400/30 mt-4">
                    <span className="text-xs text-gray-500">
                      收藏于 {item.favorited_at ? new Date(item.favorited_at).toLocaleString('zh-CN') : '未知时间'}
                    </span>
                    <div className="flex items-center gap-2">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onRemoveFavorite(item.record_id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all text-sm"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        取消收藏
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}

export default Favorites
