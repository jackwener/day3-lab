/**
 * M1-QA 投研问答助手 — Node.js 后端
 * 对齐 spec/09 API 接口规格，9 个端点
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const https = require('https');
const multer = require('multer');
const { JSDOM } = require('jsdom');

const swaggerUi = require('swagger-ui-express');
const swaggerDoc = require('./swagger.json');

const compareRouter = require('./routes/compare');
const sentimentRouter = require('./routes/sentiment');

const app = express();
app.use(cors());
app.use(express.json());

// ── Swagger API 文档 ──
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'M1-QA 投研问答助手 API 文档',
}));

// ── Storage 层（JSON 文件 CRUD）── 对齐 spec/10
const DATA_DIR = path.join(__dirname, 'data');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
const RECORDS_FILE = path.join(DATA_DIR, 'qa_records.json');
const REPORTS_FILE = path.join(DATA_DIR, 'reports.json');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(SESSIONS_FILE)) fs.writeFileSync(SESSIONS_FILE, '[]');
if (!fs.existsSync(RECORDS_FILE)) fs.writeFileSync(RECORDS_FILE, '[]');
if (!fs.existsSync(REPORTS_FILE)) fs.writeFileSync(REPORTS_FILE, '[]');

function readJSON(file) { return JSON.parse(fs.readFileSync(file, 'utf-8')); }
function writeJSON(file, data) { fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8'); }
function nowISO() { return new Date().toISOString(); }

// ── 工具函数 ──
function traceId(req) { return req.headers['x-trace-id'] || `tr_${uuidv4().replace(/-/g, '')}`; }
function ok(res, data, status = 200, req) { return res.status(status).json({ traceId: traceId(req || res.req), ...data }); }
function err(res, code, message, status = 400, details = {}) {
  return res.status(status).json({ error: { code, message, details, traceId: traceId(res.req) } });
}

// ── StockService ── 对齐 spec/08
const STOCK_CODE_RE = /[（(](\d{6})[）)]/g;
const DEMO_STOCKS = {
  '600519': { name: '贵州茅台', code: '600519' },
  '000858': { name: '五粮液', code: '000858' },
  '601318': { name: '中国平安', code: '601318' },
  '600036': { name: '招商银行', code: '600036' },
  '000001': { name: '平安银行', code: '000001' },
  '600276': { name: '恒瑞医药', code: '600276' },
};

function identifyStocks(text) {
  const found = []; const seen = new Set();
  let m;
  const re = new RegExp(STOCK_CODE_RE.source, 'g');
  while ((m = re.exec(text)) !== null) {
    if (!seen.has(m[1]) && DEMO_STOCKS[m[1]]) { seen.add(m[1]); found.push(DEMO_STOCKS[m[1]]); }
  }
  for (const [code, info] of Object.entries(DEMO_STOCKS)) {
    if (!seen.has(code) && text.includes(info.name)) { seen.add(code); found.push(info); }
  }
  return found;
}

function getStockInfo(code) {
  const s = DEMO_STOCKS[code];
  if (!s) return null;
  return {
    code, name: s.name,
    summary: `${s.name}(${code}) — 最新评级买入，目标价 ¥XXX`,
    latest_reports: [{ title: `关于${s.name}的深度研究报告`, broker: 'Demo券商', date: '2026-04-14' }],
  };
}

// ── CoPaw 投研问答服务（第一级降级）── 对齐 spec/08
async function callCoPaw(query) {
  const copawUrl = process.env.IRA_COPAW_ASK_URL;
  if (!copawUrl) return null;  // 未配置则跳过

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000); // 20s 超时

    const resp = await fetch(copawUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!resp.ok) return null;
    const data = await resp.json();
    return {
      answer: data.answer || data.result || JSON.stringify(data),
      answer_source: 'copaw',
      llm_used: true,
      model: 'copaw'
    };
  } catch (e) {
    console.error('[CoPaw] 调用失败:', e.message);
    return null;
  }
}

// ── 百炼 Agent（OpenAI 兼容接口）── 对齐 spec/08 §4
const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY || '';
const BAILIAN_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
const BAILIAN_MODEL = 'qwen-plus';

function callBailian(query) {
  return new Promise((resolve) => {
    if (!DASHSCOPE_API_KEY) { resolve(null); return; }
    const body = JSON.stringify({
      model: BAILIAN_MODEL,
      messages: [
        { role: 'system', content: '你是一个专业的投研分析助手，擅长研报关键信息提炼和横向对比分析。请用专业、简洁的方式回答用户的投研问题。' },
        { role: 'user', content: query },
      ],
    });
    const url = new URL(BAILIAN_URL);
    const options = {
      hostname: url.hostname, path: url.pathname, method: 'POST',
      headers: { 'Authorization': `Bearer ${DASHSCOPE_API_KEY}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const json = JSON.parse(data);
            const text = json.choices?.[0]?.message?.content || '';
            resolve({ answer: text || '百炼返回空结果', answer_source: 'bailian', llm_used: true, model: json.model || BAILIAN_MODEL });
          } else {
            console.log(`[Bailian] HTTP ${res.statusCode}: ${data.slice(0, 200)}`);
            resolve(null);
          }
        } catch (e) { console.log(`[Bailian] Parse error: ${e.message}`); resolve(null); }
      });
    });
    req.on('error', (e) => { console.log(`[Bailian] Error: ${e.message}`); resolve(null); });
    req.setTimeout(120000, () => { req.destroy(); resolve(null); });
    req.write(body);
    req.end();
  });
}

function demoAnswer(query) {
  return {
    answer: `[Demo 模式] 您的问题是：「${query}」\n\n这是离线演示回答。在配置百炼 API Key 后，系统将使用真实 LLM 生成回答。\n\n示例研报信息：贵州茅台(600519) 最新评级为「买入」，目标价 ¥2,100。招商银行(600036) 评级「增持」。`,
    answer_source: 'demo', llm_used: false, model: null,
  };
}

async function agentAsk(query) {
  const start = Date.now();

  // 读取研报作为上下文
  let reportContext = '';
  let topReports = [];
  try {
    const reports = readJSON(REPORTS_FILE);
    const doneReports = reports.filter(r => r.status === 'done' && r.content_text);
    const SOURCE_PRIORITY = { 'upload': 1, 'api': 2, 'url': 3 };
    doneReports.sort((a, b) => (SOURCE_PRIORITY[a.source] || 999) - (SOURCE_PRIORITY[b.source] || 999));
    topReports = doneReports.slice(0, 3);
    if (topReports.length > 0) {
      reportContext = topReports
        .map(r => `【${r.title}】(来源:${r.source})\n${(r.content_text || '').slice(0, 2000)}`)
        .join('\n---\n');
    }
  } catch (e) {
    console.log('[agentAsk] 读取研报失败:', e.message);
  }

  const enhancedQuery = reportContext
    ? `参考以下研报资料:\n${reportContext}\n\n用户问题: ${query}`
    : query;

  let result = await callCoPaw(enhancedQuery);
  if (!result) result = await callBailian(enhancedQuery);
  if (!result) result = demoAnswer(query); // Demo 模式用原始 query

  // 如果使用了研报上下文，在回答末尾追加来源溯源信息
  if (reportContext && result.answer && topReports && topReports.length > 0) {
    const sourceInfo = topReports.map(r =>
      `- \u{1F4C4} ${r.title}\uFF08\u6765\u6E90: ${r.source === 'upload' ? '\u7528\u6237\u4E0A\u4F20' : r.source === 'url' ? '\u7F51\u9875\u5BFC\u5165' : 'API\u62C9\u53D6'}\uFF0C\u5BFC\u5165\u65F6\u95F4: ${new Date(r.created_at).toLocaleDateString('zh-CN')}\uFF09`
    ).join('\n');
    result.answer += `\n\n---\n**\u{1F4CB} \u7814\u62A5\u6765\u6E90**\n${sourceInfo}`;
  }

  result.response_time_ms = Date.now() - start;
  result.stocks = identifyStocks(result.answer);
  return result;
}

// ── 1. GET /capabilities ──
app.get('/api/v1/agent/capabilities', (req, res) => {
  ok(res, { copaw_configured: !!(process.env.IRA_COPAW_ASK_URL), bailian_configured: !!DASHSCOPE_API_KEY }, 200, req);
});

// ── 2. POST /ask（SSE 流式 + 非流式兼容）──
app.post('/api/v1/agent/ask', async (req, res) => {
  const { query, session_id } = req.body || {};
  if (!query || !query.trim()) return err(res, 'EMPTY_QUERY', '请输入问题');
  if (query.length > 500) return err(res, 'INVALID_QUERY', '问题过长', 400, { max_length: 500 });
  if (!session_id) return err(res, 'INVALID_QUERY', '缺少 session_id');
  const sessions = readJSON(SESSIONS_FILE);
  if (!sessions.find(s => s.session_id === session_id)) return err(res, 'SESSION_NOT_FOUND', '会话不存在', 400, { session_id });

  const result = await agentAsk(query);

  // 落库
  const records = readJSON(RECORDS_FILE);
  const record = {
    id: `rec_${uuidv4().replace(/-/g, '').slice(0, 12)}`, session_id, query,
    answer: result.answer, llm_used: result.llm_used, model: result.model,
    response_time_ms: result.response_time_ms, answer_source: result.answer_source,
    stocks: result.stocks, timestamp: nowISO(),
  };
  records.push(record);
  writeJSON(RECORDS_FILE, records);
  // 更新 session
  const sessionsUpd = readJSON(SESSIONS_FILE);
  const sess = sessionsUpd.find(s => s.session_id === session_id);
  if (sess) {
    sess.query_count = (sess.query_count || 0) + 1;
    sess.updated_at = nowISO();
    if (sess.query_count === 1) sess.title = query.slice(0, 20) + (query.length > 20 ? '...' : '');
    writeJSON(SESSIONS_FILE, sessionsUpd);
  }

  // SSE 流式
  if ((req.headers.accept || '').includes('text/event-stream')) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    // 按 30 字符切分
    const chunks = [];
    for (const line of result.answer.split('\n')) {
      if (!line) { chunks.push('\n'); continue; }
      let rest = line;
      while (rest.length > 30) { chunks.push(rest.slice(0, 30)); rest = rest.slice(30); }
      if (rest) chunks.push(rest + '\n');
    }
    for (const chunk of chunks) {
      res.write(`event: chunk\ndata: ${JSON.stringify({ text: chunk })}\n\n`);
    }
    const doneData = {
      traceId: traceId(req), answer: result.answer, llm_used: result.llm_used,
      model: result.model, response_time_ms: result.response_time_ms,
      answer_source: result.answer_source, stocks: result.stocks.map(s => ({ name: s.name, code: s.code })),
    };
    res.write(`event: done\ndata: ${JSON.stringify(doneData)}\n\n`);
    return res.end();
  }

  // 非流式
  ok(res, result, 200, req);
});

// ── 3. GET /sessions ──
app.get('/api/v1/agent/sessions', (req, res) => {
  const sessions = readJSON(SESSIONS_FILE);
  sessions.sort((a, b) => b.created_at.localeCompare(a.created_at));
  ok(res, { sessions }, 200, req);
});

// ── 4. POST /sessions ──
app.post('/api/v1/agent/sessions', (req, res) => {
  const title = req.body?.title || '新会话';
  const sessions = readJSON(SESSIONS_FILE);
  const now = nowISO();
  const session = { session_id: uuidv4(), title, created_at: now, updated_at: now, query_count: 0 };
  sessions.push(session);
  writeJSON(SESSIONS_FILE, sessions);
  ok(res, session, 201, req);
});

// ── 5. DELETE /sessions/:id ──
app.delete('/api/v1/agent/sessions/:id', (req, res) => {
  const sid = req.params.id;
  let sessions = readJSON(SESSIONS_FILE);
  const orig = sessions.length;
  sessions = sessions.filter(s => s.session_id !== sid);
  if (sessions.length === orig) return err(res, 'SESSION_NOT_FOUND', '会话不存在', 400, { session_id: sid });
  writeJSON(SESSIONS_FILE, sessions);
  let records = readJSON(RECORDS_FILE);
  const deleted = records.filter(r => r.session_id === sid).length;
  records = records.filter(r => r.session_id !== sid);
  writeJSON(RECORDS_FILE, records);
  ok(res, { message: '删除成功', deleted_records: deleted }, 200, req);
});

// ── 6. GET /sessions/:id/records ──
app.get('/api/v1/agent/sessions/:id/records', (req, res) => {
  const sid = req.params.id;
  const sessions = readJSON(SESSIONS_FILE);
  if (!sessions.find(s => s.session_id === sid)) return err(res, 'SESSION_NOT_FOUND', '会话不存在', 400, { session_id: sid });
  const records = readJSON(RECORDS_FILE).filter(r => r.session_id === sid);
  records.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  ok(res, { records }, 200, req);
});

// ── 7. GET /records/search ──
app.get('/api/v1/agent/records/search', (req, res) => {
  const keyword = (req.query.keyword || '').trim();
  if (!keyword) return err(res, 'EMPTY_QUERY', '请输入搜索关键词');
  const limit = parseInt(req.query.limit) || 20;
  const kw = keyword.toLowerCase();
  let records = readJSON(RECORDS_FILE).filter(r => r.query.toLowerCase().includes(kw) || r.answer.toLowerCase().includes(kw));
  records.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  ok(res, { records: records.slice(0, limit) }, 200, req);
});

// ── 8. POST /records/similar ──
app.post('/api/v1/agent/records/similar', (req, res) => {
  const query = (req.body?.query || '').trim();
  if (!query) return err(res, 'EMPTY_QUERY', '请输入问题');
  const records = readJSON(RECORDS_FILE);
  const similar = records.map(r => {
    const a = query.toLowerCase(), b = r.query.toLowerCase();
    // 简单 bigram 相似度
    const bigrams = (s) => { const bg = new Set(); for (let i = 0; i < s.length - 1; i++) bg.add(s.slice(i, i + 2)); return bg; };
    const ba = bigrams(a), bb = bigrams(b);
    const inter = [...ba].filter(x => bb.has(x)).length;
    const ratio = ba.size + bb.size > 0 ? (2 * inter) / (ba.size + bb.size) : 0;
    return { ...r, _similarity: Math.round(ratio * 1000) / 1000 };
  }).filter(r => r._similarity >= 0.4).sort((a, b) => b._similarity - a._similarity).slice(0, 10);
  ok(res, { has_similar: similar.length > 0, similar_records: similar }, 200, req);
});

// ── 9. GET /stock/:code ──
app.get('/api/v1/agent/stock/:code', (req, res) => {
  const code = req.params.code;
  if (!code || !code.trim()) return err(res, 'INVALID_QUERY', '股票代码不能为空');
  const info = getStockInfo(code);
  if (!info) return err(res, 'INVALID_QUERY', `未找到股票代码 ${code}`, 400, { code });
  ok(res, info, 200, req);
});

// ── Multer 配置 ──
const upload = multer({
  dest: UPLOADS_DIR,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.pdf', '.html', '.htm'].includes(ext)) { cb(null, true); }
    else { cb(new Error('UNSUPPORTED_FORMAT')); }
  },
});

// ── 研报文本提取工具 ──
async function extractTextFromPDF(filePath) {
  try {
    const pdfParse = require('pdf-parse');
    const buf = fs.readFileSync(filePath);
    const data = await pdfParse(buf);
    return data.text || '';
  } catch (e) {
    console.log(`[PDF Parse] fallback: ${e.message}`);
    return '[PDF解析不可用] 文件已保存，内容提取需要配置pdf-parse环境';
  }
}

function extractTextFromHTML(html) {
  const dom = new JSDOM(html);
  const body = dom.window.document.body;
  if (!body) return '';
  // 移除 script/style
  body.querySelectorAll('script, style').forEach(el => el.remove());
  return (body.textContent || '').replace(/\s+/g, ' ').trim();
}

function extractStocks(text) {
  return identifyStocks(text);
}

// ── 10. POST /reports/upload — 研报文件上传 ──
app.post('/api/v1/agent/reports/upload', (req, res, next) => {
  upload.single('file')(req, res, async (multerErr) => {
    if (multerErr) {
      if (multerErr.code === 'LIMIT_FILE_SIZE') return err(res, 'FILE_TOO_LARGE', '文件大小超过50MB限制', 400);
      if (multerErr.message === 'UNSUPPORTED_FORMAT') return err(res, 'UNSUPPORTED_FORMAT', '仅支持 PDF/HTML 格式', 400);
      return err(res, 'PARSE_FAILED', multerErr.message, 400);
    }
    if (!req.file) return err(res, 'UNSUPPORTED_FORMAT', '请上传文件', 400);
    const file = req.file;
    const ext = path.extname(file.originalname).toLowerCase();
    const reportId = `rpt_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
    const destName = `${reportId}${ext}`;
    const destPath = path.join(UPLOADS_DIR, destName);
    fs.renameSync(file.path, destPath);

    const report = {
      report_id: reportId,
      title: req.body?.title || file.originalname.replace(ext, ''),
      source: 'upload',
      format: ext.replace('.', ''),
      file_path: destPath,
      content_text: '',
      stock_codes: [],
      status: 'parsing',
      created_at: nowISO(),
    };

    // 先写入 parsing 状态
    const reports = readJSON(REPORTS_FILE);
    reports.push(report);
    writeJSON(REPORTS_FILE, reports);

    try {
      if (ext === '.pdf') {
        report.content_text = await extractTextFromPDF(destPath);
      } else {
        const html = fs.readFileSync(destPath, 'utf-8');
        report.content_text = extractTextFromHTML(html);
      }
      report.stock_codes = extractStocks(report.content_text).map(s => s.code);
      report.status = 'done';
    } catch (e) {
      report.status = 'failed';
      report.content_text = `解析失败: ${e.message}`;
    }

    // 更新
    const reportsUpd = readJSON(REPORTS_FILE);
    const idx = reportsUpd.findIndex(r => r.report_id === reportId);
    if (idx >= 0) reportsUpd[idx] = report;
    writeJSON(REPORTS_FILE, reportsUpd);

    ok(res, report, 201, req);
  });
});

// ── 11. POST /reports/url — URL链接导入 ──
app.post('/api/v1/agent/reports/url', async (req, res) => {
  const { url, title } = req.body || {};
  if (!url || !url.trim()) return err(res, 'INVALID_QUERY', '请提供 URL');

  const reportId = `rpt_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
  const report = {
    report_id: reportId,
    title: title || url,
    source: 'url',
    format: 'html',
    file_path: null,
    content_text: '',
    stock_codes: [],
    status: 'parsing',
    created_at: nowISO(),
  };

  const reports = readJSON(REPORTS_FILE);
  reports.push(report);
  writeJSON(REPORTS_FILE, reports);

  try {
    const resp = await fetch(url, { headers: { 'User-Agent': 'M1-QA-Agent/1.0' }, signal: AbortSignal.timeout(30000) });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const html = await resp.text();
    report.content_text = extractTextFromHTML(html);
    report.stock_codes = extractStocks(report.content_text).map(s => s.code);
    report.status = 'done';
    if (!title) report.title = (() => { try { const dom = new JSDOM(html); return dom.window.document.title || url; } catch { return url; } })();
  } catch (e) {
    report.status = 'failed';
    report.content_text = `抓取失败: ${e.message}`;
  }

  const reportsUpd = readJSON(REPORTS_FILE);
  const idx = reportsUpd.findIndex(r => r.report_id === reportId);
  if (idx >= 0) reportsUpd[idx] = report;
  writeJSON(REPORTS_FILE, reportsUpd);

  if (report.status === 'failed') return err(res, 'PARSE_FAILED', report.content_text, 400);
  ok(res, report, 201, req);
});

// ── 12. GET /reports — 研报列表（分页）──
app.get('/api/v1/agent/reports', (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const pageSize = Math.max(1, Math.min(100, parseInt(req.query.pageSize) || 20));
  const reports = readJSON(REPORTS_FILE);
  reports.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  const total = reports.length;
  const start = (page - 1) * pageSize;
  const paged = reports.slice(start, start + pageSize);
  ok(res, { reports: paged, total, page, pageSize }, 200, req);
});

// ── 13. DELETE /reports/:id — 删除研报 ──
app.delete('/api/v1/agent/reports/:id', (req, res) => {
  const id = req.params.id;
  let reports = readJSON(REPORTS_FILE);
  const target = reports.find(r => r.report_id === id);
  if (!target) return err(res, 'REPORT_NOT_FOUND', '研报不存在', 404, { report_id: id });
  // 删除关联文件
  if (target.file_path && fs.existsSync(target.file_path)) {
    try { fs.unlinkSync(target.file_path); } catch (e) { console.log(`[Delete file] ${e.message}`); }
  }
  reports = reports.filter(r => r.report_id !== id);
  writeJSON(REPORTS_FILE, reports);
  ok(res, { success: true }, 200, req);
});

// ── 根路径 ──
app.get('/', (req, res) => { res.json({ status: 'ok', module: 'M1-QA 投研问答助手', api_docs: '/api-docs' }); });

// === 集成路由模块 ===
app.use('/api/v1/agent', compareRouter);
app.use('/api/v1/agent', sentimentRouter);

// ── 启动 ──
const PORT = process.env.PORT || 5000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`M1-QA 后端已启动: http://localhost:${PORT}`);
    console.log(`API 文档: http://localhost:${PORT}/api-docs`);
  });
}

module.exports = app;
