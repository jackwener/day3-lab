import { AuthResponse, UserProfile } from "@/types";

export const mockAuthData = {
  login: (): AuthResponse => ({
    token: "mock-jwt-token-" + Date.now(),
    refreshToken: "mock-refresh-token-" + Date.now(),
    user: {
      id: "mock-user-001",
      email: "demo@example.com",
      phone: "13800138000",
      nickname: "演示用户",
      emailVerified: true,
      phoneVerified: true,
    },
  }),
  register: (): AuthResponse => ({
    token: "mock-jwt-token-" + Date.now(),
    refreshToken: "mock-refresh-token-" + Date.now(),
    user: {
      id: "mock-user-" + Date.now(),
      email: "newuser@example.com",
      phone: "13900139000",
      nickname: "新用户",
      emailVerified: false,
      phoneVerified: false,
    },
  }),
  profile: (): UserProfile => ({
    id: "mock-user-001",
    nickname: "演示用户",
    gender: "male",
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
  }),
};
