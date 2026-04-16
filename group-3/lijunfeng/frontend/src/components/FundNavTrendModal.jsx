import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { fetchFundNav } from '../api';

const PERIOD_OPTIONS = [
  { value: '1m', label: '1个月' },
  { value: '3m', label: '3个月' },
  { value: '6m', label: '6个月' },
  { value: '1y', label: '1年' },
];

/**
 * 格式化日期
 * @param {string} dateStr - 日期字符串
 * @returns {string} 格式化后的日期
 */
function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

/**
 * 格式化净值
 * @param {number} value - 净值数值
 * @returns {string} 格式化后的字符串
 */
function formatNav(value) {
  if (value === undefined || value === null) return '--';
  return value.toFixed(4);
}

/**
 * 净值趋势弹窗组件
 * @param {Object} props
 * @param {boolean} props.isOpen - 是否打开弹窗
 * @param {Function} props.onClose - 关闭弹窗的回调函数
 * @param {string} props.fundCode - 基金代码
 * @param {string} props.fundName - 基金名称
 */
function FundNavTrendModal({ isOpen, onClose, fundCode, fundName }) {
  const [navData, setNavData] = useState([]);
  const [period, setPeriod] = useState('3m');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && fundCode) {
      loadNavData();
    }
  }, [isOpen, fundCode, period]);

  const loadNavData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFundNav(fundCode, period);
      setNavData(data.navData || []);
    } catch (err) {
      setError(err.message || '加载净值数据失败');
      setNavData([]);
    } finally {
      setLoading(false);
    }
  };

  // 点击遮罩层关闭
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // 计算统计数据
  const stats = React.useMemo(() => {
    if (!navData || navData.length === 0) return null;
    const values = navData.map((item) => item.nav);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const first = values[0];
    const last = values[values.length - 1];
    const change = ((last - first) / first) * 100;
    return { max, min, change };
  }, [navData]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-800">{fundName}</h2>
            <p className="text-sm text-gray-500">{fundCode}</p>
          </div>
          <button
            onClick={onClose}
            className="
              w-8 h-8 flex items-center justify-center rounded-full
              text-gray-400 hover:text-gray-600 hover:bg-gray-100
              transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300
            "
            aria-label="关闭"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* 内容区 */}
        <div className="p-6 overflow-auto flex-1">
          {/* 时间范围切换 */}
          <div className="flex gap-2 mb-6">
            {PERIOD_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setPeriod(option.value)}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-all
                  ${
                    period === option.value
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }
                `}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* 加载状态 */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
              <span className="ml-3 text-gray-500">加载中...</span>
            </div>
          )}

          {/* 错误状态 */}
          {!loading && error && (
            <div className="text-center py-12">
              <div className="text-red-500 mb-2">{error}</div>
              <button
                onClick={loadNavData}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                重试
              </button>
            </div>
          )}

          {/* 图表 */}
          {!loading && !error && navData.length > 0 && (
            <>
              {/* 统计信息 */}
              {stats && (
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">区间涨跌</div>
                    <div
                      className={`text-lg font-bold ${
                        stats.change >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {stats.change >= 0 ? '+' : ''}
                      {stats.change.toFixed(2)}%
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">最高净值</div>
                    <div className="text-lg font-bold text-gray-800">
                      {formatNav(stats.max)}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">最低净值</div>
                    <div className="text-lg font-bold text-gray-800">
                      {formatNav(stats.min)}
                    </div>
                  </div>
                </div>
              )}

              {/* 折线图 */}
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={navData}
                    margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#e5e7eb"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDate}
                      tick={{ fontSize: 12, fill: '#6b7280' }}
                      axisLine={{ stroke: '#e5e7eb' }}
                      tickLine={false}
                      minTickGap={30}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: '#6b7280' }}
                      axisLine={false}
                      tickLine={false}
                      domain={['auto', 'auto']}
                      tickFormatter={(value) => value.toFixed(2)}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      }}
                      labelFormatter={(label) => `日期: ${label}`}
                      formatter={(value) => [formatNav(value), '累计净值']}
                    />
                    <Line
                      type="monotone"
                      dataKey="nav"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{
                        r: 4,
                        fill: '#3b82f6',
                        stroke: '#fff',
                        strokeWidth: 2,
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}

          {/* 空数据 */}
          {!loading && !error && navData.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              暂无净值数据
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FundNavTrendModal;
