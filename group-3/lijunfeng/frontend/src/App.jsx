import { useState, useEffect } from 'react';
import { fetchTimeline, fetchWeekDetail } from './api';
import Timeline from './components/Timeline';
import SituationCard from './components/SituationCard';
import ThematicFundCard from './components/ThematicFundCard';
import SmallScaleFundCard from './components/SmallScaleFundCard';
import FundNavTrendModal from './components/FundNavTrendModal';
import './App.css';

function App() {
  // 状态定义
  const [weeks, setWeeks] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [weekDetail, setWeekDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalFund, setModalFund] = useState(null);
  const [updateTime, setUpdateTime] = useState(null);

  // 页面加载时获取时间轴数据
  useEffect(() => {
    loadInitialData();
  }, []);

  // 加载初始数据
  const loadInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTimeline();
      const weeksData = data.weeks || [];
      setWeeks(weeksData);
      setUpdateTime(new Date().toLocaleString());

      // 默认选中最新一周（weekNumber 最大的）
      if (weeksData.length > 0) {
        const latestWeek = Math.max(...weeksData.map((w) => w.weekNumber));
        setSelectedWeek(latestWeek);
        await loadWeekDetail(latestWeek);
      }
    } catch (err) {
      setError(err.message || '加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载指定周的详细数据
  const loadWeekDetail = async (week) => {
    setLoading(true);
    setError(null);
    try {
      const detail = await fetchWeekDetail(week);
      setWeekDetail(detail);
    } catch (err) {
      setError(err.message || '加载周数据失败');
      setWeekDetail(null);
    } finally {
      setLoading(false);
    }
  };

  // 切换周节点
  const handleWeekSelect = async (week) => {
    if (week === selectedWeek) return;
    setSelectedWeek(week);
    await loadWeekDetail(week);
  };

  // 点击基金卡片
  const handleFundClick = (fundCode, fundName) => {
    setModalFund({ fundCode, fundName });
  };

  // 关闭弹窗
  const handleCloseModal = () => {
    setModalFund(null);
  };

  // 重试加载
  const handleRetry = () => {
    if (selectedWeek) {
      loadWeekDetail(selectedWeek);
    } else {
      loadInitialData();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部标题栏 */}
      <header className="bg-white shadow px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">基金投资分析 Demo</h1>
          {updateTime && (
            <span className="text-sm text-gray-500">
              更新时间: {updateTime}
            </span>
          )}
        </div>
      </header>

      {/* 主内容区 */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* 加载状态 */}
        {loading && weeks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
            <p className="mt-4 text-gray-500">加载中...</p>
          </div>
        )}

        {/* 错误状态 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-3">
              <svg
                className="w-6 h-6 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="flex-1">
                <h3 className="text-red-800 font-medium">加载失败</h3>
                <p className="text-red-600 text-sm mt-1">{error}</p>
              </div>
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                重试
              </button>
            </div>
          </div>
        )}

        {/* 正常内容 */}
        {!error && weeks.length > 0 && (
          <>
            {/* 时间轴 */}
            <section className="bg-white rounded-xl shadow-sm p-4 mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-2">时间轴</h2>
              <Timeline
                weeks={weeks}
                selectedWeek={selectedWeek}
                onWeekSelect={handleWeekSelect}
              />
            </section>

            {/* 局势卡片 */}
            <section className="mb-6">
              <SituationCard weekData={weekDetail} />
            </section>

            {/* 主题基金 */}
            <section className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800">主题基金</h2>
                <span className="text-sm text-gray-500">
                  共 {weekDetail?.thematicFunds?.length || 0} 只
                </span>
              </div>
              <ThematicFundCard
                funds={weekDetail?.thematicFunds || []}
                onFundClick={handleFundClick}
              />
            </section>

            {/* 小规模基金 */}
            <section className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800">精选小规模基金</h2>
                <span className="text-sm text-gray-500">
                  共 {weekDetail?.smallScaleFunds?.length || 0} 只
                </span>
              </div>
              <SmallScaleFundCard
                funds={weekDetail?.smallScaleFunds || []}
                onFundClick={handleFundClick}
              />
            </section>
          </>
        )}

        {/* 空数据状态 */}
        {!loading && !error && weeks.length === 0 && (
          <div className="text-center py-20">
            <svg
              className="w-16 h-16 text-gray-300 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-gray-500">暂无数据</p>
          </div>
        )}
      </main>

      {/* 净值趋势弹窗 */}
      <FundNavTrendModal
        isOpen={!!modalFund}
        onClose={handleCloseModal}
        fundCode={modalFund?.fundCode}
        fundName={modalFund?.fundName}
      />
    </div>
  );
}

export default App;
