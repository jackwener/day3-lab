import React from 'react';

/**
 * 获取分值对应的颜色类名
 * @param {number} score - 局势分值
 * @returns {string} Tailwind 颜色类名
 */
function getScoreColorClass(score) {
  if (score <= 30) return 'bg-green-500';
  if (score <= 70) return 'bg-yellow-500';
  return 'bg-red-500';
}

/**
 * 获取分值对应的文字颜色类名
 * @param {number} score - 局势分值
 * @returns {string} Tailwind 文字颜色类名
 */
function getScoreTextClass(score) {
  if (score <= 30) return 'text-green-600';
  if (score <= 70) return 'text-yellow-600';
  return 'text-red-600';
}

/**
 * 获取分值对应的风险等级文字
 * @param {number} score - 局势分值
 * @returns {string} 风险等级文字
 */
function getRiskLevelText(score) {
  if (score <= 30) return '低风险';
  if (score <= 70) return '中风险';
  return '高风险';
}

/**
 * 格式化日期
 * @param {string} dateStr - 日期字符串
 * @returns {string} 格式化后的日期 (MM月DD日)
 */
function formatDate(dateStr) {
  if (!dateStr) return '--';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

/**
 * 局势卡片组件
 * @param {Object} props
 * @param {Object} props.weekData - 周数据对象
 * @param {number} props.weekData.situationScore - 局势分值
 * @param {string} props.weekData.summary - 摘要文本
 * @param {string} props.weekData.startDate - 开始日期
 * @param {string} props.weekData.endDate - 结束日期
 * @param {number} props.weekData.weekNumber - 周编号
 */
function SituationCard({ weekData }) {
  if (!weekData) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="text-gray-500 text-center py-8">
          暂无局势数据
        </div>
      </div>
    );
  }

  const { situationScore, summary, startDate, endDate, weekNumber } = weekData;
  const scoreColorClass = getScoreColorClass(situationScore);
  const scoreTextClass = getScoreTextClass(situationScore);
  const riskLevel = getRiskLevelText(situationScore);

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">市场局势评估</h2>
        <span className="text-sm text-gray-500">
          第{weekNumber}周：{formatDate(startDate)} - {formatDate(endDate)}
        </span>
      </div>

      {/* 分值展示 */}
      <div className="flex items-center gap-6 mb-4">
        {/* 分值大数字 */}
        <div className={`
          w-24 h-24 rounded-2xl flex flex-col items-center justify-center
          text-white shadow-lg ${scoreColorClass}
        `}>
          <span className="text-4xl font-bold">{situationScore}</span>
          <span className="text-xs opacity-90 mt-1">{riskLevel}</span>
        </div>

        {/* 分值说明 */}
        <div className="flex-1">
          <div className={`text-2xl font-bold ${scoreTextClass} mb-1`}>
            {situationScore} 分
          </div>
          <div className="text-sm text-gray-500">
            当前市场处于<span className={`font-medium ${scoreTextClass}`}>{riskLevel}</span>区间
          </div>
        </div>
      </div>

      {/* 摘要文本 */}
      {summary && (
        <div className="border-t border-gray-100 pt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">局势摘要</h3>
          <p className="text-gray-600 text-sm leading-relaxed line-clamp-3">
            {summary}
          </p>
        </div>
      )}

      {/* 分值区间说明 */}
      <div className="mt-4 flex gap-2 text-xs">
        <div className="flex items-center gap-1 px-2 py-1 bg-green-50 rounded">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-green-700">0-30 低风险</span>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 bg-yellow-50 rounded">
          <div className="w-2 h-2 rounded-full bg-yellow-500" />
          <span className="text-yellow-700">31-70 中风险</span>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 bg-red-50 rounded">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-red-700">71-100 高风险</span>
        </div>
      </div>
    </div>
  );
}

export default SituationCard;
