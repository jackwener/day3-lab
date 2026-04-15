/* ---- API 调用封装（Mock 模式 + 真实 API 兼容） ---- */

import type {
  ListResponse, DetailResponse, CreateResponse, UploadResponse,
  DraftResponse, SmartSearchResponse, LikeResponse, FavoriteResponse,
  RateResponse, TagsResponse, CategoriesResponse, FavoritesResponse,
  ApiError, SkillDetail,
} from '../types/skill';
import { ERROR_MESSAGES } from '../types/skill';
import { mockSkills, mockCategories, mockTags } from '../data/mockData';

const BASE = '/api/v1/hub';
const USE_MOCK = false; // 已切换为真实后端 API

/* ---- Mock helpers ---- */
function delay(ms = 300): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function mockListResponse(params: Record<string, string>): ListResponse {
  let items = [...mockSkills];

  // category filter
  if (params.category) items = items.filter((s) => s.category === params.category);

  // tag filter (AND)
  if (params.tags) {
    const tags = params.tags.split(',');
    items = items.filter((s) => tags.every((t) => s.tags.includes(t)));
  }

  // keyword search
  if (params.q) {
    const q = params.q.toLowerCase();
    items = items.filter((s) =>
      s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || s.tags.some((t) => t.includes(q))
    );
  }

  // sort
  const sort = params.sort || 'hot';
  if (sort === 'hot') items.sort((a, b) => b.hot_score - a.hot_score);
  else if (sort === 'downloads') items.sort((a, b) => b.download_count - a.download_count);
  else if (sort === 'rating') items.sort((a, b) => b.rating_avg - a.rating_avg);
  else if (sort === 'latest') items.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  const total = items.length;
  const page = Number(params.page) || 1;
  const pageSize = Number(params.page_size) || 12;
  items = items.slice((page - 1) * pageSize, page * pageSize);

  return { traceId: 'mock', items, total, page, page_size: pageSize };
}

/* ---- Real request ---- */
async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: 'include',
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  const data = await res.json();
  if (!res.ok) throw data as ApiError;
  return data as T;
}

/* ---- B1: 查询端点 ---- */

export async function fetchSkills(params: Record<string, string>): Promise<ListResponse> {
  if (USE_MOCK) { await delay(400); return mockListResponse(params); }
  const qs = new URLSearchParams(params).toString();
  return request<ListResponse>(`${BASE}/skills?${qs}`);
}

export async function fetchSkillDetail(id: string): Promise<DetailResponse> {
  if (USE_MOCK) {
    await delay(300);
    const s = mockSkills.find((s) => s.skill_id === id);
    if (!s) throw { error: { code: 'SKILL_NOT_FOUND', message: '技能不存在', details: {}, traceId: 'mock' } };
    return {
      ...s, traceId: 'mock',
      skill_md: '# ' + s.name + '\n\n' + s.description + '\n\n## 快速开始\n\n```bash\nnpm install\nnpm run dev\n```\n\n## 特性\n\n- 高性能\n- 类型安全\n- 开箱即用\n\n## 示例代码\n\n```typescript\nconst result = await fetchData();\nconsole.log(result);\n```',
      skill_md_html: '<h1>' + s.name + '</h1><p>' + s.description + '</p><h2>快速开始</h2><pre><code>npm install\nnpm run dev</code></pre><h2>特性</h2><ul><li>高性能</li><li>类型安全</li><li>开箱即用</li></ul><h2>示例代码</h2><pre><code class="language-typescript">const result = await fetchData();\nconsole.log(result);</code></pre>',
      created_at: s.updated_at,
      bundle_size: s.has_bundle ? 2048000 : null,
      file_count: s.has_bundle ? 12 : null,
    } as DetailResponse;
  }
  return request<DetailResponse>(`${BASE}/skills/${id}`);
}

export async function fetchTags(): Promise<TagsResponse> {
  if (USE_MOCK) { await delay(200); return { traceId: 'mock', items: mockTags }; }
  return request<TagsResponse>(`${BASE}/skills/tags`);
}

export async function fetchCategories(): Promise<CategoriesResponse> {
  if (USE_MOCK) { await delay(200); return { traceId: 'mock', items: mockCategories }; }
  return request<CategoriesResponse>(`${BASE}/categories`);
}

/* ---- B2: 提交端点 ---- */

export async function createSkill(body: {
  name: string; category: string; description: string; skill_md: string; tags?: string[];
}): Promise<CreateResponse> {
  if (USE_MOCK) { await delay(600); return { traceId: 'mock', skill_id: String(Date.now()), created_at: new Date().toISOString() }; }
  return request<CreateResponse>(`${BASE}/skills`, { method: 'POST', body: JSON.stringify(body) });
}

