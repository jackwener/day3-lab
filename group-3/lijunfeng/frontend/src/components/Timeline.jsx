import React from 'react';

/**
 * 获取分值对应的颜色类名
 * @param {number} score - 局势分值
 * @returns {string} Tailwind 颜色类名
 */
function getScoreColor(score) {
  if (score <= 30) return 'bg-green-500';
  if (score <= 70) return 'bg-yellow-500';
  return 'bg-red-500';
}

/**
 * 时间轴组件
 * @param {Object} props
 * @param {Array} props.weeks - 周数据数组，每项包含 weekNumber 和 situationScore
 * @param {number} props.selectedWeek - 当前选中的周编号
 * @param {Function} props.onWeekSelect - 点击周节点的回调函数
 */
function Timeline({ weeks, selectedWeek, onWeekSelect }) {
  if (!weeks || weeks.length === 0) {
    return (
      <div className="py-4 text-gray-500">
        暂无时间轴数据
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-center gap-2 py-4 min-w-max px-2">
        {weeks.map((week, index) => {
          const isSelected = week.weekNumber === selectedWeek;
          const scoreColor = getScoreColor(week.situationScore);
          
          return (
            <React.Fragment key={week.weekNumber}>
              {/* 连接线 */}
              {index > 0 && (
                <div className="w-8 h-0.5 bg-gray-300 flex-shrink-0" />
              )}
              
              {/* 周节点 */}
              <button
                onClick={() => onWeekSelect(week.weekNumber)}
                className={`
                  flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-200
                  hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400
                  ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''}
                `}
              >
                {/* 分值圆点 */}
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center
                    text-white font-bold text-sm shadow-md
                    ${scoreColor}
                    ${isSelected ? 'ring-4 ring-offset-2 ring-blue-300 scale-110' : ''}
                  `}
                >
                  {week.situationScore}
                </div>
                
                {/* 周标签 */}
                <span className={`
                  text-xs font-medium whitespace-nowrap
                  ${isSelected ? 'text-blue-600' : 'text-gray-600'}
                `}>
                  第{week.weekNumber}周
                </span>
              </button>
            </React.Fragment>
          );
        })}
      </div>
      
      {/* 图例 */}
      <div className="flex items-center justify-center gap-6 mt-2 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>低风险 (0-30)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <span>中风险 (31-70)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span>高风险 (71-100)</span>
        </div>
      </div>
    </div>
  );
}

export default Timeline;
