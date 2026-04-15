import apiClient from "./client";
import { mockCalendarData } from "../mock";
import { getIsMockMode } from "./client";
import type { CalendarData, ApiResponse } from "@/types";

export const calendarApi = {
  getByDate: async (date: string): Promise<CalendarData> => {
    try {
      const res = await apiClient.get<ApiResponse<CalendarData>>(`/api/calendar/today`, {
        params: { date },
      });
      return res.data.data;
    } catch (error: unknown) {
      if ((error as Record<string, unknown>).isMockFallback || getIsMockMode()) {
        return mockCalendarData.getByDate(date);
      }
      throw error;
    }
  },
};
