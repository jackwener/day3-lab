import { useRef, useEffect } from "react";
import { getScoreColor, getScoreLabel } from "../data/mockData";

const Timeline = ({ weeks, selectedWeek, onSelectWeek }) => {
  const scrollRef = useRef(null);

  // 默认滚动到最右侧（显示最新一周）
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [weeks]);

  return (
    <div className="timeline-container">
      <div className="timeline-header">
        <h3 className="timeline-title">时间轴</h3>
        <div className="timeline-legend">
          <div className="legend-item">
            <span className="legend-dot" style={{ backgroundColor: "#ef4444", boxShadow: "0 0 8px #ef4444" }}></span>
            <span>停战概率 ≤ 20%（高度紧张）</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ backgroundColor: "#f97316", boxShadow: "0 0 8px #f97316" }}></span>
            <span>停战概率 20-50%</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ backgroundColor: "#10b981", boxShadow: "0 0 8px #10b981" }}></span>
            <span>停战概率 {'>'} 50%（趋于缓和）</span>
          </div>
        </div>
      </div>
      
      <div className="timeline-scroll" ref={scrollRef}>
        <div className="timeline-scroll-inner">
          <div className="timeline-track">
            {weeks.map((week, index) => {
              const isSelected = selectedWeek === week.weekNumber;
              const scoreColor = getScoreColor(week.situationScore);
              
              return (
                <div
                  key={week.weekNumber}
                  className={`timeline-node ${isSelected ? "selected" : ""}`}
                  onClick={() => onSelectWeek(week.weekNumber)}
                >
                  <div className="node-marker">
                    <div 
                      className="node-circle"
                      style={{ 
                        background: `linear-gradient(135deg, ${scoreColor}, ${scoreColor}dd)`,
                        boxShadow: isSelected ? `0 0 0 4px ${scoreColor}40, 0 0 20px ${scoreColor}60` : `0 4px 15px ${scoreColor}40`
                      }}
                    >
                      <span className="node-score">{week.situationScore}</span>
                    </div>
                    {index < weeks.length - 1 && <div className="node-line"></div>}
                  </div>
                  
                  <div className="node-content">
                    <div className="node-week">
                      第{week.weekNumber}周{week.isCurrentWeek ? "（本周）" : ""}
                    </div>
                    <div className="node-date">
                      {week.startDate.replace("2026-", "").replace("-", "/")} — {week.endDate.replace("2026-", "").replace("-", "/")}
                    </div>
                    <div className="node-label" style={{ color: scoreColor }}>
                      {getScoreLabel(week.situationScore)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Timeline;
