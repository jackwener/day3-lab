import apiClient from "./client";
import { mockDestinyData } from "../mock";
import { getIsMockMode } from "./client";
import type { DestinyResult, DestinyRequest, ApiResponse } from "@/types";

export const destinyApi = {
  analyze: async (data: DestinyRequest): Promise<DestinyResult> => {
    try {
      const res = await apiClient.post<ApiResponse<DestinyResult>>("/api/destiny/analyze", data);
      return res.data.data;
    } catch (error: unknown) {
      if ((error as Record<string, unknown>).isMockFallback || getIsMockMode()) {
        return mockDestinyData.analyze(data.name, data.noBirthTime);
      }
      throw error;
    }
  },
};
