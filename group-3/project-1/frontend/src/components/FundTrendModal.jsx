import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { api } from "../services/api";

const FundTrendModal = ({ fund, onClose }) => {
  const [period, setPeriod] = useState("3m");
  const [navData, setNavData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadNavData = async () => {
      if (!fund) return;
      // 兼容处理：后端可能返回 fund_code 或 fundCode
      const fundCode = fund.fundCode || fund.fund_code;
      if (!fundCode) {
        console.error('基金代码缺失:', fund);
        return;
      }
      try {
        setLoading(true);
        const response = await api.getFundNav(fundCode, period);
        if (response.data && response.data.navData) {
          setNavData(response.data.navData);
        }
      } catch (err) {
        console.error('加载净值数据失败:', err);
        // 如果API失败，使用空数组
        setNavData([]);
      } finally {
        setLoading(false);
      }
    };
    loadNavData();
  }, [fund, period]);

  if (!fund) return null;

  // 兼容处理基金代码字段
  const fundCode = fund.fundCode || fund.fund_code || '--';
  const fundName = fund.fundName || fund.fund_name || '未知基金';

  const periods = [
    { key: "1m", label: "1个月" },
    { key: "3m", label: "3个月" },
    { key: "6m", label: "6个月" },
    { key: "1y", label: "1年" }
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <h3>{fundName}</h3>
            <span className="modal-code">{fundCode}</span>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-body">
          <div className="period-selector">
            {periods.map((p) => (
              <button
                key={p.key}
                className={`period-btn ${period === p.key ? "active" : ""}`}
                onClick={() => setPeriod(p.key)}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="chart-container">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={navData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickFormatter={(value) => value.slice(5)}
                  interval="preserveStartEnd"
                  axisLine={{ stroke: 'rgba(148, 163, 184, 0.3)' }}
                  tickLine={{ stroke: 'rgba(148, 163, 184, 0.3)' }}
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  domain={["dataMin - 0.05", "dataMax + 0.05"]}
                  tickFormatter={(value) => value.toFixed(2)}
                  axisLine={{ stroke: 'rgba(148, 163, 184, 0.3)' }}
                  tickLine={{ stroke: 'rgba(148, 163, 184, 0.3)' }}
                  width={50}
                />
                <Tooltip 
                  formatter={(value) => [value.toFixed(4), "累计净值"]}
                  labelFormatter={(label) => `日期: ${label}`}
                  contentStyle={{ 
                    backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="accumulatedNav" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="fund-stats">
            <div className="stat-item">
              <span className="stat-label">最新净值</span>
              <span className="stat-value">
                {navData.length > 0 ? navData[navData.length - 1].accumulatedNav.toFixed(4) : "--"}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">区间涨跌幅</span>
              <span className={`stat-value ${fund.returnRate >= 0 ? "positive" : "negative"}`}>
                {fund.returnRate >= 0 ? "+" : ""}{fund.returnRate}%
              </span>
            </div>
            {fund.scale && (
              <div className="stat-item">
                <span className="stat-label">基金规模</span>
                <span className="stat-value">{fund.scale}亿</span>
              </div>
            )}
            {fund.theme && (
              <div className="stat-item">
                <span className="stat-label">主题</span>
                <span className="stat-value">{fund.theme}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FundTrendModal;
