import { motion } from 'framer-motion'
import { Database, FileText, Building, Tag, TrendingUp, BarChart3 } from 'lucide-react'

const RightSidebar = ({ role, reports = [], onQuickQuestion, currentSession }) => {
  const quickQuestions = role === 'manager'
    ? [
        { text: '投资评级', count: 12 },
        { text: '风险点', count: 8 },
        { text: '估值分析', count: 15 },
        { text: '行业对比', count: 6 },
      ]
    : [
        { text: '财务分析', count: 10 },
        { text: '行业格局', count: 7 },
        { text: '趋势预测', count: 12 },
        { text: '竞争分析', count: 9 },
      ]

  // 计算行业分布
  const industryStats = reports.reduce((acc, report) => {
    if (report.industry) {
      acc[report.industry] = (acc[report.industry] || 0) + 1
    }
    return acc
  }, {})

  const industries = Object.entries(industryStats)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4)

  // 颜色映射
  const getColorClass = (index) => {
    const colors = ['emerald', 'amber', 'blue', 'purple']
    return colors[index % colors.length]
  }

  // 处理快捷问题点击
  const handleQuickQuestionClick = (text) => {
    if (!currentSession) {
      alert('请先选择或创建一个会话')
      return
    }
    onQuickQuestion(`请分析${text}`)
  }

  return (
    <motion.aside
      initial={{ x: 20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="w-80 bg-dark-800/50 backdrop-blur-xl border-l border-dark-400/30 flex flex-col"
    >
      {/* 知识库状态 */}
      <div className="p-4 border-b border-dark-400/30">
        <div className="flex items-center gap-2 mb-4">
          <Database className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-medium text-white">知识库状态</span>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-dark-700/30">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-400">已上传研报</span>
            </div>
            <span className="text-lg font-semibold text-emerald-400 font-mono">
              {reports.length}
            </span>
          </div>
          
          <div className="flex items-center justify-between p-3 rounded-lg bg-dark-700/30">
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-400">已分析研报</span>
            </div>
            <span className="text-lg font-semibold text-amber-400 font-mono">
              {reports.filter(r => r.status === 'analyzed').length}
            </span>
          </div>
          
          <div className="flex items-center justify-between p-3 rounded-lg bg-dark-700/30">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-400">覆盖行业</span>
            </div>
            <span className="text-lg font-semibold text-blue-400 font-mono">
              {Object.keys(industryStats).length}
            </span>
          </div>
        </div>
      </div>

      {/* 行业分布 */}
      <div className="p-4 border-b border-dark-400/30">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-medium text-white">行业分布</span>
        </div>
        
        {industries.length > 0 ? (
          <div className="space-y-2">
            {industries.map((industry, index) => (
              <div key={industry.name} className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-dark-600 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((industry.count / Math.max(...industries.map(i => i.count))) * 100, 100)}%` }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className={`h-full rounded-full ${
                      getColorClass(index) === 'emerald' ? 'bg-emerald-500' :
                      getColorClass(index) === 'amber' ? 'bg-amber-500' :
                      getColorClass(index) === 'blue' ? 'bg-blue-500' :
                      'bg-purple-500'
                    }`}
                  />
                </div>
                <span className="text-xs text-gray-400 w-16 truncate">{industry.name}</span>
                <span className="text-xs text-gray-500 font-mono w-4 text-right">{industry.count}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-500 text-center py-4">暂无行业数据</p>
        )}
      </div>

      {/* 快捷问题 */}
      <div className="p-4 flex-1">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-medium text-white">快捷问题</span>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {quickQuestions.map((q, index) => (
            <motion.button
              key={q.text}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleQuickQuestionClick(q.text)}
              className={`px-3 py-2 rounded-lg text-xs transition-all ${
                role === 'manager'
                  ? 'bg-manager/10 text-manager-light border border-manager/20 hover:bg-manager/20'
                  : 'bg-analyst/10 text-analyst-light border border-analyst/20 hover:bg-analyst/20'
              }`}
            >
              {q.text}
            </motion.button>
          ))}
        </div>
      </div>

      {/* 底部信息 */}
      <div className="p-4 border-t border-dark-400/30">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>最后更新</span>
          <span className="font-mono">{new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>
    </motion.aside>
  )
}

export default RightSidebar
