import { useState, useEffect } from "react";
import { api } from "./services/api";
import Timeline from "./components/Timeline";
import SituationCard from "./components/SituationCard";
import ThematicFunds from "./components/ThematicFunds";
import SmallScaleFunds from "./components/SmallScaleFunds";
import FundTrendModal from "./components/FundTrendModal";
import "./App.css";

function App() {
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [selectedFund, setSelectedFund] = useState(null);
  const [timelineData, setTimelineData] = useState([]);
  const [weekDetail, setWeekDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [weekLoading, setWeekLoading] = useState(false);
  const [error, setError] = useState(null);

  // 加载时间轴数据
  useEffect(() => {
    const loadTimeline = async () => {
      try {
        setLoading(true);
        const response = await api.getTimeline();
        if (response.data && response.data.weeks && response.data.weeks.length > 0) {
          setTimelineData(response.data.weeks);
          // 设置默认选中的周为最新周（周编号最大的）
          const sortedWeeks = [...response.data.weeks].sort((a, b) => b.weekNumber - a.weekNumber);
          const latestWeek = sortedWeeks[0].weekNumber;
          setSelectedWeek(latestWeek);
        }
      } catch (err) {
        setError('加载数据失败: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    loadTimeline();
  }, []);

  // 加载周详细数据
  useEffect(() => {
    const loadWeekDetail = async () => {
      if (!selectedWeek) return;
      try {
        setWeekLoading(true);
        const response = await api.getWeekDetail(selectedWeek);
        if (response.data) {
          setWeekDetail(response.data);
        }
      } catch (err) {
        console.error('加载周详情失败:', err);
      } finally {
        setWeekLoading(false);
      }
    };
    loadWeekDetail();
  }, [selectedWeek]);

  const handleFundClick = (fund) => {
    console.log('点击基金:', fund);
    setSelectedFund(fund);
  };

  const handleCloseModal = () => {
    setSelectedFund(null);
  };

  // 构建当前周数据
  const currentWeekData = weekDetail || timelineData.find((w) => w.weekNumber === selectedWeek);

  if (loading) {
    return (
      <div className="app">
        <header className="app-header">
          <h1 className="app-title">美伊局势 · 基金表现 · 时间轴看板</h1>
        </header>
        <main className="app-main">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>加载中...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app">
        <header className="app-header">
          <h1 className="app-title">美伊局势 · 基金表现 · 时间轴看板</h1>
        </header>
        <main className="app-main">
          <div className="error-container">
            <p className="error-message">{error}</p>
            <button onClick={() => window.location.reload()}>重试</button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">美伊局势 · 基金表现 · 时间轴看板</h1>
        <div className="app-subtitle">
          数据区间：2026年3月3日 — 4月14日 ｜ 停战概率参考 Polymarket「US-Iran Ceasefire by April 30」
        </div>
      </header>

      <main className="app-main">
        <section className="timeline-section">
          <Timeline 
            weeks={timelineData} 
            selectedWeek={selectedWeek} 
            onSelectWeek={setSelectedWeek}
          />
        </section>

        {weekLoading ? (
          <section className="content-section">
            <div className="week-loading-container">
              <div className="loading-spinner small"></div>
              <p>加载周数据...</p>
            </div>
          </section>
        ) : currentWeekData && (
          <section className="content-section">
            <div className="week-detail-card">
              <SituationCard weekData={currentWeekData} />
              <ThematicFunds 
                funds={currentWeekData.thematicFunds || []}
                onFundClick={handleFundClick}
              />
              <SmallScaleFunds 
                funds={currentWeekData.smallScaleFunds || []}
                onFundClick={handleFundClick}
              />
            </div>
          </section>
        )}
      </main>

      <footer className="app-footer">
        <div className="footer-sources">
          数据来源：新华网、Polymarket、Wind、天天基金网 ｜ 
          基金业绩数据为区间累计涨幅（自3月3日起）｜
          停战概率分值取自 Polymarket「US x Iran ceasefire by April 30」合约价格
        </div>
        <div className="footer-disclaimer">
          基金过往业绩不代表未来表现，本页面仅供参考，不构成投资建议
        </div>
      </footer>

      <FundTrendModal 
        fund={selectedFund}
        onClose={handleCloseModal}
      />
    </div>
  );
}

export default App;
