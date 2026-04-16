import React from 'react';

/**
 * 格式化涨跌幅
 * @param {number} change - 涨跌幅数值
 * @returns {string} 格式化后的字符串，带正负号
 */
function formatChange(change) {
  if (change === undefined || change === null) return '--';
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}%`;
}

/**
 * 获取涨跌幅颜色类名
 * @param {number} change - 涨跌幅数值
 * @returns {string} Tailwind 颜色类名
 */
function getChangeColorClass(change) {
  if (change === undefined || change === null) return 'text-gray-500';
  return change >= 0 ? 'text-green-600' : 'text-red-600';
}

/**
 * 获取涨跌幅背景色类名
 * @param {number} change - 涨跌幅数值
 * @returns {string} Tailwind 背景色类名
 */
function getChangeBgClass(change) {
  if (change === undefined || change === null) return 'bg-gray-50';
  return change >= 0 ? 'bg-green-50' : 'bg-red-50';
}

/**
 * 主题基金卡片组件
 * @param {Object} props
 * @param {Array} props.funds - 主题基金数组
 * @param {string} props.funds[].themeName - 主题名称
 * @param {string} props.funds[].fundName - 基金名称
 * @param {string} props.funds[].fundCode - 基金代码
 * @param {number} props.funds[].change - 涨跌幅
 * @param {Function} props.onFundClick - 点击基金卡片的回调函数，参数为 fundCode 和 fundName
 */
function ThematicFundCard({ funds, onFundClick }) {
  if (!funds || funds.length === 0) {
    return (
      <div className="text-gray-500 text-center py-8 bg-white rounded-xl shadow-sm">
        暂无主题基金数据
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
      {funds.map((fund) => {
        const changeColorClass = getChangeColorClass(fund.change);
        const changeBgClass = getChangeBgClass(fund.change);

        return (
          <button
            key={fund.fundCode}
            onClick={() => onFundClick(fund.fundCode, fund.fundName)}
            className="
              bg-white rounded-xl shadow-sm border border-gray-100 p-4
              hover:shadow-md hover:border-blue-300 transition-all duration-200
              text-left focus:outline-none focus:ring-2 focus:ring-blue-400
            "
          >
            {/* 主题名称 */}
            <div className="text-xs font-medium text-blue-600 mb-2 truncate">
              {fund.themeName || '主题基金'}
            </div>

            {/* 基金名称 */}
            <div className="font-semibold text-gray-800 mb-1 truncate" title={fund.fundName}>
              {fund.fundName}
            </div>

            {/* 基金代码 */}
            <div className="text-xs text-gray-400 mb-3">
              {fund.fundCode}
            </div>

            {/* 涨跌幅 */}
            <div className={`
              inline-flex items-center px-2 py-1 rounded-lg text-sm font-bold
              ${changeBgClass} ${changeColorClass}
            `}>
              {formatChange(fund.change)}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default ThematicFundCard;
