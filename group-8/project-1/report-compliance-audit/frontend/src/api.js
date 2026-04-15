/**
 * API 服务层 — 对接后端 /api/v1/*
 *
 * 后端接口：
 *   POST   /api/v1/reviews              上传研报 + 发起审核（一步完成）
 *   GET    /api/v1/reviews              审核列表（分页）
 *   GET    /api/v1/reviews/:id          审核报告详情（含 issues）
 *   GET    /api/v1/reviews/:id/status   审核进度轮询
 *   GET    /api/v1/reviews/:id/export   导出审核报告
 *   GET    /api/v1/rules                规则列表
 *   PATCH  /api/v1/rules/:id            启停规则
 *
 * 后端审核状态: pending → reviewing → passed / failed / warning
 * 前端展示状态: pending → reviewing → completed → submitted → approved / rejected
 *               （submitted/approved/rejected 为纯前端合规流程）
 */

const API = '/api/v1';

/* ── 基础请求 ── */
async function request(url, options = {}) {
  const res = await fetch(`${API}${url}`, options);
  const json = await res.json();

  if (!res.ok) {
    const msg = json.error?.message || `请求失败 (${res.status})`;
    throw new Error(msg);
  }
  return json.data;
}

/* ── 状态映射 ── */
const BACKEND_TO_FRONTEND_STATUS = {
  pending: 'pending',
  reviewing: 'reviewing',
  passed: 'completed',
  failed: 'completed',
  warning: 'completed',
};

function mapStatus(backendStatus) {
  return BACKEND_TO_FRONTEND_STATUS[backendStatus] || backendStatus;
}

/* ── 审核模式映射 ── */
const MODE_TO_BACKEND = { rule: 'rule', ai: 'ai', rule_ai: 'combined' };
const MODE_LABELS = {
  rule: '规则审核',
  ai: 'AI 审核',
  combined: '规则+AI 联合审核',
  rule_ai: '规则+AI 联合审核',
};

/* ── 格式化时间 ── */
function formatTime(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* ── 计算耗时 ── */
function calcDuration(startIso, endIso) {
  if (!startIso || !endIso) return '-';
  const ms = new Date(endIso) - new Date(startIso);
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${Math.round(ms / 1000)}秒`;
  return `${Math.round(ms / 60000)}分钟`;
}

/* ========== 导出 API ========== */
export const api = {

  /* ── 获取研报列表（映射为前端 report 格式） ── */
  getReports: async () => {
    const data = await request('/reviews?page=1&pageSize=200');
    return (data.list || []).map((r) => ({
      id: r.id,
      name: r.title || r.fileName || '未命名研报',
      reportType: r.reportType,
      fileType: (r.fileName || '').split('.').pop()?.toLowerCase() || 'pdf',
      fileSize: '',
      uploadTime: formatTime(r.submittedAt),
      status: mapStatus(r.status),
      backendStatus: r.status, // 保留原始状态供调试
      reviewMode: r.mode,
      reviewId: r.id,
      score: r.score,
      complianceIssues: r.complianceIssues,
      contentIssues: r.contentIssues,
      complianceNote: null, // 后端无合规流程字段
    }));
  },

  /* ── 上传研报并发起审核（一步完成） ── */
  createReview: async (file, mode, reportType) => {
    const form = new FormData();
    form.append('file', file);
    form.append('mode', MODE_TO_BACKEND[mode] || mode);
    form.append('reportType', reportType || '深度研究');
    return await request('/reviews', { method: 'POST', body: form });
    // → { id, status, message }
  },

  /* ── 轮询审核进度 ── */
  getReviewStatus: async (reviewId) => {
    return await request(`/reviews/${reviewId}/status`);
    // → { id, status, progress, currentStep, steps, estimatedRemaining }
  },

  /* ── 获取审核报告详情（映射为前端 result 格式） ── */
  getReviewResult: async (reviewId) => {
    const d = await request(`/reviews/${reviewId}`);
    const issues = (d.issues || []).map((i) => ({
      id: i.id,
      severity: i.severity,
      location: i.location || '',
      category: i.category === 'compliance'
        ? `合规-${i.ruleName}`
        : `内容-${i.ruleName}`,
      ruleId: i.ruleId,
      description: i.excerpt || i.suggestion || '',
      suggestion: i.suggestion || '',
    }));
    return {
      id: d.id,
      reportId: d.id,
      reportName: d.title || d.fileName || '未命名研报',
      reviewMode: d.mode,
      reviewModeLabel: MODE_LABELS[d.mode] || d.mode,
      duration: calcDuration(d.submittedAt, d.completedAt),
      score: d.score,
      backendStatus: d.status,
      summary: {
        total: issues.length,
        p0: issues.filter((i) => i.severity === 'P0').length,
        p1: issues.filter((i) => i.severity === 'P1').length,
        p2: issues.filter((i) => i.severity === 'P2').length,
      },
      issues,
    };
  },

  /* ── 导出审核报告 ── */
  exportReview: (reviewId, format = 'pdf') => {
    window.open(`${API}/reviews/${reviewId}/export?format=${format}`, '_blank');
  },

  /* ── 原始研报文件 URL（用于内嵌预览） ── */
  getFileUrl: (reviewId) => `${API}/reviews/${reviewId}/file`,

  /* ── 规则列表 ── */
  getRules: async (category, enabled) => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (enabled !== undefined) params.set('enabled', String(enabled));
    const qs = params.toString();
    return await request(`/rules${qs ? '?' + qs : ''}`);
    // → { rules: [...] }
  },

  /* ── 切换规则启停 ── */
  toggleRule: async (ruleId, enabled) => {
    return await request(`/rules/${ruleId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });
  },
};

/* ========== 轮询工具 ========== */
/**
 * 轮询审核状态直到完成
 * @param {string} reviewId
 * @param {function} onProgress  回调 (statusData) 每次轮询触发
 * @param {number} interval      轮询间隔 ms，默认 2000
 * @param {number} timeout       超时 ms，默认 120000
 * @returns {Promise<object>}    最终状态
 */
export async function pollReviewStatus(reviewId, onProgress, interval = 2000, timeout = 120000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const status = await api.getReviewStatus(reviewId);
    if (onProgress) onProgress(status);
    if (status.status !== 'pending' && status.status !== 'reviewing') {
      return status;
    }
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error('审核超时，请稍后刷新查看结果');
}
