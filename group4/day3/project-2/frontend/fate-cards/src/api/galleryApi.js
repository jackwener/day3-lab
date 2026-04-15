import { apiRequest } from './client';

/**
 * 获取历史记录列表
 * GET /history
 */
export function getHistory(page = 1, pageSize = 20) {
  return apiRequest(`/history?page=${page}&pageSize=${pageSize}`);
}

/**
 * 获取历史记录详情
 * GET /history/{historyId}
 */
export function getHistoryDetail(historyId) {
  return apiRequest(`/history/${historyId}`);
}

/**
 * 删除单条历史记录
 * DELETE /history/{historyId}
 */
export function deleteHistory(historyId) {
  return apiRequest(`/history/${historyId}`, { method: 'DELETE' });
}

/**
 * 清空所有历史记录
 * DELETE /history
 */
export function clearHistory() {
  return apiRequest('/history', { method: 'DELETE' });
}
