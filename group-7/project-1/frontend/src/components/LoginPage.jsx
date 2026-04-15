import { useState } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, User, Lock, ChevronRight, BarChart3 } from 'lucide-react'

const LoginPage = ({ onLogin }) => {
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('123456')
  const [role, setRole] = useState('manager')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    setTimeout(() => {
      onLogin({
        username,
        role,
        displayName: role === 'manager' ? '投资经理' : '分析师'
      })
      setIsSubmitting(false)
    }, 800)
  }

  return (
    <div className="min-h-screen bg-dark-900 relative overflow-hidden flex items-center justify-center">
      {/* 背景装饰 */}
      <div className="absolute inset-0 data-grid opacity-30" />
      
      {/* 渐变光晕 */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
      
      {/* 数据装饰线条 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.5 }}
        className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.7 }}
        className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent"
      />

      {/* 登录卡片 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md px-4"
      >
        {/* Logo区域 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl glass mb-4 glow-emerald">
            <TrendingUp className="w-10 h-10 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-bold gradient-text mb-2">
            投研问答助手
          </h1>
          <p className="text-gray-400 text-sm font-mono">
            InvestQA Assistant
          </p>
        </motion.div>

        {/* 登录表单 */}
        <motion.form
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          onSubmit={handleSubmit}
          className="glass rounded-2xl p-8 space-y-6"
        >
          {/* 用户名 */}
          <div className="space-y-2">
            <label className="text-sm text-gray-400 flex items-center gap-2">
              <User className="w-4 h-4" />
              用户名
            </label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-dark-700/50 border border-dark-400 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                placeholder="请输入用户名"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-mono">
                admin
              </div>
            </div>
          </div>

          {/* 密码 */}
          <div className="space-y-2">
            <label className="text-sm text-gray-400 flex items-center gap-2">
              <Lock className="w-4 h-4" />
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-dark-700/50 border border-dark-400 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
              placeholder="请输入密码"
            />
          </div>

          {/* 角色选择 */}
          <div className="space-y-2">
            <label className="text-sm text-gray-400 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              选择角色
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('manager')}
                className={`py-3 px-4 rounded-xl border transition-all flex items-center gap-2 ${
                  role === 'manager'
                    ? 'bg-manager/20 border-manager text-manager-light'
                    : 'bg-dark-700/30 border-dark-400 text-gray-400 hover:border-gray-500'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${role === 'manager' ? 'bg-manager' : 'bg-gray-500'}`} />
                <span className="text-sm font-medium">投资经理</span>
              </button>
              <button
                type="button"
                onClick={() => setRole('analyst')}
                className={`py-3 px-4 rounded-xl border transition-all flex items-center gap-2 ${
                  role === 'analyst'
                    ? 'bg-analyst/20 border-analyst text-analyst-light'
                    : 'bg-dark-700/30 border-dark-400 text-gray-400 hover:border-gray-500'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${role === 'analyst' ? 'bg-analyst' : 'bg-gray-500'}`} />
                <span className="text-sm font-medium">分析师</span>
              </button>
            </div>
          </div>

          {/* 登录按钮 */}
          <motion.button
            type="submit"
            disabled={isSubmitting}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-xl text-white font-medium flex items-center justify-center gap-2 hover:from-emerald-500 hover:to-emerald-400 transition-all shadow-lg shadow-emerald-500/25 disabled:opacity-50"
          >
            {isSubmitting ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
              />
            ) : (
              <>
                登录系统
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </motion.button>
        </motion.form>

        {/* 底部信息 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 text-center"
        >
          <p className="text-xs text-gray-500 font-mono">
            Powered by AI Research Platform
          </p>
        </motion.div>
      </motion.div>

      {/* 角落装饰 */}
      <div className="absolute top-4 left-4 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-xs text-gray-500 font-mono">ONLINE</span>
      </div>
    </div>
  )
}

export default LoginPage
