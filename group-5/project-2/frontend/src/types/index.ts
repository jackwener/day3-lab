// 用户相关
export interface User {
  id: string;
  email: string;
  phone: string;
  nickname: string;
  emailVerified: boolean;
  phoneVerified: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  phone: string;
  password: string;
  nickname: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: User;
}

// 用户档案
export interface BaziInfo {
  yearPillar: string;
  monthPillar: string;
  dayPillar: string;
  hourPillar: string;
  wuxing: WuxingDistribution;
}

export interface WuxingDistribution {
  metal: number;
  wood: number;
  water: number;
  fire: number;
  earth: number;
}

export interface UserProfile {
  id: string;
  nickname: string;
  gender: "male" | "female";
  birthDate: string;
  birthTime: number;
  bazi: BaziInfo | null;
  noBirthTime: boolean;
}

export interface UpdateProfileRequest {
  nickname: string;
  gender: "male" | "female";
  birthDate: string;
  birthTime: number;
  noBirthTime: boolean;
}

// 黄历
export interface CalendarData {
  date: string;
  lunarDate: string;
  ganzhi: string;
  suitable: string[];
  unsuitable: string[];
  luckyColor: string[];
  luckyDirection: string[];
  cached: boolean;
}

// 运势问询
export interface QimenRequest {
  question: string;
  location: {
    latitude: number;
    longitude: number;
  };
}

export interface LiurenRequest {
  question: string;
  numbers: [number, number, number];
}

export interface DivinationResult {
  id: string;
  type: "qimen" | "liuren";
  question: string;
  gua: GuaInfo;
  judgment: "吉" | "凶" | "中平";
  successRate: number;
  analysis: string;
  createdAt: string;
}

export interface GuaInfo {
  name: string;
  positions: GuaPosition[];
}

export interface GuaPosition {
  position: number;
  label: string;
  value: string;
  element: string;
}

// 命格解析
export interface DestinyRequest {
  name: string;
  gender: "male" | "female";
  birthDate: string;
  birthTime: number;
  noBirthTime: boolean;
}

export interface DestinyResult {
  id: string;
  name: string;
  keywords: string[];
  wuxing: WuxingDistribution & { analysis: string };
  personality: string;
  career: string;
  relationship: string;
  health: string;
  advice: string;
  noBirthTime: boolean;
}

// 分页
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

// API 通用响应
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}
