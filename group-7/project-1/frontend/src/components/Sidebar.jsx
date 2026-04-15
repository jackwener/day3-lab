import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, Plus, Trash2, FileText, Star, ChevronLeft, Search, Loader2 } from 'lucide-react'

const Sidebar = ({
  sessions,
  currentSession,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  currentPage,
  onNavigate,
  isLoading,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)

  const menuItems = [
    { id: 'chat', label: '问答助手', icon: MessageSquare },
    { id: 'report', label: '研报管理', icon: FileText },
    { id: 'favorite', label: '我的收藏', icon: Star },
  ]

  const filteredSessions = sessions.filter(s => 
    s.title.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // 格式化时间
  const formatTime = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now - date
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    
    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    if (hours < 24) return `${hours}小时前`
    if (days < 7) return `${days}天前`
    return date.toLocaleDateString('zh-CN')
  }

  const handleDeleteClick = (e, sessionId) => {
    e.stopPropagation()
    setShowDeleteConfirm(sessionId)
  }

  const confirmDelete = () => {
    if (showDeleteConfirm) {
      onDeleteSession(showDeleteConfirm)
      setShowDeleteConfirm(null)
    }
  }

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className={`bg-dark-800/50 backdrop-blur-xl border-r border-dark-400/30 flex flex-col transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-72'
      }`}
    >
      {/* 顶部折叠按钮 */}
      <div className="h-12 flex items-center justify-between px-3 border-b border-dark-400/30">
        {!isCollapsed && (
          <span className="text-xs text-gray-500 font-mono uppercase tracking-wider">
            Navigation
          </span>
        )}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-dark-600/50 transition-all"
        >
          <ChevronLeft className={`w-4 h-4 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} />
        </motion.button>
      </div>

      {!isCollapsed && (
        <>
          {/* 菜单导航 */}
          <nav className="p-3 border-b border-dark-400/30">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = currentPage === item.id
              return (
                <motion.button
                  key={item.id}
                  whileHover={{ x: 4 }}
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all mb-1 ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'text-gray-400 hover:text-white hover:bg-dark-600/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  {isActive && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  )}
                </motion.button>
              )
            })}
          </nav>

          {/* 新建会话按钮 */}
          <div className="p-3 border-b border-dark-400/30">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onNewSession}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 text-white text-sm font-medium shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              新建对话
            </motion.button>
          </div>

          {/* 搜索框 */}
          <div className="p-3 border-b border-dark-400/30">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="搜索历史..."
                className="w-full bg-dark-700/50 border border-dark-400 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 transition-all"
              />
            </div>
          </div>

          {/* 历史会话列表 */}
          <div className="flex-1 overflow-y-auto p-3">
            <div className="text-xs text-gray-500 font-mono mb-2 px-2">
              历史对话 {sessions.length > 0 && `(${sessions.length})`}
            </div>
            
            {filteredSessions.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                {searchTerm ? '未找到匹配的会话' : '暂无会话，点击上方按钮创建'}
              </div>
            ) : (
              <AnimatePresence>
                {filteredSessions.map((session, index) => (
                  <motion.div
                    key={session.session_id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ delay: index * 0.05 }}
                    className={`group relative flex items-start gap-2 p-3 rounded-lg cursor-pointer transition-all mb-2 ${
                      currentSession === session.session_id
                        ? 'bg-emerald-500/10 border border-emerald-500/20'
                        : 'hover:bg-dark-600/50'
                    }`}
                    onClick={() => onSelectSession(session.session_id)}
                  >
                    <MessageSquare className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-300 truncate">
                        {session.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-gray-500 font-mono">
                          {formatTime(session.updated_at || session.created_at)}
                        </p>
                        {session.query_count > 0 && (
                          <span className="text-xs text-gray-600">
                            · {session.query_count}条对话
                          </span>
                        )}
                      </div>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => handleDeleteClick(e, session.session_id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-500 hover:text-red-400 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </motion.button>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </>
      )}

      {/* 折叠状态下的图标 */}
      {isCollapsed && (
        <div className="flex flex-col items-center py-3 gap-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = currentPage === item.id
            return (
              <motion.button
                key={item.id}
                whileHover={{ scale: 1.1 }}
                onClick={() => onNavigate(item.id)}
                className={`p-2.5 rounded-lg transition-all ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'text-gray-500 hover:text-white hover:bg-dark-600/50'
                }`}
              >
                <Icon className="w-5 h-5" />
              </motion.button>
            )
          })}
          <motion.button
            whileHover={{ scale: 1.1 }}
            onClick={onNewSession}
            disabled={isLoading}
            className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all mt-2 disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Plus className="w-5 h-5" />
            )}
          </motion.button>
        </div>
      )}

      {/* 删除确认弹窗 */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass rounded-xl p-6 m-4 max-w-sm w-full"
            >
              <h3 className="text-lg font-semibold text-white mb-2">确认删除</h3>
              <p className="text-gray-400 text-sm mb-6">
                确定要删除这个会话吗？该操作不可撤销，会话中的所有问答记录都将被删除。
              </p>
              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 py-2.5 bg-dark-600/50 rounded-lg text-gray-300 text-sm hover:bg-dark-600 transition-all"
                >
                  取消
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={confirmDelete}
                  className="flex-1 py-2.5 bg-red-500/20 rounded-lg text-red-400 text-sm hover:bg-red-500/30 transition-all border border-red-500/30"
                >
                  删除
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  )
}

export default Sidebar
