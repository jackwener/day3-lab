/**
 * API 调用模块 — 对齐 Spec 09 全部 11 个端点
 * 使用 fetch API（对齐 Spec 08 §3：浏览器原生，不引入 axios）
 */

const BASE = '/api/v1';

async function request(url, options = {}) {
  const resp = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data?.error?.message || `请求失败 (${resp.status})`);
  }
  return data;
}

// §3 能力探测
export const getCapabilities = () => request('/capabilities');

// §4-6 会话管理
export const getSessions = () => request('/sessions');
export const createSession = (title) => request('/sessions', { method: 'POST', body: JSON.stringify({ title }) });
export const deleteSession = (id) => request(`/sessions/${id}`, { method: 'DELETE' });

// §7 问答记录
export const getSessionRecords = (id) => request(`/sessions/${id}/records`);

// 会话关联文件和分析结果
export const getSessionFiles = (id) => request(`/sessions/${id}/files`);
export const getSessionAnalyze = (id) => request(`/sessions/${id}/analyze`);

// §8-9 文件上传
export const uploadFile = (sessionId, file) => {
  const form = new FormData();
  form.append('session_id', sessionId);
  form.append('file', file);
  return fetch(`${BASE}/files/upload`, { method: 'POST', body: form }).then(r => r.json());
};
export const getFileStatus = (id) => request(`/files/${id}/status`);

// §10 问答提交
export const ask = (query, sessionId, fileId, provider) =>
  request('/ask', {
    method: 'POST',
    body: JSON.stringify({ query, session_id: sessionId, file_id: fileId, provider }),
  });

// §11 模型列表
export const getProviders = () => request('/llm/providers');

// §12-13 深度分析
export const triggerAnalyze = (sessionId, fileId) =>
  request('/analyze', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId, file_id: fileId }),
  });
export const getAnalyzeStatus = (id) => request(`/analyze/${id}/status`);
