const API_BASE = '/api';

async function request(url) {
  const response = await fetch(`${API_BASE}${url}`);
  const result = await response.json();
  
  if (!response.ok) {
    const error = result.error || { message: '请求失败' };
    throw new Error(error.message || '请求失败');
  }
  
  return result.data;
}

/**
 * 获取时间轴所有周节点
 * @returns {Promise<{weeks: Array}>}
 */
export function fetchTimeline() {
  return request('/timeline');
}

/**
 * 获取指定周的详细数据
 * @param {number} week - 周编号
 * @returns {Promise<Object>}
 */
export function fetchWeekDetail(week) {
  return request(`/timeline/${week}`);
}

/**
 * 获取主题基金列表
 * @param {number} [week] - 可选的周编号
 * @returns {Promise<Object>}
 */
export function fetchThematicFunds(week) {
  const params = week ? `?week=${week}` : '';
  return request(`/funds/thematic${params}`);
}

/**
 * 获取小规模基金列表
 * @param {number} [week] - 可选的周编号
 * @param {number} [limit] - 可选的限制数量
 * @returns {Promise<Object>}
 */
export function fetchSmallScaleFunds(week, limit) {
  const params = new URLSearchParams();
  if (week) params.append('week', week);
  if (limit) params.append('limit', limit);
  const queryString = params.toString() ? `?${params.toString()}` : '';
  return request(`/funds/small-scale${queryString}`);
}

/**
 * 获取基金净值趋势
 * @param {string} fundCode - 基金代码
 * @param {string} [period='3m'] - 时间周期 (1m/3m/6m/1y)
 * @returns {Promise<Object>}
 */
export function fetchFundNav(fundCode, period = '3m') {
  return request(`/funds/${fundCode}/nav?period=${period}`);
}

/**
 * 获取当前局势评分
 * @returns {Promise<Object>}
 */
export function fetchSituationScore() {
  return request('/situation/score');
}
