import { create } from "zustand";
import { authApi } from "@/lib/api";
import { getIsMockMode, onMockModeChange } from "@/lib/api/client";
import type { User, UserProfile, LoginRequest, RegisterRequest, UpdateProfileRequest } from "@/types";

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isMockMode: boolean;
  loading: boolean;
  error: string | null;

  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  fetchProfile: () => Promise<void>;
  updateProfile: (data: UpdateProfileRequest) => Promise<void>;
  hydrate: () => void;
  setMockMode: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  token: null,
  isAuthenticated: false,
  isMockMode: false,
  loading: false,
  error: null,

  login: async (data) => {
    set({ loading: true, error: null });
    try {
      const res = await authApi.login(data);
      localStorage.setItem("token", res.token);
      localStorage.setItem("refreshToken", res.refreshToken);
      set({ user: res.user, token: res.token, isAuthenticated: true, loading: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "登录失败";
      set({ error: message, loading: false });
      throw err;
    }
  },

  register: async (data) => {
    set({ loading: true, error: null });
    try {
      const res = await authApi.register(data);
      localStorage.setItem("token", res.token);
      localStorage.setItem("refreshToken", res.refreshToken);
      set({ user: res.user, token: res.token, isAuthenticated: true, loading: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "注册失败";
      set({ error: message, loading: false });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    set({ user: null, profile: null, token: null, isAuthenticated: false });
  },

  fetchProfile: async () => {
    set({ loading: true, error: null });
    try {
      const profile = await authApi.getProfile();
      set({ profile, loading: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "获取档案失败";
      set({ error: message, loading: false });
    }
  },

  updateProfile: async (data) => {
    set({ loading: true, error: null });
    try {
      const profile = await authApi.updateProfile(data);
      set({ profile, loading: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "更新档案失败";
      set({ error: message, loading: false });
      throw err;
    }
  },

  hydrate: () => {
    if (typeof window !== "undefined") {
      // 临时绕过登录：自动设置为已登录状态，使用演示用户
      const token = localStorage.getItem("token") || "demo-token";
      localStorage.setItem("token", token);
      set({
        token,
        isAuthenticated: true,
        user: {
          id: "demo-user-001",
          email: "demo@example.com",
          phone: "13800138000",
          nickname: "演示用户",
          emailVerified: true,
          phoneVerified: true,
        },
        profile: {
          id: "demo-user-001",
          nickname: "演示用户",
          gender: "male" as const,
          birthDate: "1990-05-15",
          birthTime: 8,
          noBirthTime: false,
          bazi: {
            yearPillar: "庚午",
            monthPillar: "辛巳",
            dayPillar: "壬辰",
            hourPillar: "甲辰",
            wuxing: { metal: 30, wood: 20, water: 25, fire: 15, earth: 10 },
          },
        },
      });
      // 监听 Mock 模式变化
      set({ isMockMode: getIsMockMode() });
      onMockModeChange((isMock) => {
        set({ isMockMode: isMock });
      });
    }
  },

  setMockMode: (value) => set({ isMockMode: value }),
}));
