import { create } from "zustand";
import { divinationApi } from "@/lib/api/divination";
import type { DivinationResult } from "@/types";

interface DivinationState {
  activeTab: "qimen" | "liuren";
  qimenResult: DivinationResult | null;
  liurenResult: DivinationResult | null;
  remainingQimen: number;
  remainingLiuren: number;
  loading: boolean;
  error: string | null;

  setActiveTab: (tab: "qimen" | "liuren") => void;
  submitQimen: (question: string, location: { latitude: number; longitude: number }) => Promise<void>;
  submitLiuren: (question: string, numbers: [number, number, number]) => Promise<void>;
  fetchRemaining: () => Promise<void>;
}

export const useDivinationStore = create<DivinationState>((set, get) => ({
  activeTab: "qimen",
  qimenResult: null,
  liurenResult: null,
  remainingQimen: 1,
  remainingLiuren: 5,
  loading: false,
  error: null,

  setActiveTab: (tab) => set({ activeTab: tab }),

  submitQimen: async (question, location) => {
    if (get().remainingQimen <= 0) {
      set({ error: "今日奇门遁甲次数已用完" });
      return;
    }
    set({ loading: true, error: null });
    try {
      const result = await divinationApi.submitQimen({ question, location });
      set((s) => ({
        qimenResult: result,
        remainingQimen: s.remainingQimen - 1,
        loading: false,
      }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "问询失败";
      set({ error: message, loading: false });
    }
  },

  submitLiuren: async (question, numbers) => {
    if (get().remainingLiuren <= 0) {
      set({ error: "今日大小六壬次数已用完" });
      return;
    }
    set({ loading: true, error: null });
    try {
      const result = await divinationApi.submitLiuren({ question, numbers });
      set((s) => ({
        liurenResult: result,
        remainingLiuren: s.remainingLiuren - 1,
        loading: false,
      }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "问询失败";
      set({ error: message, loading: false });
    }
  },

  fetchRemaining: async () => {
    try {
      const data = await divinationApi.getRemaining();
      set({ remainingQimen: data.qimen, remainingLiuren: data.liuren });
    } catch {
      // 保持默认值
    }
  },
}));
