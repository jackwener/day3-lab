import { create } from "zustand";
import { destinyApi } from "@/lib/api/destiny";
import { useAuthStore } from "./auth";
import type { DestinyResult, DestinyRequest } from "@/types";

interface DestinyState {
  activeTab: "self" | "other";
  result: DestinyResult | null;
  loading: boolean;
  error: string | null;

  setActiveTab: (tab: "self" | "other") => void;
  analyzeSelf: () => Promise<void>;
  analyzeOther: (data: DestinyRequest) => Promise<void>;
  clearResult: () => void;
}

export const useDestinyStore = create<DestinyState>((set) => ({
  activeTab: "self",
  result: null,
  loading: false,
  error: null,

  setActiveTab: (tab) => set({ activeTab: tab }),

  analyzeSelf: async () => {
    const profile = useAuthStore.getState().profile;
    if (!profile) {
      set({ error: "请先完善个人档案" });
      return;
    }

    set({ loading: true, error: null });
    try {
      const request: DestinyRequest = {
        name: profile.nickname,
        gender: profile.gender,
        birthDate: profile.birthDate,
        birthTime: profile.birthTime,
        noBirthTime: profile.noBirthTime,
      };
      const result = await destinyApi.analyze(request);
      set({ result, loading: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "解析失败";
      set({ error: message, loading: false });
    }
  },

  analyzeOther: async (data) => {
    set({ loading: true, error: null });
    try {
      const result = await destinyApi.analyze(data);
      set({ result, loading: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "解析失败";
      set({ error: message, loading: false });
    }
  },

  clearResult: () => set({ result: null, error: null }),
}));