export async function uploadZip(
  file: File, onProgress?: (pct: number) => void,
): Promise<UploadResponse> {
  if (USE_MOCK) {
    for (let i = 0; i <= 100; i += 10) { await delay(150); onProgress?.(i); }
    return { traceId: 'mock', skill_id: String(Date.now()), name: file.name.replace('.zip', ''), file_count: 5, bundle_size: file.size };
  }
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${BASE}/skills/upload`);
    xhr.withCredentials = true;
    xhr.upload.onprogress = (e) => { if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => { const d = JSON.parse(xhr.responseText); xhr.status >= 200 && xhr.status < 300 ? resolve(d) : reject(d as ApiError); };
    xhr.onerror = () => reject({ error: { code: 'UPSTREAM_ERROR', message: '网络错误', details: {}, traceId: '' } });
    const fd = new FormData(); fd.append('file', file); xhr.send(fd);
  });
}

export function downloadZip(id: string) { window.open(`${BASE}/skills/${id}/download`, '_blank'); }

/* ---- B3: 互动端点 ---- */

export async function likeSkill(id: string): Promise<LikeResponse> {
  if (USE_MOCK) { await delay(200); const s = mockSkills.find((s) => s.skill_id === id); return { traceId: 'mock', skill_id: id, liked: true, like_count: (s?.like_count || 0) + 1 }; }
  return request<LikeResponse>(`${BASE}/skills/${id}/like`, { method: 'POST' });
}

export async function unlikeSkill(id: string): Promise<LikeResponse> {
  if (USE_MOCK) { await delay(200); const s = mockSkills.find((s) => s.skill_id === id); return { traceId: 'mock', skill_id: id, liked: false, like_count: Math.max(0, (s?.like_count || 1) - 1) }; }
  return request<LikeResponse>(`${BASE}/skills/${id}/like`, { method: 'DELETE' });
}

export async function favoriteSkill(id: string): Promise<FavoriteResponse> {
  if (USE_MOCK) { await delay(200); const s = mockSkills.find((s) => s.skill_id === id); return { traceId: 'mock', skill_id: id, favorited: true, favorite_count: (s?.favorite_count || 0) + 1 }; }
  return request<FavoriteResponse>(`${BASE}/skills/${id}/favorite`, { method: 'POST' });
}

export async function unfavoriteSkill(id: string): Promise<FavoriteResponse> {
  if (USE_MOCK) { await delay(200); const s = mockSkills.find((s) => s.skill_id === id); return { traceId: 'mock', skill_id: id, favorited: false, favorite_count: Math.max(0, (s?.favorite_count || 1) - 1) }; }
  return request<FavoriteResponse>(`${BASE}/skills/${id}/favorite`, { method: 'DELETE' });
}

export async function rateSkill(id: string, score: number): Promise<RateResponse> {
  if (USE_MOCK) { await delay(200); return { traceId: 'mock', skill_id: id, rating_avg: (4.5 + score * 0.1), rating_count: 100, my_score: score }; }
  return request<RateResponse>(`${BASE}/skills/${id}/rate`, { method: 'POST', body: JSON.stringify({ score }) });
}

export async function fetchFavorites(): Promise<FavoritesResponse> {
  if (USE_MOCK) { await delay(300); return { traceId: 'mock', items: mockSkills.slice(0, 5), total: 5 }; }
  return request<FavoritesResponse>(`${BASE}/me/favorites`);
}

/* ---- B3: AI 端点 ---- */

export async function generateDraft(intent: string, category?: string): Promise<DraftResponse> {
  if (USE_MOCK) {
    await delay(2000);
    return { traceId: 'mock', skill_md_draft: `# ${intent}\n\n## 概述\n\n这是一个基于「${intent}」的技能草稿。\n\n## 快速开始\n\n\`\`\`bash\n# 安装依赖\nnpm install\n\n# 启动开发\nnpm run dev\n\`\`\`\n\n## 核心功能\n\n1. 功能一\n2. 功能二\n3. 功能三\n\n## 使用示例\n\n\`\`\`typescript\nimport { init } from './lib';\n\nawait init();\n\`\`\``, fallback: false, upstream_latency_ms: 1800 };
  }
  return request<DraftResponse>(`${BASE}/skills/draft`, { method: 'POST', body: JSON.stringify({ intent, ...(category ? { category } : {}) }) });
}

export async function smartSearch(query: string, limit = 10): Promise<SmartSearchResponse> {
  if (USE_MOCK) {
    await delay(1500);
    const q = query.toLowerCase();
    const items = mockSkills.filter((s) => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)).slice(0, limit);
    const padded = items.length < 5 ? [...items, ...mockSkills.filter((s) => !items.includes(s)).slice(0, 5 - items.length)] : items;
    return { traceId: 'mock', items: padded.map((s) => ({ ...s, match_reason: '语义匹配：' + s.description.slice(0, 40) })), keywords: query.split(' '), fallback: false, upstream_latency_ms: 1200 };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    return await request<SmartSearchResponse>(`${BASE}/skills/smart-search`, { method: 'POST', body: JSON.stringify({ query, limit }), signal: controller.signal });
  } finally { clearTimeout(timer); }
}

/* ---- 工具函数 ---- */
export function getErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'error' in err) {
    const apiErr = err as ApiError;
    return ERROR_MESSAGES[apiErr.error.code] || apiErr.error.message || '未知错误';
  }
  return '网络错误，请稍后重试';
}
