// API 配置和服务
const API_BASE_URL = 'http://10.61.238.165:5000';

// 通用请求函数
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  const response = await fetch(url, { ...defaultOptions, ...options });
  
  if (!response.ok) {
    throw new Error(`API请求失败: ${response.status}`);
  }
  
  const data = await response.json();
  return data;
}

// API 接口
export const api = {
  // 获取时间轴数据
  getTimeline: () => request('/api/timeline'),
  
  // 获取指定周详细数据
  getWeekDetail: (week) => request(`/api/timeline/${week}`),
  
  // 获取主题基金列表
  getThematicFunds: (week) => {
    const query = week ? `?week=${week}` : '';
    return request(`/api/funds/thematic${query}`);
  },
  
  // 获取精选小规模基金列表
  getSmallScaleFunds: (week, limit = 5) => {
    const params = new URLSearchParams();
    if (week) params.append('week', week);
    params.append('limit', limit);
    return request(`/api/funds/small-scale?${params.toString()}`);
  },
  
  // 获取当前局势分值
  getSituationScore: () => request('/api/situation/score'),
  
  // 获取基金净值趋势
  getFundNav: (fundCode, period = '3m') => {
    return request(`/api/funds/${fundCode}/nav?period=${period}`);
  },
};

export default api;
