/**
 * Mock 数据层 — 模拟后端 API
 * 双角色：研究员（上传/审核/提交）+ 合规审核员（同意/驳回）
 * 状态流：pending → reviewing → completed → submitted → approved/rejected
 */

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ========== 系统状态 ==========
let aiServiceAvailable = true;
let nextReportId = 6;
let nextReviewId = 3;

/**
 * 研报状态说明：
 *   pending   — 待审核（研究员已上传，尚未发起审核）
 *   reviewing — 审核中（系统正在执行审核）
 *   completed — 审核完成（研究员可查看结果，尚未提交合规）
 *   submitted — 已提交合规（等待合规审核员审批）
 *   approved  — 合规通过（合规审核员已同意）
 *   rejected  — 合规驳回（合规审核员已驳回，研究员可修改后重审）
 */
let reports = [
  {
    id: 'RPT-001', name: '2026Q1宏观经济形势分析报告.pdf',
    fileType: 'pdf', fileSize: '2.3 MB',
    uploadTime: '2026-04-15 10:30', status: 'submitted',
    reviewMode: 'rule_ai', reviewId: 'RV-001',
    complianceNote: null,
  },
  {
    id: 'RPT-002', name: '新能源行业深度研究报告.docx',
    fileType: 'docx', fileSize: '5.1 MB',
    uploadTime: '2026-04-15 11:15', status: 'pending',
    reviewMode: null, reviewId: null,
    complianceNote: null,
  },
  {
    id: 'RPT-003', name: '半导体产业链投资策略分析.pdf',
    fileType: 'pdf', fileSize: '3.8 MB',
    uploadTime: '2026-04-14 16:20', status: 'approved',
    reviewMode: 'rule', reviewId: 'RV-002',
    complianceNote: '报告合规，可发布',
  },
  {
    id: 'RPT-004', name: '消费行业2026年度展望.pdf',
    fileType: 'pdf', fileSize: '4.2 MB',
    uploadTime: '2026-04-14 14:00', status: 'pending',
    reviewMode: null, reviewId: null,
    complianceNote: null,
  },
  {
    id: 'RPT-005', name: '医药生物板块深度研究报告.docx',
    fileType: 'docx', fileSize: '6.7 MB',
    uploadTime: '2026-04-13 09:45', status: 'rejected',
    reviewMode: 'rule_ai', reviewId: null,
    complianceNote: '第3页敏感信息问题未修改，请处理后重新提交',
  },
];

// ========== Mock 审核结果（← 04 R-03: issue_list / severity / location / suggestion）==========
const reviewResults = {
  'RV-001': {
    id: 'RV-001', reportId: 'RPT-001',
    reportName: '2026Q1宏观经济形势分析报告.pdf',
    reviewMode: 'rule_ai', reviewModeLabel: '规则+AI 联合审核',
    duration: '12秒',
    summary: { total: 5, p0: 1, p1: 2, p2: 2 },
    issues: [
      {
        id: 'ISS-001', severity: 'P0', location: '第3页 第2段',
        category: '合规-敏感信息', ruleId: 'R-C-01',
        description: '疑似包含未公开的内幕信息引用，涉及某上市公司未披露的重大资产重组计划',
        suggestion: '删除相关内容或替换为已公开披露的信息，所有引用需标注公开信息来源',
      },
      {
        id: 'ISS-002', severity: 'P1', location: '第5页 尾部',
        category: '内容-风险提示', ruleId: 'R-CO-01',
        description: '研报缺少风险提示段落，不符合研报发布规范要求',
        suggestion: '在报告结尾添加标准风险提示段落，包含投资风险、市场风险、政策风险等提示',
      },
      {
        id: 'ISS-003', severity: 'P1', location: '第8页 第1段',
        category: '内容-数据来源', ruleId: 'R-CO-02',
        description: '引用GDP增长数据（6.2%）未标注数据来源',
        suggestion: '补充数据来源标注，如"数据来源：国家统计局"或"数据来源：Wind"',
      },
      {
        id: 'ISS-004', severity: 'P2', location: '第2页 第3段',
        category: '合规-政治敏感', ruleId: 'R-C-02',
        description: '涉及国际政治关系的表述，措辞可能引起歧义',
        suggestion: '使用更加中性客观的表述，避免带有主观判断的政治评论',
      },
      {
        id: 'ISS-005', severity: 'P2', location: '第10页 图表3',
        category: '内容-数据来源', ruleId: 'R-CO-02',
        description: '行业数据对比图表缺少"数据来源"标注',
        suggestion: '在图表底部添加"数据来源：Wind / 公司年报"等来源说明',
      },
    ],
  },
  'RV-002': {
    id: 'RV-002', reportId: 'RPT-003',
    reportName: '半导体产业链投资策略分析.pdf',
    reviewMode: 'rule', reviewModeLabel: '规则审核',
    duration: '5秒',
    summary: { total: 2, p0: 0, p1: 1, p2: 1 },
    issues: [
      {
        id: 'ISS-006', severity: 'P1', location: '第12页 第4段',
        category: '内容-数据来源', ruleId: 'R-CO-02',
        description: '引用的全球半导体市场规模数据未标注来源',
        suggestion: '补充数据来源，如"数据来源：WSTS / Gartner"',
      },
      {
        id: 'ISS-007', severity: 'P2', location: '第7页 尾部',
        category: '内容-风险提示', ruleId: 'R-CO-01',
        description: '风险提示段落过于简略，未覆盖技术迭代风险',
        suggestion: '补充半导体行业特有风险提示：技术迭代风险、国际贸易限制风险等',
      },
    ],
  },
};

