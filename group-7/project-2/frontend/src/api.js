/**
 * API 服务层 — 对齐 spec/09 API 接口规格
 * Base URL: /api/v1/agent
 */

const BASE = 'http://localhost:5000/api/v1/agent';

async function request(url, options = {}) {
  const resp = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err?.error?.message || `HTTP ${resp.status}`);
  }
  return resp.json();
}

// 能力探测
export const getCapabilities = () => request('/capabilities');

// 会话管理
export const getSessions = () => request('/sessions').then(d => d.sessions);
export const createSession = (title) =>
  request('/sessions', { method: 'POST', body: JSON.stringify({ title }) });
export const deleteSession = (id) =>
  request(`/sessions/${id}`, { method: 'DELETE' });

// 问答记录
export const getRecords = (sessionId) =>
  request(`/sessions/${sessionId}/records`).then(d => d.records);

// 问答提交（非流式）
export const askNonStream = (query, sessionId) =>
  request('/ask', { method: 'POST', body: JSON.stringify({ query, session_id: sessionId }) });

// 问答提交（SSE 流式）
export function askStream(query, sessionId, { onChunk, onDone, onError }) {
  const controller = new AbortController();
  fetch(`${BASE}/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({ query, session_id: sessionId }),
    signal: controller.signal,
  })
    .then(async (resp) => {
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        onError?.(err?.error?.message || `HTTP ${resp.status}`);
        return;
      }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();
        let eventType = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            if (eventType === 'chunk') onChunk?.(data.text);
            else if (eventType === 'done') onDone?.(data);
            else if (eventType === 'error') onError?.(data.message);
          }
        }
      }
    })
    .catch((e) => {
      if (e.name !== 'AbortError') onError?.(e.message);
    });
  return controller;
}

// 历史搜索
export const searchRecords = (keyword, limit = 20) =>
  request(`/records/search?keyword=${encodeURIComponent(keyword)}&limit=${limit}`).then(d => d.records);

// 相似提问检测
export const findSimilar = (query) =>
  request('/records/similar', { method: 'POST', body: JSON.stringify({ query }) });

// 股票信息查询
export const getStockInfo = (code) => request(`/stock/${code}`);

// === 研报管理 ===
// 上传研报文件
export async function uploadReport(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${BASE}/reports/upload`, { method: 'POST', body: formData });
  if (!res.ok) throw new Error((await res.json()).error?.message || res.statusText);
  return res.json();
}

// URL链接导入研报
export async function importReportUrl(url, title) {
  const res = await fetch(`${BASE}/reports/url`, {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ url, title })
  });
  if (!res.ok) throw new Error((await res.json()).error?.message || res.statusText);
  return res.json();
}

// 获取研报列表
export async function getReports(page = 1, pageSize = 20) {
  const res = await fetch(`${BASE}/reports?page=${page}&pageSize=${pageSize}`);
  if (!res.ok) throw new Error(res.statusText);
  return res.json();
}

// 删除研报
export async function deleteReport(id) {
  const res = await fetch(`${BASE}/reports/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(res.statusText);
  return res.json();
}

// === 指标对比 ===
export async function compareReports(stockCode, reportIds) {
  const res = await fetch(`${BASE}/compare`, {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ stock_code: stockCode, report_ids: reportIds })
  });
  if (!res.ok) throw new Error((await res.json()).error?.message || res.statusText);
  return res.json();
}

// 导出对比Excel
export async function exportComparison(stockCode, reportIds) {
  const res = await fetch(`${BASE}/compare/export`, {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ stock_code: stockCode, report_ids: reportIds })
  });
  if (!res.ok) throw new Error(res.statusText);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `对比报告_${stockCode}.xlsx`; a.click();
  URL.revokeObjectURL(url);
}

// === 舆情查询 ===
export async function getSentiment(stockCode) {
  const res = await fetch(`${BASE}/stock/${stockCode}/sentiment`);
  if (!res.ok) throw new Error(res.statusText);
  return res.json();
}
