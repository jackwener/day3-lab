import { create } from "zustand";
import { calendarApi } from "@/lib/api";
import { formatDate, getOffsetDate } from "@/lib/utils";
import type { CalendarData } from "@/types";

interface CalendarState {
  currentDate: Date;
  calendarData: CalendarData | null;
  loading: boolean;
  error: string | null;

  fetchCalendar: (date?: string) => Promise<void>;
  setDate: (date: Date) => void;
  nextDay: () => void;
  prevDay: () => void;
}

const today = new Date();

function isWithinRange(date: Date): boolean {
  const min = getOffsetDate(today, -7);
  const max = getOffsetDate(today, 7);
  return date >= min && date <= max;
}

export const useCalendarStore = create<CalendarState>((set, get) => ({
  currentDate: new Date(),
  calendarData: null,
  loading: false,
  error: null,

  fetchCalendar: async (date?: string) => {
    const dateStr = date ?? formatDate(get().currentDate);
    set({ loading: true, error: null });
    try {
      const data = await calendarApi.getByDate(dateStr);
      set({ calendarData: data, loading: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "获取黄历失败";
      set({ error: message, loading: false });
    }
  },

  setDate: (date: Date) => {
    if (!isWithinRange(date)) return;
    set({ currentDate: date });
    get().fetchCalendar(formatDate(date));
  },

  nextDay: () => {
    const next = getOffsetDate(get().currentDate, 1);
    if (!isWithinRange(next)) return;
    set({ currentDate: next });
    get().fetchCalendar(formatDate(next));
  },

  prevDay: () => {
    const prev = getOffsetDate(get().currentDate, -1);
    if (!isWithinRange(prev)) return;
    set({ currentDate: prev });
    get().fetchCalendar(formatDate(prev));
  },
}));
