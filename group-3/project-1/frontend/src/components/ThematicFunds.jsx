import { TrendingUp, TrendingDown } from "lucide-react";

const ThematicFunds = ({ funds, onFundClick }) => {
  const themeIcons = {
    "原油": "🛢️",
    "黄金": "🥇",
    "煤炭": "⚫",
    "电力": "⚡",
    "天然气": "🔥"
  };

  return (
    <div className="funds-section">
      <div className="section-header">
        <h3 className="section-title">主题基金（区间累计）</h3>
        <div className="section-legend">
          <span className="legend-up">📈 涨</span>
          <span className="legend-down">📉 跌</span>
        </div>
      </div>

      <div className="funds-grid thematic-grid">
        {funds.map((fund, index) => (
          <div 
            key={index} 
            className="fund-card"
            onClick={() => onFundClick && onFundClick(fund)}
          >
            <div className="fund-theme">
              <span className="theme-icon">{themeIcons[fund.theme] || "📊"}</span>
              <span className="theme-name">{fund.theme}</span>
            </div>
            <div className="fund-info">
              <div className="fund-name">{fund.fundName}</div>
              <div className="fund-code">{fund.fundCode}</div>
            </div>
            <div className={`fund-return ${fund.returnRate >= 0 ? "positive" : "negative"}`}>
              {fund.returnRate >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              <span>{fund.returnRate >= 0 ? "+" : ""}{fund.returnRate}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ThematicFunds;
