import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LeftOutlined, RightOutlined, CalendarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useGoldContext } from '../../store/GoldContext';
import { formatWeight } from '../../utils/units';
import './index.css';

interface DayInfo {
  date: dayjs.Dayjs;
  isCurrentMonth: boolean;
  isToday: boolean;
  records: Array<{
    id: string;
    weight: number;
    total_price: number;
    channel: string;
  }>;
}

export default function Calendar() {
  const { goldRecords, preferredUnit } = useGoldContext();
  const [currentMonth, setCurrentMonth] = useState(dayjs());
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs | null>(null);

  // 计算月历数据
  const calendarDays = useMemo(() => {
    const startOfMonth = currentMonth.startOf('month');
    const endOfMonth = currentMonth.endOf('month');
    const startDay = startOfMonth.day(); // 0 = Sunday
    const daysInMonth = endOfMonth.date();

    // 按日期分组的记录
    const recordsByDate = new Map<string, typeof goldRecords>();
    goldRecords.forEach(record => {
      const date = record.purchase_date;
      if (!recordsByDate.has(date)) {
        recordsByDate.set(date, []);
      }
      recordsByDate.get(date)!.push(record);
    });

    const days: DayInfo[] = [];

    // 上月填充
    const prevMonth = startOfMonth.subtract(1, 'month');
    const prevMonthDays = prevMonth.daysInMonth();
    for (let i = startDay - 1; i >= 0; i--) {
      const date = prevMonth.date(prevMonthDays - i);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: date.isSame(dayjs(), 'day'),
        records: [],
      });
    }

    // 当月
    for (let i = 1; i <= daysInMonth; i++) {
      const date = startOfMonth.date(i);
      const dateStr = date.format('YYYY-MM-DD');
      const dayRecords = recordsByDate.get(dateStr) || [];
      days.push({
        date,
        isCurrentMonth: true,
        isToday: date.isSame(dayjs(), 'day'),
        records: dayRecords.map(r => ({
          id: r.id,
          weight: r.weight,
          total_price: r.total_price,
          channel: r.channel,
        })),
      });
    }

    // 下月填充（补足到42格，即6行）
    const remaining = 42 - days.length;
    const nextMonth = endOfMonth.add(1, 'month');
    for (let i = 1; i <= remaining; i++) {
      const date = nextMonth.date(i);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: date.isSame(dayjs(), 'day'),
        records: [],
      });
    }

    return days;
  }, [currentMonth, goldRecords]);

  // 月度统计
  const monthStats = useMemo(() => {
    const monthRecords = goldRecords.filter(r => {
      const recordDate = dayjs(r.purchase_date);
      return recordDate.year() === currentMonth.year() && 
             recordDate.month() === currentMonth.month();
    });

    const totalWeight = monthRecords.reduce((sum, r) => sum + r.weight, 0);
    const totalCost = monthRecords.reduce((sum, r) => sum + r.total_price, 0);
    const uniqueDays = new Set(monthRecords.map(r => r.purchase_date)).size;

    return {
      totalWeight,
      totalCost,
      uniqueDays,
    };
  }, [currentMonth, goldRecords]);

  // 选中日期的记录
  const selectedDateRecords = useMemo(() => {
    if (!selectedDate) return [];
    const dateStr = selectedDate.format('YYYY-MM-DD');
    return goldRecords.filter(r => r.purchase_date === dateStr);
  }, [selectedDate, goldRecords]);

  const handlePrevMonth = () => {
    setCurrentMonth(prev => prev.subtract(1, 'month'));
    setSelectedDate(null);
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => prev.add(1, 'month'));
    setSelectedDate(null);
  };

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.02 },
    },
  };

  const dayVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { type: 'spring' as const, stiffness: 300, damping: 25 },
    },
  };

  return (
    <motion.div
      className="calendar-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* 顶部栏 */}
      <div className="calendar-header">
        <h1 className="calendar-title">攒金日历</h1>
        <div className="calendar-month-nav">
          <button className="calendar-nav-btn" onClick={handlePrevMonth}>
            <LeftOutlined />
          </button>
          <span className="calendar-month-label">
            {currentMonth.format('YYYY年M月')}
          </span>
          <button className="calendar-nav-btn" onClick={handleNextMonth}>
            <RightOutlined />
          </button>
        </div>
      </div>

      {/* 月度统计 */}
      <motion.div
        className="calendar-stats"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="calendar-stat-item">
          <motion.span
            className="calendar-stat-value gold-text"
            key={monthStats.totalWeight}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
          >
            {formatWeight(monthStats.totalWeight, preferredUnit)}
          </motion.span>
          <span className="calendar-stat-label">本月攒金</span>
        </div>
        <div className="calendar-stat-divider" />
        <div className="calendar-stat-item">
          <motion.span
            className="calendar-stat-value gold-text"
            key={monthStats.totalCost}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
          >
            ¥{monthStats.totalCost.toFixed(0)}
          </motion.span>
          <span className="calendar-stat-label">本月花费</span>
        </div>
        <div className="calendar-stat-divider" />
        <div className="calendar-stat-item">
          <motion.span
            className="calendar-stat-value gold-text"
            key={monthStats.uniqueDays}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
          >
            {monthStats.uniqueDays}天
          </motion.span>
          <span className="calendar-stat-label">攒金天数</span>
        </div>
      </motion.div>

      {/* 日历网格 */}
      <motion.div
        className="calendar-grid-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {/* 星期标题 */}
        <div className="calendar-weekdays">
          {weekDays.map((day, index) => (
            <div
              key={day}
              className={`calendar-weekday ${index === 0 || index === 6 ? 'weekend' : ''}`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* 日期网格 */}
        <motion.div
          className="calendar-days"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {calendarDays.map((dayInfo, index) => {
            const isSelected = selectedDate?.isSame(dayInfo.date, 'day');
            const hasRecords = dayInfo.records.length > 0;

            return (
              <motion.button
                key={index}
                variants={dayVariants}
                className={`calendar-day ${
                  dayInfo.isCurrentMonth ? 'current-month' : 'other-month'
                } ${dayInfo.isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${
                  hasRecords ? 'has-records' : ''
                }`}
                onClick={() => setSelectedDate(dayInfo.date)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="calendar-day-number">{dayInfo.date.date()}</span>
                {hasRecords && (
                  <motion.span
                    className="calendar-day-dot"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3 + index * 0.01 }}
                  />
                )}
              </motion.button>
            );
          })}
        </motion.div>
      </motion.div>

      {/* 选中日期的记录列表 */}
      <AnimatePresence mode="wait">
        {selectedDate && (
          <motion.div
            className="calendar-detail"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="calendar-detail-header">
              <CalendarOutlined className="calendar-detail-icon" />
              <span>{selectedDate.format('M月D日')} 攒金记录</span>
              <button
                className="calendar-detail-close"
                onClick={() => setSelectedDate(null)}
              >
                ×
              </button>
            </div>

            {selectedDateRecords.length === 0 ? (
              <div className="calendar-detail-empty">
                当天无攒金记录
              </div>
            ) : (
              <div className="calendar-detail-list">
                <AnimatePresence>
                  {selectedDateRecords.map((record, index) => (
                    <motion.div
                      key={record.id}
                      className="calendar-detail-item"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <div className="calendar-detail-info">
                        <span className="calendar-detail-weight">
                          {formatWeight(record.weight, preferredUnit)}
                        </span>
                        <span className="calendar-detail-channel">
                          {record.channel}
                        </span>
                      </div>
                      <span className="calendar-detail-price">
                        ¥{record.total_price.toFixed(2)}
                      </span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
