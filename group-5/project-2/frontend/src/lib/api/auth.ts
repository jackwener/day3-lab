import apiClient from "./client";
import { mockAuthData } from "../mock";
import { getIsMockMode } from "./client";
import type { AuthResponse, LoginRequest, RegisterRequest, UserProfile, UpdateProfileRequest, ApiResponse } from "@/types";

export const authApi = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    try {
      const res = await apiClient.post<ApiResponse<AuthResponse>>("/api/auth/login", data);
      return res.data.data;
    } catch (error: unknown) {
      if ((error as Record<string, unknown>).isMockFallback || getIsMockMode()) {
        return mockAuthData.login();
      }
      throw error;
    }
  },

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    try {
      const res = await apiClient.post<ApiResponse<AuthResponse>>("/api/auth/register", data);
      return res.data.data;
    } catch (error: unknown) {
      if ((error as Record<string, unknown>).isMockFallback || getIsMockMode()) {
        return mockAuthData.register();
      }
      throw error;
    }
  },

  getProfile: async (): Promise<UserProfile> => {
    try {
      const res = await apiClient.get<ApiResponse<UserProfile>>("/api/user/profile");
      return res.data.data;
    } catch (error: unknown) {
      if ((error as Record<string, unknown>).isMockFallback || getIsMockMode()) {
        return mockAuthData.profile();
      }
      throw error;
    }
  },

  updateProfile: async (data: UpdateProfileRequest): Promise<UserProfile> => {
    try {
      const res = await apiClient.put<ApiResponse<UserProfile>>("/api/user/profile", data);
      return res.data.data;
    } catch (error: unknown) {
      if ((error as Record<string, unknown>).isMockFallback || getIsMockMode()) {
        return mockAuthData.profile();
      }
      throw error;
    }
  },
};
