import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, LogOut, FileText, Star, Bell, Wifi, WifiOff, Zap, X, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { getCapabilities } from '../api'

const Header = ({ user, onLogout, currentPage, onNavigate }) => {
  const [capabilities, setCapabilities] = useState({
    copaw_configured: false,
    bailian_configured: false,
    demo_available: true,
    version: 'v1.0',
  })
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: 'info',
      title: '系统更新',
      message: '投研问答助手已更新至 v1.0 版本',
      time: '2小时前',
      read: false
    },
    {
      id: 2,
      type: 'success',
      title: '研报分析完成',
      message: '您上传的研报已完成分析',
      time: '5小时前',
      read: false
    }
  ])

  useEffect(() => {
    loadCapabilities()
  }, [])

  const loadCapabilities = async () => {
    try {
      const data = await getCapabilities()
      setCapabilities(data)
    } catch (error) {
      console.error('Failed to load capabilities:', error)
      // 使用默认值，不显示loading
    }
  }

  // 确定当前激活的能力
  const getActiveCapability = () => {
    if (!capabilities) return null
    if (capabilities.copaw_configured) return 'copaw'
    if (capabilities.bailian_configured) return 'bailian'
    if (capabilities.demo_available) return 'demo'
    return null
  }

  const activeCapability = getActiveCapability()

  // 未读通知数量
  const unreadCount = notifications.filter(n => !n.read).length

  // 标记通知为已读
  const markAsRead = (id) => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, read: true } : n
    ))
  }

  // 标记所有通知为已读
  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  // 删除通知
  const deleteNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  // 获取通知图标
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-emerald-400" />
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-amber-400" />
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-400" />
      default:
        return <Info className="w-4 h-4 text-blue-400" />
    }
  }

  const navItems = [
    { id: 'favorite', label: '收藏夹', icon: Star },
    { id: 'report', label: '研报管理', icon: FileText },
  ]

  return (
    <header className="h-16 bg-dark-800/80 backdrop-blur-xl border-b border-dark-400/50 flex items-center justify-between px-6 relative z-20">
      {/* Logo区域 */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-3"
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <TrendingUp className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">投研问答助手</h1>
          <p className="text-xs text-gray-500 font-mono">InvestQA Platform</p>
        </div>
      </motion.div>

      {/* 中间能力状态芯片 */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3"
      >
        {/* 能力状态芯片 */}
        {capabilities && (
          <div className="flex items-center gap-2">
            {/* CoPaw 状态 */}
            {capabilities.copaw_configured && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 ${
                  activeCapability === 'copaw'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-lg shadow-emerald-500/10'
                    : 'bg-dark-600/50 text-gray-500 border border-dark-400/30'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                CoPaw 桥接
                {activeCapability === 'copaw' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </motion.div>
            )}

            {/* 百炼状态 */}
            {capabilities.bailian_configured && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.05 }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 ${
                  activeCapability === 'bailian'
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40 shadow-lg shadow-blue-500/10'
                    : 'bg-dark-600/50 text-gray-500 border border-dark-400/30'
                }`}
              >
                <Wifi className="w-3.5 h-3.5" />
                百炼
                {activeCapability === 'bailian' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                )}
              </motion.div>
            )}

            {/* 系统状态 */}
            {capabilities.demo_available && !capabilities.copaw_configured && !capabilities.bailian_configured && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
              >
                <Wifi className="w-3.5 h-3.5" />
                系统正常
              </motion.div>
            )}
          </div>
        )}


      </motion.div>

      {/* 右侧用户区域 */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-4"
      >
        {/* 导航按钮 */}
        <div className="flex items-center gap-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = currentPage === item.id
            return (
              <motion.button
                key={item.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onNavigate(item.id)}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition-all ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'text-gray-400 hover:text-white hover:bg-dark-600/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </motion.button>
            )
          })}
        </div>

        {/* 通知按钮 */}
        <div className="relative">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg text-gray-400 hover:text-white hover:bg-dark-600/50 transition-all"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full" />
            )}
          </motion.button>

          {/* 通知面板 */}
          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-80 bg-dark-800 border border-dark-400 rounded-xl shadow-xl overflow-hidden z-50"
              >
                {/* 头部 */}
                <div className="flex items-center justify-between p-4 border-b border-dark-400/30">
                  <h3 className="text-sm font-medium text-white">通知</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-emerald-400 hover:text-emerald-300 transition-all"
                    >
                      全部已读
                    </button>
                  )}
                </div>

                {/* 通知列表 */}
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-gray-500 text-sm">
                      暂无通知
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`p-4 border-b border-dark-400/20 hover:bg-dark-700/30 transition-all cursor-pointer ${
                          !notification.read ? 'bg-dark-700/20' : ''
                        }`}
                        onClick={() => markAsRead(notification.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h4 className={`text-sm font-medium truncate ${
                                !notification.read ? 'text-white' : 'text-gray-400'
                              }`}>
                                {notification.title}
                              </h4>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  deleteNotification(notification.id)
                                }}
                                className="p-1 rounded text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                              {notification.time}
                            </p>
                          </div>
                          {!notification.read && (
                            <span className="w-2 h-2 bg-emerald-500 rounded-full flex-shrink-0 mt-1.5" />
                          )}
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>

                {/* 底部 */}
                {notifications.length > 0 && (
                  <div className="p-3 border-t border-dark-400/30 text-center">
                    <button
                      onClick={() => setNotifications([])}
                      className="text-xs text-gray-500 hover:text-gray-400 transition-all"
                    >
                      清空所有通知
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 用户角色标签 */}
        <div className={`px-4 py-2 rounded-lg text-sm font-medium ${
          user.role === 'manager'
            ? 'bg-manager/20 text-manager-light border border-manager/30'
            : 'bg-analyst/20 text-analyst-light border border-analyst/30'
        }`}>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              user.role === 'manager' ? 'bg-manager' : 'bg-analyst'
            }`} />
            {user.displayName}
          </div>
        </div>

        {/* 登出按钮 */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onLogout}
          className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <LogOut className="w-5 h-5" />
        </motion.button>
      </motion.div>
    </header>
  )
}

export default Header
