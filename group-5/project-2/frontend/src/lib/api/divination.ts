import apiClient from "./client";
import { mockDivinationData } from "../mock";
import { getIsMockMode } from "./client";
import type { DivinationResult, QimenRequest, LiurenRequest, ApiResponse } from "@/types";

export const divinationApi = {
  submitQimen: async (data: QimenRequest): Promise<DivinationResult> => {
    try {
      const res = await apiClient.post<ApiResponse<DivinationResult>>("/api/divination/qimen", data);
      return res.data.data;
    } catch (error: unknown) {
      if ((error as Record<string, unknown>).isMockFallback || getIsMockMode()) {
        return mockDivinationData.qimen(data.question);
      }
      throw error;
    }
  },

  submitLiuren: async (data: LiurenRequest): Promise<DivinationResult> => {
    try {
      const res = await apiClient.post<ApiResponse<DivinationResult>>("/api/divination/liuren", data);
      return res.data.data;
    } catch (error: unknown) {
      if ((error as Record<string, unknown>).isMockFallback || getIsMockMode()) {
        return mockDivinationData.liuren(data.question);
      }
      throw error;
    }
  },

  getRemaining: async (): Promise<{ qimen: number; liuren: number }> => {
    try {
      const res = await apiClient.get<ApiResponse<{ qimen: number; liuren: number }>>("/api/divination/remaining");
      return res.data.data;
    } catch (error: unknown) {
      if ((error as Record<string, unknown>).isMockFallback || getIsMockMode()) {
        return mockDivinationData.remaining;
      }
      throw error;
    }
  },
};