// ========== 动态生成审核结果 ==========
function generateReviewResult(reportId, reportName, mode) {
  const modeLabels = { rule: '规则审核', ai: 'AI 审核', rule_ai: '规则+AI 联合审核' };
  const id = `RV-${String(nextReviewId++).padStart(3, '0')}`;

  const issues = [
    { severity: 'P1', location: '第4页 第1段', category: '内容-数据来源', ruleId: 'R-CO-02',
      description: '引用行业数据未标注来源', suggestion: '补充数据来源标注' },
    { severity: 'P2', location: '第6页 图表1', category: '内容-数据来源', ruleId: 'R-CO-02',
      description: '图表缺少数据来源说明', suggestion: '在图表底部添加数据来源' },
    { severity: 'P1', location: '第9页 尾部', category: '内容-风险提示', ruleId: 'R-CO-01',
      description: '风险提示段落不够完整', suggestion: '补充完善风险提示内容' },
  ];

  if (mode === 'ai' || mode === 'rule_ai') {
    issues.unshift({
      severity: 'P0', location: '第2页 第3段', category: '合规-敏感信息', ruleId: 'R-C-01',
      description: '存在可能涉及未公开信息的表述', suggestion: '审查并移除可能涉及非公开信息的内容',
    });
  }

  const result = {
    id, reportId, reportName,
    reviewMode: mode, reviewModeLabel: modeLabels[mode],
    duration: mode === 'rule' ? '5秒' : mode === 'ai' ? '18秒' : '12秒',
    summary: {
      total: issues.length,
      p0: issues.filter(i => i.severity === 'P0').length,
      p1: issues.filter(i => i.severity === 'P1').length,
      p2: issues.filter(i => i.severity === 'P2').length,
    },
    issues: issues.map((t, i) => ({ ...t, id: `ISS-${Date.now()}-${i}` })),
  };

  reviewResults[id] = result;
  return result;
}

// ========== Mock API 接口 ==========
export const mockApi = {
  /** 获取系统能力状态 */
  getCapabilities: async () => {
    await delay(200);
    return { service: '研报合规审核系统', version: 'v0.1', aiAvailable: aiServiceAvailable };
  },

  /** 切换 AI 服务状态（演示降级用）← 04 R-04 */
  toggleAiService: () => { aiServiceAvailable = !aiServiceAvailable; return aiServiceAvailable; },
  isAiAvailable: () => aiServiceAvailable,

  /** 获取研报列表 ← US-001 AC-001-03 按时间排序 */
  getReports: async () => {
    await delay(200);
    return [...reports].sort((a, b) => b.uploadTime.localeCompare(a.uploadTime));
  },

  /** 上传研报 ← US-001 AC-001-01/02, 04 R-02: PDF/DOCX, ≤20MB */
  uploadReport: async (file) => {
    await delay(600);
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['pdf', 'docx'].includes(ext)) {
      throw new Error('文件格式不支持，仅允许 PDF / DOCX 格式');
    }
    if (file.size > 20 * 1024 * 1024) {
      throw new Error('文件大小超过 20MB 限制');
    }
    const newReport = {
      id: `RPT-${String(nextReportId++).padStart(3, '0')}`,
      name: file.name, fileType: ext,
      fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      uploadTime: new Date().toLocaleString('zh-CN').replace(/\//g, '-'),
      status: 'pending', reviewMode: null, reviewId: null,
    };
    reports = [newReport, ...reports];
    return newReport;
  },

  /** 发起审核 ← US-002, 04 R-01: 绑定 report_id + review_mode */
  startReview: async (reportId, mode) => {
    const report = reports.find(r => r.id === reportId);
    if (!report) throw new Error('研报不存在');

    // ← 04 R-04: AI 不可用时降级到规则审核
    if (!aiServiceAvailable && (mode === 'ai' || mode === 'rule_ai')) {
      mode = 'rule';
    }

    report.status = 'reviewing';
    report.reviewMode = mode;

    const reviewDelay = mode === 'rule' ? 1500 : mode === 'ai' ? 3500 : 2500;
    await delay(reviewDelay);

    const result = generateReviewResult(reportId, report.name, mode);
    report.status = 'completed';
    report.reviewId = result.id;
    return result;
  },

  /** 获取审核结果 ← US-003 */
  getReviewResult: async (reviewId) => {
    await delay(200);
    const result = reviewResults[reviewId];
    if (!result) throw new Error('审核结果不存在');
    return result;
  },

  /** 重新审核（← US-004: 将研报状态重置为待审核）*/
  resetForReview: (reportId) => {
    const report = reports.find(r => r.id === reportId);
    if (report) {
      report.status = 'pending';
      report.reviewMode = null;
      report.complianceNote = null;
    }
  },

  /** 研究员：提交合规审核（completed → submitted）*/
  submitForCompliance: async (reportId) => {
    await delay(300);
    const report = reports.find(r => r.id === reportId);
    if (!report) throw new Error('研报不存在');
    if (report.status !== 'completed') throw new Error('仅审核完成的研报可提交合规');
    report.status = 'submitted';
    return report;
  },

  /** 合规审核员：同意（submitted → approved）*/
  approveReport: async (reportId, note) => {
    await delay(400);
    const report = reports.find(r => r.id === reportId);
    if (!report) throw new Error('研报不存在');
    report.status = 'approved';
    report.complianceNote = note || '合规通过';
    return report;
  },

  /** 合规审核员：驳回（submitted → rejected）*/
  rejectReport: async (reportId, note) => {
    await delay(400);
    const report = reports.find(r => r.id === reportId);
    if (!report) throw new Error('研报不存在');
    report.status = 'rejected';
    report.complianceNote = note || '存在合规问题，请修改后重新提交';
    return report;
  },
};
