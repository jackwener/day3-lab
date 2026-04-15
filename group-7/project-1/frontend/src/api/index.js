/**
 * API Service Layer - 投研问答助手
 * Base URL: /api/v1/agent
 */

const API_BASE = '/api/v1/agent'

// ==================== 错误码映射 ====================
const ERROR_MESSAGES = {
  EMPTY_QUERY: '请输入问题',
  INVALID_QUERY: '问题过长，最多500字符',
  EMPTY_SESSION_ID: '请先选择一个会话',
  INVALID_SESSION_ID: '会话ID格式错误',
  SESSION_NOT_FOUND: '会话不存在或已被删除',
  EMPTY_FILE: '请选择要上传的文件',
  INVALID_FILE_TYPE: '仅支持 PDF、DOC、DOCX 格式',
  INVALID_TITLE: '标题过长，最多100字符',
  REPORT_NOT_FOUND: '研报不存在',
  LLM_UNAVAILABLE: 'LLM服务暂时不可用，请稍后重试',
  ANALYSIS_FAILED: '研报分析失败',
  INVALID_REPORT_COUNT: '研报数量不足，至少需要2个',
  INVALID_FORMAT: '导出格式不支持，请选择JSON或TXT',
  INTERNAL_ERROR: '服务异常，请稍后重试',
}

// ==================== 请求封装 ====================
async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  }

  // 处理 FormData 时不设置 Content-Type
  if (options.body instanceof FormData) {
    delete config.headers['Content-Type']
  }

  try {
    const response = await fetch(url, config)
    const data = await response.json()

    if (!response.ok) {
      const errorCode = data.error?.code || 'INTERNAL_ERROR'
      const errorMessage = ERROR_MESSAGES[errorCode] || data.error?.message || '请求失败'
      const error = new Error(errorMessage)
      error.code = errorCode
      error.details = data.error?.details || {}
      error.traceId = data.error?.traceId
      throw error
    }

    // 转换后端字段为前端期望的字段
    return transformResponse(data)
  } catch (error) {
    // 网络错误处理
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      const networkError = new Error('网络连接失败，请检查后端服务是否启动')
      networkError.code = 'NETWORK_ERROR'
      throw networkError
    }
    throw error
  }
}

// ==================== 响应字段转换 ====================
function transformResponse(data) {
  // 转换 records 中的 id -> record_id
  if (data.records && Array.isArray(data.records)) {
    data.records = data.records.map(record => ({
      ...record,
      record_id: record.record_id || record.id,
    }))
  }
  return data
}

// ==================== API 端点 ====================

// 1. GET /capabilities - 能力探测
export async function getCapabilities() {
  return request('/capabilities')
}

// 2. POST /ask - 问答提交
export async function askQuestion(query, sessionId) {
  return request('/ask', {
    method: 'POST',
    body: JSON.stringify({ query, session_id: sessionId }),
  })
}

// 3. POST /sessions - 新建会话
export async function createSession(title = '新会话') {
  try {
    const response = await fetch(`${API_BASE}/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title }),
    })
    
    if (!response.ok) {
      throw new Error('Backend error')
    }
    
    const data = await response.json()
    return transformResponse(data)
  } catch (error) {
    // 后端不可用时，返回本地 mock 数据
    console.log('Backend unavailable, using local mock session')
    return {
      session_id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: title,
      created_at: new Date().toISOString(),
      query_count: 0,
    }
  }
}

// 4. GET /sessions - 会话列表
export async function getSessions(page = 1, pageSize = 20) {
  return request(`/sessions?page=${page}&page_size=${pageSize}`)
}

// 5. DELETE /sessions/<id> - 删除会话
export async function deleteSession(sessionId) {
  return request(`/sessions/${sessionId}`, {
    method: 'DELETE',
  })
}

// 6. PUT /sessions/<id> - 更新会话标题
export async function updateSessionTitle(sessionId, title) {
  return request(`/sessions/${sessionId}`, {
    method: 'PUT',
    body: JSON.stringify({ title }),
  })
}

// 7. GET /sessions/<id>/records - 问答记录
export async function getSessionRecords(sessionId, page = 1, pageSize = 50) {
  return request(`/sessions/${sessionId}/records?page=${page}&page_size=${pageSize}`)
}

// 8. POST /reports - 上传研报
export async function uploadReport(file, title) {
  const formData = new FormData()
  formData.append('file', file)
  if (title) {
    formData.append('title', title)
  }
  return request('/reports', {
    method: 'POST',
    body: formData,
  })
}

// 9. GET /reports - 研报列表
export async function getReports(page = 1, pageSize = 20, filters = {}) {
  const params = new URLSearchParams({ page, page_size: pageSize })
  if (filters.status) params.append('status', filters.status)
  if (filters.company) params.append('company', filters.company)
  if (filters.industry) params.append('industry', filters.industry)
  return request(`/reports?${params.toString()}`)
}

// 10. DELETE /reports/<id> - 删除研报
export async function deleteReport(reportId) {
  return request(`/reports/${reportId}`, {
    method: 'DELETE',
  })
}

// 10.5 GET /reports/<id> - 获取研报详情
export async function getReportDetail(reportId) {
  return request(`/reports/${reportId}`)
}

// 11. POST /reports/<id>/analyze - 分析研报
export async function analyzeReport(reportId) {
  return request(`/reports/${reportId}/analyze`, {
    method: 'POST',
  })
}

// 12. GET /health - 健康检查
export async function getHealth() {
  return request('/health')
}

// 13. POST /export - 导出问答记录
export async function exportRecords(sessionId, format = 'json') {
  return request('/export', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId, format }),
  })
}

// ==================== 导出所有API ====================
export default {
  getCapabilities,
  askQuestion,
  createSession,
  getSessions,
  deleteSession,
  updateSessionTitle,
  getSessionRecords,
  uploadReport,
  getReports,
  deleteReport,
  analyzeReport,
  getHealth,
  exportRecords,
}
