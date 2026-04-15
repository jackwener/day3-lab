const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

/**
 * 统一 API 请求函数
 * @param {string} path - API 路径
 * @param {RequestInit} options - fetch 选项
 * @returns {Promise<any>} - 返回 data 部分
 */
export async function apiRequest(path, options = {}) {
  const response = await fetch(BASE_URL + path, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.message || `HTTP ${response.status}: ${response.statusText}`);
  }

  const json = await response.json();
  // 响应格式：{ code, message, data }
  return json.data !== undefined ? json.data : json;
}
