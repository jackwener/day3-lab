import { TrendingUp, TrendingDown } from "lucide-react";

const SmallScaleFunds = ({ funds, onFundClick }) => {
  return (
    <div className="funds-section">
      <div className="section-header">
        <h3 className="section-title">精选小规模基金（每家≤5亿，各公司最优）</h3>
      </div>

      <div className="funds-grid smallscale-grid">
        {funds.map((fund, index) => (
          <div 
            key={index} 
            className="fund-card smallscale-card"
            onClick={() => onFundClick && onFundClick(fund)}
          >
            <div className="fund-company">{fund.company}</div>
            <div className="fund-info">
              <div className="fund-name">{fund.fundName}</div>
              <div className="fund-meta">
                <span className="fund-code">{fund.fundCode}</span>
                <span className="fund-scale">· {fund.scale}亿</span>
              </div>
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

export default SmallScaleFunds;
