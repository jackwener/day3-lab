import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";

// Mock 降级状态管理（全局）
let isMockMode = false;
const mockModeListeners: Set<(isMock: boolean) => void> = new Set();

export function getIsMockMode() {
  return isMockMode;
}

export function onMockModeChange(listener: (isMock: boolean) => void) {
  mockModeListeners.add(listener);
  return () => mockModeListeners.delete(listener);
}

function setMockMode(value: boolean) {
  if (isMockMode !== value) {
    isMockMode = value;
    mockModeListeners.forEach((fn) => fn(value));
  }
}

const apiClient: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// 请求拦截器：附加 JWT Token
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// 响应拦截器：错误处理
apiClient.interceptors.response.use(
  (response) => {
    // 后端恢复可用时，退出 Mock 模式
    setMockMode(false);
    return response;
  },
  async (error: AxiosError) => {
    // 网络错误或后端不可用 → 进入 Mock 模式
    if (!error.response || error.code === "ECONNABORTED" || error.code === "ERR_NETWORK") {
      setMockMode(true);
      return Promise.reject({ ...error, isMockFallback: true });
    }

    // 401 → 尝试刷新 Token
    if (error.response?.status === 401 && typeof window !== "undefined") {
      const refreshToken = localStorage.getItem("refreshToken");
      if (refreshToken) {
        try {
          const res = await axios.post(
            `${apiClient.defaults.baseURL}/api/auth/refresh`,
            { refreshToken }
          );
          const { token } = res.data.data;
          localStorage.setItem("token", token);
          // 重试原始请求
          if (error.config) {
            error.config.headers.Authorization = `Bearer ${token}`;
            return apiClient(error.config);
          }
        } catch {
          // 刷新失败，清除登录状态
          localStorage.removeItem("token");
          localStorage.removeItem("refreshToken");
          window.location.href = "/login";
        }
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
