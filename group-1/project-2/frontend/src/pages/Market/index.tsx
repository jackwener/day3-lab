import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { Skeleton, Button } from 'antd'
import { ReloadOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { useMarketPrice, type HistoryRange } from '../../hooks/useMarketPrice'
import './index.css'

// 注册 ECharts 组件
echarts.use([
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  CanvasRenderer,
])

// Tab 配置
const TABS: { key: HistoryRange; label: string }[] = [
  { key: 'realtime', label: '实时' },
  { key: '1month', label: '近1月' },
  { key: '3month', label: '近3月' },
]

// 格式化价格
const formatPrice = (price: number | undefined | null): string => {
  if (price == null || isNaN(price)) return '---'
  return `¥${price.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// 格式化时间
const formatTime = (timestamp: string | null): string => {
  if (!timestamp) return '--:--:--'
  return dayjs(timestamp).format('HH:mm:ss')
}

// 检查数据是否过期（超过5分钟）
const isDataStale = (timestamp: string | null): boolean => {
  if (!timestamp) return true
  const diff = dayjs().diff(dayjs(timestamp), 'minute')
  return diff > 5
}

export default function Market() {
  const {
    currentPrice,
    priceUpdatedAt,
    priceHistory,
    loading,
    historyLoading,
    error,
    fetchPrice,
    fetchHistory,
  } = useMarketPrice()

  const [activeTab, setActiveTab] = useState<HistoryRange>('realtime')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [prevPrice, setPrevPrice] = useState<number | null>(null)
  const [priceChanged, setPriceChanged] = useState(false)

  // 监听价格变化，触发跳动动画
  useEffect(() => {
    if (currentPrice !== null && prevPrice !== null && currentPrice !== prevPrice) {
      setPriceChanged(true)
      const timer = setTimeout(() => setPriceChanged(false), 600)
      return () => clearTimeout(timer)
    }
    setPrevPrice(currentPrice)
  }, [currentPrice, prevPrice])

  // Tab 切换
  const handleTabChange = (tab: HistoryRange) => {
    setActiveTab(tab)
    fetchHistory(tab)
  }

  // 手动刷新
  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchPrice()
    await fetchHistory(activeTab)
    setTimeout(() => setIsRefreshing(false), 500)
  }

  // 计算统计数据
  const stats = useMemo(() => {
    // 安全检查：确保 priceHistory 是数组
    if (!Array.isArray(priceHistory) || priceHistory.length === 0) {
      return { high: null, low: null, avg: null }
    }
    const prices = priceHistory.map((item) => item.price)
    const high = Math.max(...prices)
    const low = Math.min(...prices)
    const avg = prices.reduce((sum, p) => sum + p, 0) / prices.length
    return { high, low, avg }
  }, [priceHistory])

  // ECharts 配置
  const chartOption = useMemo(() => {
    // 安全检查：确保 priceHistory 是数组
    if (!Array.isArray(priceHistory) || priceHistory.length === 0) {
      return {}
    }

    const xData = priceHistory.map((item) => {
      const date = dayjs(item.timestamp)
      if (activeTab === 'realtime') {
        return date.format('HH:mm')
      }
      return date.format('MM-DD')
    })
    const yData = priceHistory.map((item) => item.price)

    return {
      backgroundColor: 'transparent',
      grid: {
        top: 20,
        right: 20,
        bottom: 40,
        left: 60,
        containLabel: false,
      },
      xAxis: {
        type: 'category',
        data: xData,
        axisLine: {
          lineStyle: { color: 'rgba(255,255,255,0.1)' },
        },
        axisLabel: {
          color: 'rgba(255,255,255,0.5)',
          fontSize: 10,
          interval: activeTab === 'realtime' ? 3 : 'auto',
        },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        scale: true,
        axisLine: { show: false },
        axisLabel: {
          color: 'rgba(255,255,255,0.5)',
          fontSize: 10,
          formatter: (value: number) => (value == null || isNaN(value) ? '0' : value.toFixed(0)),
        },
        splitLine: {
          lineStyle: { color: 'rgba(255,255,255,0.05)' },
        },
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(26, 26, 46, 0.95)',
        borderColor: 'rgba(212, 168, 67, 0.5)',
        borderWidth: 1,
        textStyle: { color: '#fff', fontSize: 12 },
        formatter: (params: any) => {
          const data = params[0]
          const value = data?.value
          const formattedValue = value == null || isNaN(value) ? '---' : Number(value).toFixed(2)
          return `<div style="font-weight:600">${data?.name || '--'}</div>
                  <div style="color:#D4A843">¥${formattedValue}</div>`
        },
      },
      series: [
        {
          type: 'line',
          data: yData,
          smooth: true,
          symbol: 'none',
          lineStyle: {
            width: 3,
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: '#D4A843' },
              { offset: 1, color: '#F0D78C' },
            ]),
            shadowColor: 'rgba(212, 168, 67, 0.5)',
            shadowBlur: 10,
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(212, 168, 67, 0.3)' },
              { offset: 1, color: 'rgba(212, 168, 67, 0)' },
            ]),
          },
          animationDuration: 1500,
          animationEasing: 'cubicInOut',
        },
      ],
    }
  }, [priceHistory, activeTab])

  const dataStale = isDataStale(priceUpdatedAt)

  return (
    <motion.div
      className="market-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="market-container">
        {/* 顶部金价展示区域 */}
        <motion.div
          className="price-section"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="price-header">
            <div>
              <span className="price-label">实时金价</span>
              {dataStale && (
                <motion.span
                  className="stale-badge"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <ExclamationCircleOutlined /> 数据可能延迟
                </motion.span>
              )}
            </div>
            <motion.button
              className="refresh-btn"
              onClick={handleRefresh}
              whileTap={{ scale: 0.9 }}
              disabled={isRefreshing}
            >
              <ReloadOutlined className={isRefreshing ? 'spinning' : ''} />
            </motion.button>
          </div>

          <div className="price-display">
            {loading && !currentPrice ? (
              <Skeleton.Input active className="price-skeleton" />
            ) : (
              <motion.div
                className="price-value-wrapper"
                animate={priceChanged ? { scale: [1, 1.05, 1] } : {}}
                transition={{ duration: 0.4 }}
              >
                <span className="price-value">{formatPrice(currentPrice)}</span>
                <span className="price-unit">/克</span>
              </motion.div>
            )}
          </div>

          <div className="price-footer">
            <span className="update-time">
              {dataStale
                ? `更新于 ${formatTime(priceUpdatedAt)}`
                : `更新于 ${formatTime(priceUpdatedAt)}`}
            </span>
          </div>
        </motion.div>

        {/* 错误提示 */}
        {error && (
          <motion.div
            className="error-banner"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <ExclamationCircleOutlined />
            <span>{error}</span>
            <Button type="link" size="small" onClick={handleRefresh}>
              重试
            </Button>
          </motion.div>
        )}

        {/* Tab 切换区域 */}
        <motion.div
          className="tab-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="tab-container">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => handleTabChange(tab.key)}
              >
                {activeTab === tab.key && (
                  <motion.div
                    className="tab-indicator"
                    layoutId="tabIndicator"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <span className="tab-label">{tab.label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* 图表区域 */}
        <motion.div
          className="chart-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="chart-container glass-card">
            <AnimatePresence mode="wait">
              {historyLoading ? (
                <motion.div
                  key="skeleton"
                  className="chart-skeleton"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Skeleton active paragraph={{ rows: 6 }} title={false} />
                </motion.div>
              ) : priceHistory && priceHistory.length > 0 ? (
                <motion.div
                  key="chart"
                  className="chart-wrapper"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ReactEChartsCore
                    echarts={echarts}
                    option={chartOption}
                    style={{ height: '300px', width: '100%' }}
                    notMerge={true}
                    lazyUpdate={false}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  className="chart-empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <p>暂无数据</p>
                  <Button type="primary" ghost onClick={handleRefresh}>
                    重新加载
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* 统计卡片区域 */}
        <motion.div
          className="stats-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <div className="stats-grid">
            {[
              { label: '最高价', value: stats.high, delay: 0 },
              { label: '最低价', value: stats.low, delay: 0.1 },
              { label: '均价', value: stats.avg, delay: 0.2 },
            ].map((stat) => (
              <motion.div
                key={stat.label}
                className="stat-card glass-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.5 + stat.delay }}
              >
                <span className="stat-label">{stat.label}</span>
                <span className="stat-value">
                  {stat.value != null && !isNaN(stat.value)
                    ? `¥${stat.value.toFixed(2)}`
                    : '---'}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
