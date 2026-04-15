/**
 * API Client — 统一封装后端接口调用。
 * 对齐 TASK-08 §4，基础路径 /api/v1/agent。
 */

const BASE_URL = "/api/v1/agent";

// ── 通用请求封装 ──

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  try {
    const response = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const err = new Error(body?.error?.message || `请求失败 (${response.status})`);
      err.code = body?.error?.code || "UNKNOWN";
      err.status = response.status;
      throw err;
    }
    return await response.json();
  } catch (error) {
    if (!error.status) {
      error.message = "网络错误，请检查后端服务是否启动";
    }
    throw error;
  }
}

// ── 1. 会话管理（对齐 TASK-05） ──

export async function getSessions() {
  return request("/sessions");
}

export async function createSession(title) {
  return request("/sessions", {
    method: "POST",
    body: JSON.stringify({ title: title || undefined }),
  });
}

export async function deleteSession(id) {
  return request(`/sessions/${id}`, { method: "DELETE" });
}

export async function getRecords(sessionId) {
  return request(`/sessions/${sessionId}/records`);
}

// ── 2. 问答 SSE 流式（对齐 TASK-06） ──

export async function askQuestion(query, sessionId, onChunk, onDone, onError) {
  try {
    const response = await fetch(`${BASE_URL}/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, session_id: sessionId }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body?.error?.message || `请求失败 (${response.status})`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let finalResult = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6).trim();
          if (data === "[DONE]") {
            if (onDone) onDone(finalResult);
            return;
          }
          try {
            const parsed = JSON.parse(data);
            if (parsed.event === "chunk") {
              if (onChunk) onChunk(parsed);
            } else if (parsed.event === "done") {
              finalResult = parsed;
              if (onDone) onDone(finalResult);
              return;
            } else if (parsed.event === "error") {
              if (onError) onError(new Error(parsed.message || "服务端错误"));
              return;
            }
          } catch {
            // 普通文本 chunk
            if (onChunk) onChunk({ text: data });
          }
        }
      }
    }

    // 流正常结束但无 done 事件
    if (onDone) onDone(finalResult);
  } catch (error) {
    if (onError) onError(error);
  }
}

// ── 3. 健康检查（对齐 TASK-07） ──

export async function getHealth() {
  return request("/health");
}

// ── 4. 能力探测（对齐 TASK-07） ──

export async function getCapabilities() {
  return request("/capabilities");
}

// ── 5. 原文溯源（对齐 TASK-07） ──

export async function getDocChunk(chunkId) {
  return request(`/doc/chunks?chunk_id=${encodeURIComponent(chunkId)}`);
}

// ── 6. 研报对比 ──

// ── 7. 舆情监控 ──

export async function getNews(refresh = false) {
  return request(`/news${refresh ? "?refresh=true" : ""}`);
}

export async function getReportList() {
  return request("/reports");
}

export async function compareReports(filenames) {
  return request("/reports/compare", {
    method: "POST",
    body: JSON.stringify({ filenames }),
  });
}
