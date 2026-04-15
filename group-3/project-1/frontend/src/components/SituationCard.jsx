import { getScoreColor, getScoreLabel } from "../data/mockData";

const SituationCard = ({ weekData }) => {
  if (!weekData) return null;

  const scoreColor = getScoreColor(weekData.situationScore);

  return (
    <div className="situation-card">
      <div className="situation-header">
        <div className="situation-title">
          <span>第{weekData.weekNumber}周</span>
          {weekData.isCurrentWeek && <span className="current-badge">本周</span>}
        </div>
        <div className="situation-date">
          {weekData.startDate} — {weekData.endDate}
        </div>
      </div>

      <div className="situation-score-section">
        <div className="score-label">停战概率</div>
        <div className="score-display">
          <div 
            className="score-circle"
            style={{ 
              background: `conic-gradient(${scoreColor} ${weekData.situationScore}%, #e5e7eb 0%)`,
            }}
          >
            <div className="score-inner">
              <span className="score-value">{weekData.situationScore}</span>
              <span className="score-unit">/ 100</span>
            </div>
          </div>
          <div className="score-status" style={{ color: scoreColor }}>
            {getScoreLabel(weekData.situationScore)}
          </div>
        </div>
      </div>

      <div className="situation-dynamic">
        <div className="dynamic-title">局势动态</div>
        <div className="dynamic-content">{weekData.summary}</div>
      </div>
    </div>
  );
};

export default SituationCard;
