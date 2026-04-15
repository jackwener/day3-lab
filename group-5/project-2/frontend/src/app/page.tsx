"use client";

import { useEffect } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { CalendarCard } from "@/components/business";
import { Button } from "@/components/ui/Button";
import { useCalendarStore } from "@/stores/calendar";
import { getOffsetDate } from "@/lib/utils";

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

export default function Home() {
  const { currentDate, calendarData, loading, error, fetchCalendar, nextDay, prevDay } =
    useCalendarStore();

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  const today = new Date();
  const minDate = getOffsetDate(today, -7);
  const maxDate = getOffsetDate(today, 7);
  const prevDisabled = getOffsetDate(currentDate, -1) < minDate;
  const nextDisabled = getOffsetDate(currentDate, 1) > maxDate;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const day = currentDate.getDate();
  const weekday = WEEKDAYS[currentDate.getDay()];

  return (
    <PageLayout requireAuth>
      <h1 className="text-gradient font-heading text-2xl font-bold mb-6">今日黄历</h1>

      {/* 日期切换 */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <Button variant="ghost" size="sm" disabled={prevDisabled} onClick={prevDay} aria-label="前一天">
          ←
        </Button>
        <span className="text-text-primary text-lg transition-all duration-300">
          {year}年{month}月{day}日 星期{weekday}
        </span>
        <Button variant="ghost" size="sm" disabled={nextDisabled} onClick={nextDay} aria-label="后一天">
          →
        </Button>
      </div>

      {/* 内容区 */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <svg
            className="animate-spin h-8 w-8 text-primary mb-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <p className="text-text-secondary">正在加载黄历...</p>
        </div>
      )}

      {error && !loading && (
        <div className="text-center py-20">
          <p className="text-error mb-4">{error}</p>
          <Button variant="secondary" onClick={() => fetchCalendar()}>
            重试
          </Button>
        </div>
      )}

      {calendarData && !loading && !error && (
        <div className="transition-all duration-300 animate-fade-in">
          <CalendarCard data={calendarData} />
        </div>
      )}
    </PageLayout>
  );
}
