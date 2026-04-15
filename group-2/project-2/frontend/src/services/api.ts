/**
 * API 服务层 — 统一封装后端接口调用
 * 后端地址通过 vite.config.ts 的 proxy 转发，前端直接使用相对路径 /api/*
 * 
 * 演示模式：当 URL 带有 ?demo=1 时，使用 mock 数据（基金智投助手除外）
 */

import {
  mockIndices,
  mockFunds,
  mockWatchlist,
  mockArticles,
  mockHotTags,
  mockDiagnosis,
  mockReturns,
  mockHoldingsNews,
} from './mockData'

// 检测是否为演示模式
const isDemoMode = () => {
  const params = new URLSearchParams(window.location.search)
  return params.get('demo') === '1'
}

interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
  traceId: string;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const json: ApiResponse<T> = await res.json();
  if (json.code !== 0) {
    throw new Error(json.message || '请求失败');
  }
  return json.data;
}

// ========== 基金诊断 ==========
export const fundApi = {
  getDiagnosis: (fundCode: string) => {
    if (isDemoMode()) {
      // 演示模式：返回 mock 数据（根据基金代码简单匹配）
      return Promise.resolve({
        ...mockDiagnosis,
        fund_code: fundCode,
        fund_name: mockDiagnosis.fund_name,
      })
    }
    return request<any>(`/api/fund/diagnosis?fund_code=${fundCode}`)
  },

  getReturns: (fundCode: string) => {
    if (isDemoMode()) {
      return Promise.resolve(mockReturns)
    }
    return request<any>(`/api/fund/returns?fund_code=${fundCode}`)
  },

  getHoldingsNews: (fundCode: string) => {
    if (isDemoMode()) {
      return Promise.resolve({ news: mockHoldingsNews })
    }
    return request<any>(`/api/fund/holdings-news?fund_code=${fundCode}`)
  },
};

// ========== 行情 ==========
export const marketApi = {
  getIndices: () => {
    if (isDemoMode()) {
      return Promise.resolve({ indices: mockIndices })
    }
    return request<any>('/api/market/indices').then(res => res.indices || [])
  },

  getFunds: (params?: {
    fund_type?: string;
    sort_by?: string;
    order?: string;
    page?: number;
    page_size?: number;
  }) => {
    if (isDemoMode()) {
      // 演示模式：简单过滤
      let filtered = [...mockFunds]
      if (params?.fund_type && params.fund_type !== '全部') {
        filtered = filtered.filter(f => f.fund_type === params.fund_type)
      }
      return Promise.resolve({
        list: filtered,
        total: filtered.length,
      })
    }
    
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) query.set(k, String(v));
      });
    }
    return request<any>(`/api/market/funds?${query.toString()}`).then(res => ({
      list: res.list || [],
      total: res.total || 0,
    }));
  },
};

// ========== 资讯 ==========
export const insightsApi = {
  getArticles: (params?: {
    category?: string;
    tag?: string;
    keyword?: string;
    page?: number;
    page_size?: number;
  }) => {
    if (isDemoMode()) {
      // 演示模式：简单过滤
      let filtered = [...mockArticles]
      if (params?.category && params.category !== '全部') {
        filtered = filtered.filter(a => a.category === params.category)
      }
      if (params?.keyword) {
        filtered = filtered.filter(a => 
          a.title.includes(params.keyword!) || 
          a.summary.includes(params.keyword!)
        )
      }
      return Promise.resolve({
        list: filtered,
        hot_tags: mockHotTags,
      })
    }
    
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') query.set(k, String(v));
      });
    }
    return request<any>(`/api/insights/articles?${query.toString()}`);
  },
};

// ========== 问答（演示模式也不使用mock） ==========
export const chatApi = {
  ask: (question: string, history?: { role: string; content: string }[]) =>
    request<{ question: string; answer: string }>('/api/chat/ask', {
      method: 'POST',
      body: JSON.stringify({ question, history, stream: false }),
    }),
};

// ========== 自选（本身已使用watchlist.json，不需要demo模式） ==========
export const watchlistApi = {
  getList: () => request<any[]>('/api/watchlist/'),

  add: (fundCode: string) =>
    request<any>('/api/watchlist/', {
      method: 'POST',
      body: JSON.stringify({ fund_code: fundCode }),
    }),

  remove: (fundCode: string) =>
    request<any>(`/api/watchlist/${fundCode}`, { method: 'DELETE' }),
};
