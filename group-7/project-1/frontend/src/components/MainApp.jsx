import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Header from './Header'
import Sidebar from './Sidebar'
import ChatMain from './ChatMain'
import RightSidebar from './RightSidebar'
import ReportManagement from './ReportManagement'
import Favorites from './Favorites'
import { 
  getSessions, 
  createSession, 
  deleteSession, 
  updateSessionTitle,
  getSessionRecords,
  askQuestion,
  getReports,
} from '../api'
import { getFavorites, addFavorite, removeFavorite } from '../utils/storage'

const MainApp = ({ user, onLogout }) => {
  const [currentPage, setCurrentPage] = useState('chat')
  
  // 会话状态
  const [sessions, setSessions] = useState([])
  const [currentSession, setCurrentSession] = useState(null)
  const [records, setRecords] = useState([])
  
  // 研报状态
  const [reports, setReports] = useState([])
  
  // 收藏状态
  const [favorites, setFavorites] = useState([])
  
  // UI状态
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isTyping, setIsTyping] = useState(false)

  // 初始化加载
  useEffect(() => {
    loadData()
    setFavorites(getFavorites())
  }, [])

  // 加载所有数据
  const loadData = async () => {
    try {
      await Promise.all([loadSessions(), loadReports()])
    } catch (error) {
      console.error('Failed to load data:', error)
    }
  }

  // 加载会话列表
  const loadSessions = async () => {
    try {
      const data = await getSessions()
      const sessionList = data.sessions || []
      setSessions(sessionList)
      // 默认选中第一个会话
      if (sessionList.length > 0 && !currentSession) {
        handleSelectSession(sessionList[0].session_id)
      }
    } catch (error) {
      console.error('Failed to load sessions:', error)
      // 如果后端未启动，使用空数据
      setSessions([])
    }
  }

  // 加载研报列表
  const loadReports = async () => {
    try {
      const data = await getReports()
      setReports(data.reports || [])
    } catch (error) {
      console.error('Failed to load reports:', error)
      setReports([])
    }
  }

  // 选择会话并加载记录
  const handleSelectSession = async (sessionId) => {
    setCurrentSession(sessionId)
    setError(null)
    try {
      const data = await getSessionRecords(sessionId)
      setRecords(data.records || [])
    } catch (error) {
      console.error('Failed to load records:', error)
      setError(error.message)
      setRecords([])
    }
  }

  // 新建会话
  const handleNewSession = async () => {
    setIsLoading(true)
    try {
      const data = await createSession()
      const newSession = {
        session_id: data.session_id,
        title: data.title,
        created_at: data.created_at,
        query_count: data.query_count || 0,
        updated_at: data.created_at,
      }
      setSessions(prev => [newSession, ...prev])
      setCurrentSession(newSession.session_id)
      setRecords([])
    } catch (error) {
      console.error('Error in handleNewSession:', error)
      // 如果 createSession 失败，手动创建本地会话
      const newSession = {
        session_id: `local_${Date.now()}`,
        title: '新会话',
        created_at: new Date().toISOString(),
        query_count: 0,
        updated_at: new Date().toISOString(),
      }
      setSessions(prev => [newSession, ...prev])
      setCurrentSession(newSession.session_id)
      setRecords([])
    } finally {
      setIsLoading(false)
    }
  }

  // 删除会话
  const handleDeleteSession = async (sessionId) => {
    try {
      await deleteSession(sessionId)
      setSessions(sessions.filter(s => s.session_id !== sessionId))
      if (currentSession === sessionId) {
        const remaining = sessions.filter(s => s.session_id !== sessionId)
        if (remaining.length > 0) {
          handleSelectSession(remaining[0].session_id)
        } else {
          setCurrentSession(null)
          setRecords([])
        }
      }
    } catch (error) {
      console.error('Failed to delete session:', error)
      setError(error.message)
    }
  }

  // 发送消息
  const handleSendMessage = async (query) => {
    if (!currentSession) {
      setError('请先选择或创建一个会话')
      return
    }

    setIsTyping(true)
    setError(null)

    // 添加用户消息到列表
    const userMsg = {
      record_id: `temp_${Date.now()}`,
      query,
      timestamp: new Date().toISOString(),
      pending: true,
    }
    setRecords([...records, userMsg])

    try {
      const data = await askQuestion(query, currentSession)
      
      // 更新消息列表
      const aiMsg = {
        record_id: data.traceId || `rec_${Date.now()}`,
        query,
        answer: data.answer,
        timestamp: new Date().toISOString(),
        llm_used: data.llm_used,
        model: data.model,
        answer_source: data.answer_source,
        sources: data.sources || [],
        response_time_ms: data.response_time_ms,
      }
      
      // 移除pending标记，添加AI回复
      setRecords(prev => [...prev.filter(r => !r.pending), aiMsg])

      // 首次问答后更新会话标题（query_count从0→1）
      const currentSessionData = sessions.find(s => s.session_id === currentSession)
      if (currentSessionData && currentSessionData.query_count === 0) {
        const newTitle = query.slice(0, 20) + (query.length > 20 ? '...' : '')
        try {
          await updateSessionTitle(currentSession, newTitle)
          setSessions(sessions.map(s => 
            s.session_id === currentSession 
              ? { ...s, title: newTitle, query_count: 1, updated_at: new Date().toISOString() }
              : s
          ))
        } catch (err) {
          console.error('Failed to update session title:', err)
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      setError(error.message)
      // 移除pending消息
      setRecords(prev => prev.filter(r => !r.pending))
    } finally {
      setIsTyping(false)
    }
  }

  // 收藏切换
  const handleToggleFavorite = useCallback((record) => {
    const existing = favorites.find(f => f.record_id === record.record_id)
    if (existing) {
      const updated = removeFavorite(record.record_id)
      setFavorites(updated)
    } else {
      const updated = addFavorite(record)
      setFavorites(updated)
    }
  }, [favorites])

  // 移除收藏
  const handleRemoveFavorite = (recordId) => {
    const updated = removeFavorite(recordId)
    setFavorites(updated)
  }

  // 渲染页面
  const renderPage = () => {
    switch (currentPage) {
      case 'report':
        return <ReportManagement reports={reports} onRefresh={loadReports} />
      case 'favorite':
        return (
          <Favorites 
            favorites={favorites} 
            onRemoveFavorite={handleRemoveFavorite}
          />
        )
      default:
        return (
          <div className="flex flex-1 overflow-hidden">
            <ChatMain
              records={records}
              currentSession={currentSession}
              onSendMessage={handleSendMessage}
              onToggleFavorite={handleToggleFavorite}
              favorites={favorites}
              isTyping={isTyping}
              error={error}
              role={user.role}
            />
            <RightSidebar 
              role={user.role} 
              reports={reports} 
              onQuickQuestion={handleSendMessage}
              currentSession={currentSession}
            />
          </div>
        )
    }
  }

  return (
    <div className="h-screen flex flex-col bg-dark-900 overflow-hidden">
      {/* 背景装饰 */}
      <div className="fixed inset-0 data-grid opacity-20 pointer-events-none" />
      <div className="fixed top-0 right-0 w-1/2 h-1/2 bg-glow-emerald pointer-events-none" />
      
      {/* 头部 */}
      <Header 
        user={user} 
        onLogout={onLogout}
        currentPage={currentPage}
        onNavigate={setCurrentPage}
      />
      
      {/* 主内容区域 */}
      <div className="flex flex-1 overflow-hidden relative z-10">
        {/* 左侧边栏 */}
        <Sidebar
          sessions={sessions}
          currentSession={currentSession}
          onSelectSession={handleSelectSession}
          onNewSession={handleNewSession}
          onDeleteSession={handleDeleteSession}
          currentPage={currentPage}
          onNavigate={setCurrentPage}
          isLoading={isLoading}
        />
        
        {/* 主内容 */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex overflow-hidden"
          >
            {renderPage()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

export default MainApp
