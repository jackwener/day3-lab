/**
 * API 客户端 v2.0
 */

const BASE_URL = '/api/v1/agent';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const config = {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  };
  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    config.body = JSON.stringify(options.body);
  }
  if (options.body instanceof FormData) {
    delete config.headers['Content-Type']; // let browser set multipart boundary
  }
  try {
    const response = await fetch(url, config);
    const data = await response.json();
    if (!response.ok) return { error: data.error || { message: '请求失败' } };
    return data;
  } catch (err) {
    return { error: { message: err.message || '网络异常' } };
  }
}

// ==================== 原有 API ====================

export async function getCapabilities() {
  return request('/capabilities');
}

export async function ask(query, sessionId, { systemPrompt, context } = {}) {
  return request('/ask', {
    method: 'POST',
    body: { query, session_id: sessionId, system_prompt: systemPrompt || null, context: context || null },
  });
}

export async function getSessions() {
  return request('/sessions');
}

export async function createSession(title) {
  return request('/sessions', { method: 'POST', body: { title } });
}

export async function deleteSession(sessionId) {
  return request(`/sessions/${sessionId}`, { method: 'DELETE' });
}

export async function getRecords(sessionId) {
  return request(`/sessions/${sessionId}/records`);
}

// ==================== 研报解析 ====================

export async function parseReport(file, sessionId) {
  const form = new FormData();
  form.append('file', file);
  if (sessionId) form.append('session_id', sessionId);
  return request('/parse-report', { method: 'POST', body: form });
}

// ==================== 研报对比 ====================

export async function compareReports(files, sessionId) {
  const form = new FormData();
  files.forEach(f => form.append('files', f));
  if (sessionId) form.append('session_id', sessionId);
  return request('/compare-reports', { method: 'POST', body: form });
}

// ==================== 实时行情 ====================

export async function getMarketData(query, sessionId) {
  const params = new URLSearchParams({ query });
  if (sessionId) params.append('session_id', sessionId);
  return request(`/market-data?${params}`);
}

// ==================== 自定义智能体 CRUD ====================

export async function getCustomAgents() {
  return request('/custom-agents');
}

export async function createCustomAgent(agent) {
  return request('/custom-agents', { method: 'POST', body: agent });
}

export async function updateCustomAgent(agentId, agent) {
  return request(`/custom-agents/${agentId}`, { method: 'PUT', body: agent });
}

export async function deleteCustomAgent(agentId) {
  return request(`/custom-agents/${agentId}`, { method: 'DELETE' });
}

export default {
  getCapabilities, ask, getSessions, createSession, deleteSession, getRecords,
  parseReport, compareReports, getMarketData,
  getCustomAgents, createCustomAgent, updateCustomAgent, deleteCustomAgent,
};
