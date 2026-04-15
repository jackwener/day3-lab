/**
 * Node.js Express 后端服务 — 投研问答助手 API。
 * 完全兼容 Flask agent_bp 的 8 个 API 端点。
 * 启动: node server.js
 */

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swagger");
const RssParser = require("rss-parser");

// ── 读取 .env 文件（简易版，不依赖 dotenv） ──
const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf-8").split("\n").forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const idx = trimmed.indexOf("=");
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        if (!process.env[key]) process.env[key] = val;
      }
    }
  });
}

const app = express();
app.use(cors());
app.use(express.json());

// ── Swagger UI — /api-docs ──
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: ".swagger-ui .topbar { display: none }",
  customSiteTitle: "投研问答助手 — API 文档",
}));
// 提供 JSON 规格文件
app.get("/api-docs.json", (req, res) => res.json(swaggerSpec));

const DATA_DIR = path.join(__dirname, "data");
const SESSION_FILE = path.join(DATA_DIR, "session_info.json");
const MESSAGE_FILE = path.join(DATA_DIR, "message_log.json");
const CHUNK_FILE = path.join(DATA_DIR, "doc_chunks.json");

// ── 确保数据目录和文件存在 ──
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
for (const f of [SESSION_FILE, MESSAGE_FILE, CHUNK_FILE]) {
  if (!fs.existsSync(f)) fs.writeFileSync(f, "[]", "utf-8");
}

function readJSON(file) {
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
}
function nowUTC() {
  return new Date().toISOString();
}

// ══════════════════════════════════════════
// Demo 模式预置数据
// ══════════════════════════════════════════

const DEMO_ANSWERS = {
  评级:
    "根据最新券商研报，该股票获得以下评级：\n\n" +
    "- **中金公司**：买入（维持）\n" +
    "- **中信证券**：增持（上调）\n" +
    "- **国泰君安**：买入（首次覆盖）\n\n" +
    "综合来看，市场对该标的持乐观态度，一致预期评级为「买入」。[1]",
  目标价:
    "各主要券商给出的目标价区间如下：\n\n" +
    "| 券商 | 目标价（元） | 评级日期 |\n" +
    "|------|------------|----------|\n" +
    "| 中金公司 | 85.00 | 2025-12-01 |\n" +
    "| 中信证券 | 82.50 | 2025-11-28 |\n" +
    "| 国泰君安 | 88.00 | 2025-11-25 |\n\n" +
    "一致目标价中位数为 **85.00 元**，较当前价格有约 15% 的上涨空间。[1]",
  同行业:
    "与同行业可比公司对比：\n\n" +
    "- **市盈率 (PE)**：25.6x vs 行业平均 30.2x → 估值偏低\n" +
    "- **ROE**：18.5% vs 行业平均 14.2% → 盈利能力突出\n" +
    "- **营收增速**：12.3% vs 行业平均 8.7% → 成长性优良\n" +
    "- **毛利率**：42.1% vs 行业平均 35.8% → 成本控制出色\n\n" +
    "综合来看，该公司在行业中处于领先地位。[2]",
  对比:
    "与同行业可比公司对比：\n\n" +
    "- **市盈率 (PE)**：25.6x vs 行业平均 30.2x → 估值偏低\n" +
    "- **ROE**：18.5% vs 行业平均 14.2% → 盈利能力突出\n" +
    "- **营收增速**：12.3% vs 行业平均 8.7% → 成长性优良\n" +
    "- **毛利率**：42.1% vs 行业平均 35.8% → 成本控制出色\n\n" +
    "综合来看，该公司在行业中处于领先地位。[2]",
  风险:
    "核心风险因素包括：\n\n" +
    "1. **政策风险**：行业监管政策趋严，可能影响业务拓展节奏\n" +
    "2. **竞争风险**：新进入者增加，市场份额面临挤压压力\n" +
    "3. **汇率风险**：海外业务占比 30%，汇率波动影响利润\n" +
    "4. **原材料风险**：上游原材料价格波动可能侵蚀毛利率\n\n" +
    "建议投资者关注季度财报中相关数据的边际变化。",
  default:
    "根据最新研报分析，该标的基本面保持稳健。主要指标显示：\n\n" +
    "1. **营收增长**：同比增长 12.3%，超出市场预期\n" +
    "2. **净利润率**：维持在 18.5% 的较高水平\n" +
    "3. **市盈率**：当前 PE 为 25.6x，处于历史中位数附近\n\n" +
    "建议关注下季度财报发布时间节点。",
};

const DEMO_REFERENCES = [
  {
    chunk_id: "demo_chunk_001",
    doc_title: "2025年度投资策略报告",
    page: 12,
    highlight_text:
      "综合各项财务指标，我们维持对该标的的「买入」评级，12个月目标价85.00元，对应2026年25倍PE。",
    doc_url: "",
  },
  {
    chunk_id: "demo_chunk_002",
    doc_title: "行业深度研究：竞争格局分析",
    page: 8,
    highlight_text:
      "从ROE和营收增速两个维度来看，该公司在同业中保持领先优势，预计未来两年仍将维持行业龙头地位。",
    doc_url: "",
  },
];

function matchDemoAnswer(query) {
  for (const [keyword, answer] of Object.entries(DEMO_ANSWERS)) {
    if (keyword !== "default" && query.includes(keyword)) {
      const refs = [];
      if (answer.includes("[1]")) refs.push(DEMO_REFERENCES[0]);
      if (answer.includes("[2]")) refs.push(DEMO_REFERENCES[1]);
      return { answer, refs };
    }
  }
  return { answer: DEMO_ANSWERS.default, refs: [] };
}

// ══════════════════════════════════════════
// RAG 检索层 — 基于关键词的文档块检索
// ══════════════════════════════════════════

/**
 * 从 doc_chunks.json 中检索与 query 最相关的文档块。
 * 采用 TF 关键词匹配 + 分段加权打分，返回 top-N 结果。
 */
function retrieveChunks(query, topN = 5) {
  const chunks = readJSON(CHUNK_FILE);
  if (!chunks || chunks.length === 0) return [];

  // 对 query 做分词（简易中文分词：按标点、空格拆分 + 滑动 2-4 字窗口）
  const queryTerms = extractTerms(query);

  const scored = chunks.map((chunk) => {
    let score = 0;
    const chunkKeywords = chunk.keywords || [];
    const chunkText = (chunk.highlight_text || "") + " " + (chunk.section || "");

    // 1. 关键词精确匹配（高权重）
    for (const kw of chunkKeywords) {
      if (query.includes(kw)) score += 10;
    }

    // 2. query 分词在 chunk 文本中出现（中权重）
    for (const term of queryTerms) {
      if (chunkText.includes(term)) score += 3;
    }

    // 3. chunk 文本中出现 query 中的连续子串（低权重补充）
    if (query.length >= 2) {
      for (let i = 0; i < query.length - 1; i++) {
        const bigram = query.slice(i, i + 2);
        if (chunkText.includes(bigram)) score += 1;
      }
    }

    return { chunk, score };
  });

  // 按分数降序，取 top-N（分数 > 0 才返回）
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
    .map((s) => s.chunk);
}

/** 简易中文分词：提取有意义的 term */
function extractTerms(text) {
  const terms = new Set();
  // 去除标点后的纯文本
  const clean = text.replace(/[，。？！、；：""''（）\[\]【】\s]/g, " ");
  const words = clean.split(/\s+/).filter((w) => w.length >= 2);
  for (const w of words) terms.add(w);
  // 滑动窗口提取 2-3 字词
  const raw = text.replace(/\s+/g, "");
  for (let i = 0; i < raw.length - 1; i++) {
    terms.add(raw.slice(i, i + 2));
    if (i < raw.length - 2) terms.add(raw.slice(i, i + 3));
  }
  return [...terms];
}

// ══════════════════════════════════════════
// 百炼 DashScope API 调用（OpenAI 兼容模式）
// ══════════════════════════════════════════

/**
 * 调用百炼大模型。
 * @param {string} query - 用户问题
 * @param {Array} contextChunks - RAG 检索到的文档块（可为空）
 */
async function callBailianAPI(query, contextChunks = []) {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) return null;

  const model = process.env.BAILIAN_MODEL || "qwen-turbo";
  const url = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";

  // 构造 RAG prompt
  let systemPrompt, userPrompt;

  if (contextChunks.length > 0) {
    // 有检索到的研报内容 → RAG 模式
    const contextText = contextChunks
      .map((c, i) => `[${i + 1}] 【${c.section}】（第${c.page}页）\n${c.highlight_text}`)
      .join("\n\n");

    systemPrompt =
      "你是一个专业的投研问答助手。请基于以下研报内容回答用户的问题。\n" +
      "要求：\n" +
      "1. 严格基于研报内容回答，不要编造数据\n" +
      "2. 回答中引用信息来源时，使用 [n] 标注对应的段落编号\n" +
      "3. 如果研报中没有相关信息，请如实说明\n" +
      "4. 回答要专业、简洁、有条理，适当使用 markdown 格式\n\n" +
      "===== 研报内容 =====\n" +
      contextText;

    userPrompt = query;
  } else {
    // 无研报上下文 → 普通问答
    systemPrompt = "你是一个专业的投研问答助手，请回答用户关于投资研究的问题。";
    userPrompt = query;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!resp.ok) {
      const errBody = await resp.text().catch(() => "");
      console.warn(`百炼 API 返回错误: status=${resp.status}, body=${errBody.slice(0, 200)}`);
      return null;
    }

    const data = await resp.json();
    const answer = data?.choices?.[0]?.message?.content;
    if (!answer) {
      console.warn("百炼返回空 answer:", JSON.stringify(data).slice(0, 200));
      return null;
    }

    // 构造引用列表（仅 RAG 模式）
    const references = contextChunks.map((c, i) => ({
      chunk_id: c.chunk_id,
      doc_title: c.doc_title,
      page: c.page,
      section: c.section,
      highlight_text: (c.highlight_text || "").slice(0, 120) + "...",
    }));

    return {
      answer,
      llm_used: true,
      model,
      answer_source: "bailian",
      references,
    };
  } catch (err) {
    if (err.name === "AbortError") {
      console.warn("百炼 API 调用超时 (120s)");
    } else {
      console.warn("百炼 API 调用异常:", err.message);
    }
    return null;
  }
}

// ══════════════════════════════════════════
// API 路由 — /api/v1/agent
// ══════════════════════════════════════════
const router = express.Router();

// 1. GET /capabilities
router.get("/capabilities", (req, res) => {
  const copaw = !!process.env.IRA_COPAW_CHAT_URL;
  const bailian = !!process.env.DASHSCOPE_API_KEY;
  res.json({
    copaw_configured: copaw,
    bailian_configured: bailian,
    model: bailian ? "qwen-turbo" : null,
    traceId: req.headers["x-trace-id"] || `tr_${crypto.randomUUID().slice(0, 8)}`,
  });
});

// 2. GET /health
router.get("/health", (req, res) => {
  const copaw = !!process.env.IRA_COPAW_CHAT_URL;
  const bailian = !!process.env.DASHSCOPE_API_KEY;
  const anyUp = copaw || bailian;
  res.json({
    status: anyUp ? "UP" : "DEGRADED",
    message: anyUp
      ? `LLM Provider 已配置${copaw ? " [CoPaw]" : ""}${bailian ? " [百炼]" : ""}`
      : "所有 LLM Provider 未配置，当前为 Demo 模式",
    components: {
      storage: "UP",
      llm_copaw: copaw ? "UP" : "DOWN",
      llm_bailian: bailian ? "UP" : "DOWN",
    },
    traceId: req.headers["x-trace-id"] || `tr_${crypto.randomUUID().slice(0, 8)}`,
  });
});

// 3. GET /sessions
router.get("/sessions", (req, res) => {
  const sessions = readJSON(SESSION_FILE);
  sessions.sort((a, b) => b.created_at.localeCompare(a.created_at));
  res.json({ sessions });
});

// 4. POST /sessions
router.post("/sessions", (req, res) => {
  const title = req.body?.title || "新会话";
  const now = nowUTC();
  const session = {
    session_id: crypto.randomUUID(),
    title,
    created_at: now,
    updated_at: now,
    query_count: 0,
  };
  const sessions = readJSON(SESSION_FILE);
  sessions.push(session);
  writeJSON(SESSION_FILE, sessions);
  res.status(201).json(session);
});

// 5. DELETE /sessions/:id
router.delete("/sessions/:sessionId", (req, res) => {
  const { sessionId } = req.params;
  let sessions = readJSON(SESSION_FILE);
  const idx = sessions.findIndex((s) => s.session_id === sessionId);
  if (idx === -1) {
    return res.status(404).json({ error: { code: "SESSION_NOT_FOUND", message: `会话 ${sessionId} 不存在` } });
  }
  sessions.splice(idx, 1);
  writeJSON(SESSION_FILE, sessions);

  // 级联删除记录
  let records = readJSON(MESSAGE_FILE);
  const delCount = records.filter((r) => r.session_id === sessionId).length;
  records = records.filter((r) => r.session_id !== sessionId);
  writeJSON(MESSAGE_FILE, records);

  res.json({ deleted_session_id: sessionId, deleted_records_count: delCount });
});

// 6. GET /sessions/:id/records
router.get("/sessions/:sessionId/records", (req, res) => {
  const { sessionId } = req.params;
  const sessions = readJSON(SESSION_FILE);
  if (!sessions.find((s) => s.session_id === sessionId)) {
    return res.status(404).json({ error: { code: "SESSION_NOT_FOUND", message: `会话 ${sessionId} 不存在` } });
  }
  const records = readJSON(MESSAGE_FILE)
    .filter((r) => r.session_id === sessionId)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  res.json({ records });
});

// 7. POST /ask (SSE 流式) — 优先调用百炼 API，失败降级到 Demo
router.post("/ask", async (req, res) => {
  const { query, session_id } = req.body || {};
  if (!query || !query.trim()) {
    return res.status(400).json({ error: { code: "INVALID_QUERY", message: "query 不能为空" } });
  }
  if (query.length > 500) {
    return res.status(400).json({ error: { code: "QUERY_TOO_LONG", message: "query 长度不能超过 500 字" } });
  }
  if (!session_id) {
    return res.status(400).json({ error: { code: "INVALID_SESSION", message: "session_id 不能为空" } });
  }

  const sessions = readJSON(SESSION_FILE);
  if (!sessions.find((s) => s.session_id === session_id)) {
    return res.status(404).json({ error: { code: "SESSION_NOT_FOUND", message: `会话 ${session_id} 不存在` } });
  }

  // 三级降级：CoPaw(跳过) → 百炼 → Demo
  const startTime = Date.now();
  let answer, refs, llmUsed, model, answerSource;

  // RAG 检索：从研报中提取相关片段
  const relevantChunks = retrieveChunks(query.trim(), 5);
  if (relevantChunks.length > 0) {
    console.log(`ask(): RAG 检索到 ${relevantChunks.length} 个相关文档块`);
  }

  // 尝试调用百炼 API（带 RAG 上下文）
  const bailianResult = await callBailianAPI(query.trim(), relevantChunks);
  if (bailianResult) {
    answer = bailianResult.answer;
    refs = bailianResult.references;
    llmUsed = true;
    model = bailianResult.model;
    answerSource = "bailian";
    console.log("ask(): 百炼返回成功，answer_source=bailian");
  } else {
    // 降级到 Demo
    const demoResult = matchDemoAnswer(query.trim());
    answer = demoResult.answer;
    refs = demoResult.refs;
    llmUsed = false;
    model = null;
    answerSource = "demo";
    console.log("ask(): 百炼不可用，降级到 Demo 模式");
  }

  // 设置 SSE 头 — 使用 res.writeHead 确保 Express 5 立即 flush
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
  });

  // 一次性推送全部 chunk
  const chars = [...answer];
  for (const ch of chars) {
    res.write(`data: ${JSON.stringify({ event: "chunk", text: ch })}\n\n`);
  }

  const elapsedMs = Date.now() - startTime;
  const now = nowUTC();
  const recordId = `rec_${Date.now()}`;

  // 写入存储
  const record = {
    record_id: recordId,
    session_id,
    query: query.trim(),
    answer,
    llm_used: llmUsed,
    model,
    response_time_ms: elapsedMs,
    answer_source: answerSource,
    timestamp: now,
    references: refs,
  };
  const records = readJSON(MESSAGE_FILE);
  records.push(record);
  writeJSON(MESSAGE_FILE, records);

  // 更新 session
  const allSessions = readJSON(SESSION_FILE);
  const sess = allSessions.find((s) => s.session_id === session_id);
  if (sess) {
    sess.query_count = (sess.query_count || 0) + 1;
    sess.updated_at = now;
    sess.last_query = query.trim();
    if (sess.query_count === 1) {
      sess.title = query.trim().slice(0, 20) + (query.trim().length > 20 ? "..." : "");
    }
    writeJSON(SESSION_FILE, allSessions);
  }

  // 发送 done 事件
  const doneEvent = {
    event: "done",
    answer,
    llm_used: llmUsed,
    model,
    answer_source: answerSource,
    response_time_ms: elapsedMs,
    references: refs,
    record_id: recordId,
    created_at: now,
  };
  res.write(`data: ${JSON.stringify(doneEvent)}\n\n`);
  res.write("data: [DONE]\n\n");
  res.end();
});

// 8. GET /doc/chunks
router.get("/doc/chunks", (req, res) => {
  const chunkId = req.query.chunk_id;
  if (!chunkId) {
    return res.status(400).json({ error: { code: "INVALID_CHUNK_ID", message: "chunk_id 参数不能为空" } });
  }

  // 先查存储
  const chunks = readJSON(CHUNK_FILE);
  let chunk = chunks.find((c) => c.chunk_id === chunkId);

  // 再查 Demo 内置引用
  if (!chunk) {
    chunk = DEMO_REFERENCES.find((r) => r.chunk_id === chunkId);
  }

  if (!chunk) {
    return res.status(404).json({ error: { code: "CHUNK_NOT_FOUND", message: `文档块 ${chunkId} 不存在` } });
  }
  res.json(chunk);
});

// ══════════════════════════════════════════
// 研报对比 API — /api/v1/agent/reports
// ══════════════════════════════════════════

const REPORTS_DIR = path.join(DATA_DIR, "reports");

/** 从 Markdown 研报中提取关键参数 */
function parseReport(content, filename) {
  const r = {};

  // 标题（第一行 # 开头）
  const titleMatch = content.match(/^#\s+(.+)/m);
  r.title = titleMatch ? titleMatch[1].trim() : filename.replace(/\.md$/, "");

  // 股票代码
  const codeMatch = r.title.match(/[（(](\d{6}\.\w+)[）)]/);
  r.stockCode = codeMatch ? codeMatch[1] : "";

  // 公司简称（标题中括号前的部分）
  r.companyName = r.title.replace(/[（(].+$/, "").replace(/\d{4}年度?.+$/, "").trim();

  // 发布机构
  const orgMatch = content.match(/\*?\*?发布机构[：:]\*?\*?\s*(.+)/);
  r.institution = orgMatch ? orgMatch[1].trim() : "";

  // 发布日期
  const dateMatch = content.match(/\*?\*?发布日期[：:]\*?\*?\s*(.+)/);
  r.publishDate = dateMatch ? dateMatch[1].trim() : "";

  // 评级
  const ratingMatch = content.match(/\*?\*?评级[：:]\*?\*?\s*(.+)/);
  r.rating = ratingMatch ? ratingMatch[1].trim() : "";

  // 目标价
  const targetMatch = content.match(/\*?\*?目标价[：:]\*?\*?\s*([\d.]+)元/);
  r.targetPrice = targetMatch ? parseFloat(targetMatch[1]) : null;

  // 当前价
  const currentMatch = content.match(/\*?\*?当前价[：:]\*?\*?\s*([\d.]+)元/);
  r.currentPrice = currentMatch ? parseFloat(currentMatch[1]) : null;

  // 上涨空间
  if (r.targetPrice && r.currentPrice) {
    r.upside = +(((r.targetPrice - r.currentPrice) / r.currentPrice) * 100).toFixed(1);
  } else {
    r.upside = null;
  }

  // 财务数据表格解析 — 从营收与利润预测表格提取
  // 策略：找到 "营收与利润预测" 后的第一个 markdown 表格（连续的 | 行）
  r.financials = {};
  const lines = content.split("\n");
  let inFinTable = false;
  let foundFinHeader = false;
  const tableRows = [];
  for (const line of lines) {
    if (line.includes("营收与利润预测")) {
      foundFinHeader = true;
      continue;
    }
    if (foundFinHeader) {
      const trimmed = line.trim();
      // 表格行：包含 | 且不是纯分隔线
      if (trimmed.startsWith("|") && trimmed.includes("|")) {
        if (trimmed.match(/^[\s|:-]+$/)) continue; // 跳过分隔线 |---|---|
        inFinTable = true;
        tableRows.push(trimmed);
      } else if (inFinTable) {
        // 表格已结束
        break;
      }
    }
  }

  if (tableRows.length > 0) {
    // 第一行是表头，后面是数据
    const dataRows = tableRows.filter(row => !row.includes("指标"));
    for (const row of dataRows) {
      const cells = row.split("|").map(c => c.trim()).filter(Boolean);
      if (cells.length < 2) continue;
      const label = cells[0];
      const values = cells.slice(1);
      const makeObj = (vals) => ({
        "2023A": vals[0] || "—",
        "2024A": vals[1] || "—",
        "2025E": vals[2] || "—",
        "2026E": vals[3] || "—",
        "2027E": vals[4] || "—",
      });
      if (label.includes("营业收入")) {
        r.financials.revenue = makeObj(values);
      } else if (label.includes("归母净利润")) {
        r.financials.netProfit = makeObj(values);
      } else if (label.includes("毛利率")) {
        r.financials.grossMargin = makeObj(values);
      } else if (label.includes("净利率")) {
        r.financials.netMargin = makeObj(values);
      } else if (label.includes("EPS")) {
        r.financials.eps = makeObj(values);
      } else if (label.includes("PE") && !label.includes("EPS")) {
        r.financials.pe = makeObj(values);
      } else if (label.includes("同比增速") && !r.financials.revenueGrowth) {
        r.financials.revenueGrowth = makeObj(values);
      } else if (label.includes("同比增速") && r.financials.revenueGrowth) {
        r.financials.profitGrowth = makeObj(values);
      }
    }
  }

  // 核心观点摘要 — 提取加粗文字
  const coreViewsMatch = content.match(/核心观点摘要[\s\S]*?(?=---)/);
  if (coreViewsMatch) {
    const boldPattern = /\*\*(.+?)\*\*/g;
    r.coreViews = [];
    let m;
    while ((m = boldPattern.exec(coreViewsMatch[0])) !== null) {
      if (!m[1].includes("发布") && !m[1].includes("分析师")) {
        r.coreViews.push(m[1]);
      }
    }
  } else {
    r.coreViews = [];
  }

  // 风险提示 — 提取加粗标题
  const riskMatch = content.match(/风险提示[\s\S]*?(?=---)/);
  if (riskMatch) {
    const boldPattern = /\*\*(.+?)\*\*/g;
    r.risks = [];
    let m;
    while ((m = boldPattern.exec(riskMatch[0])) !== null) {
      r.risks.push(m[1]);
    }
  } else {
    r.risks = [];
  }

  // 研发人员
  const rdMatch = content.match(/研发人员([\d,]+)人/);
  r.rdStaff = rdMatch ? parseInt(rdMatch[1].replace(",", "")) : null;

  // 研发人员占比
  const rdRatioMatch = content.match(/占员工总数的(\d+)%/);
  r.rdRatio = rdRatioMatch ? parseInt(rdRatioMatch[1]) : null;

  // 专利数
  const patentMatch = content.match(/发明专利(\d+)项/);
  r.patents = patentMatch ? parseInt(patentMatch[1]) : null;

  // 资产负债率
  const debtRatioMatch = content.match(/资产负债率([\d.]+)%/);
  r.debtRatio = debtRatioMatch ? parseFloat(debtRatioMatch[1]) : null;

  // 货币资金
  const cashMatch = content.match(/货币资金余额([\d.]+)亿元/);
  r.cashBalance = cashMatch ? parseFloat(cashMatch[1]) : null;

  // 文件名（用于唯一标识）
  r.filename = filename;

  return r;
}

// 9. GET /reports — 获取研报列表
router.get("/reports", (req, res) => {
  if (!fs.existsSync(REPORTS_DIR)) {
    return res.json({ reports: [] });
  }
  const files = fs.readdirSync(REPORTS_DIR).filter(f => f.endsWith(".md"));
  const reports = files.map(f => {
    const content = fs.readFileSync(path.join(REPORTS_DIR, f), "utf-8");
    const parsed = parseReport(content, f);
    // 列表只返回摘要信息
    return {
      filename: f,
      companyName: parsed.companyName,
      stockCode: parsed.stockCode,
      title: parsed.title,
      institution: parsed.institution,
      publishDate: parsed.publishDate,
      rating: parsed.rating,
      targetPrice: parsed.targetPrice,
      currentPrice: parsed.currentPrice,
      upside: parsed.upside,
    };
  });
  res.json({ reports });
});

// 10. POST /reports/compare — 对比选中的研报
router.post("/reports/compare", (req, res) => {
  const { filenames } = req.body || {};
  if (!filenames || !Array.isArray(filenames) || filenames.length < 2) {
    return res.status(400).json({ error: { code: "INVALID_PARAMS", message: "至少选择2份研报进行对比" } });
  }
  if (filenames.length > 5) {
    return res.status(400).json({ error: { code: "TOO_MANY_REPORTS", message: "最多支持5份研报同时对比" } });
  }

  const results = [];
  for (const f of filenames) {
    const fpath = path.join(REPORTS_DIR, f);
    if (!fs.existsSync(fpath)) {
      return res.status(404).json({ error: { code: "REPORT_NOT_FOUND", message: `研报 ${f} 不存在` } });
    }
    const content = fs.readFileSync(fpath, "utf-8");
    results.push(parseReport(content, f));
  }

  res.json({ reports: results });
});

// ══════════════════════════════════════════════════════
// 舆情监控 — 新闻抓取（RSS公开数据源 + 降级保底）
// ══════════════════════════════════════════════════════
const rssParser = new RssParser({
  timeout: 8000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    Accept: "application/rss+xml, application/xml, text/xml",
  },
});

// 多个公开 RSS 数据源
const NEWS_SOURCES = [
  {
    name: "路透社·商业",
    url: "https://feeds.reuters.com/reuters/businessNews",
    category: "财经资讯",
  },
  {
    name: "路透社·科技",
    url: "https://feeds.reuters.com/reuters/technologyNews",
    category: "科技行业",
  },
  {
    name: "CNBC·财经",
    url: "https://www.cnbc.com/id/10001147/device/rss/rss.html",
    category: "市场动态",
  },
  {
    name: "MarketWatch",
    url: "https://feeds.content.dowjones.io/public/rss/mw_topstories",
    category: "市场动态",
  },
];

// 内存缓存（5分钟）
let newsCache = { data: null, ts: 0 };
const NEWS_CACHE_TTL = 5 * 60 * 1000;

// 保底 mock 数据（当所有 RSS 均不可用时使用）
function getMockNews() {
  const now = new Date();
  return [
    {
      id: "mock-1",
      title: "央行发布货币政策执行报告，强调稳健货币政策取向不变",
      summary: "中国人民银行发布最新货币政策执行报告，指出将继续实施稳健的货币政策，保持流动性合理充裕，引导金融机构加大对实体经济支持力度。",
      source: "财经资讯",
      sourceName: "央行公告",
      url: "https://www.pbc.gov.cn",
      publishedAt: new Date(now - 1 * 3600000).toISOString(),
      tags: ["央行", "货币政策"],
    },
    {
      id: "mock-2",
      title: "证监会：进一步优化股票发行注册制配套规则，提升市场质量",
      summary: "中国证监会发布通知，对股票发行注册制相关规则进行修订完善，旨在提高上市公司质量，保护投资者合法权益。",
      source: "监管动态",
      sourceName: "证监会公告",
      url: "https://www.csrc.gov.cn",
      publishedAt: new Date(now - 2 * 3600000).toISOString(),
      tags: ["证监会", "注册制", "监管"],
    },
    {
      id: "mock-3",
      title: "半导体行业协会：Q1芯片出货量同比增长12%，AI芯片需求旺盛",
      summary: "中国半导体行业协会公布最新数据，2025年一季度集成电路出货量同比增长12.3%，其中AI算力芯片需求持续高增长。",
      source: "市场动态",
      sourceName: "行业数据",
      url: "#",
      publishedAt: new Date(now - 3 * 3600000).toISOString(),
      tags: ["半导体", "AI芯片", "行业数据"],
    },
    {
      id: "mock-4",
      title: "外汇局：3月末外汇储备规模32183亿美元，环比小幅增加",
      summary: "国家外汇管理局公布数据显示，3月末我国外汇储备规模为32183亿美元，较2月末增加583亿美元，国际收支状况持续改善。",
      source: "宏观经济",
      sourceName: "外汇局",
      url: "https://www.safe.gov.cn",
      publishedAt: new Date(now - 5 * 3600000).toISOString(),
      tags: ["外汇储备", "宏观"],
    },
    {
      id: "mock-5",
      title: "上交所：2025年一季度沪市股票日均成交额超7000亿元",
      summary: "上海证券交易所发布一季度市场运行报告，沪市股票日均成交额7234亿元，市场流动性保持充裕，投资者结构持续优化。",
      source: "市场动态",
      sourceName: "上交所公告",
      url: "https://www.sse.com.cn",
      publishedAt: new Date(now - 6 * 3600000).toISOString(),
      tags: ["上交所", "市场数据"],
    },
    {
      id: "mock-6",
      title: "工业和信息化部：加快推进制造业数字化转型，重点支持10大行业",
      summary: "工信部印发《制造业数字化转型行动方案》，明确重点支持电子信息、汽车、钢铁等10大行业加快数字化转型步伐。",
      source: "政策导向",
      sourceName: "工信部",
      url: "https://www.miit.gov.cn",
      publishedAt: new Date(now - 8 * 3600000).toISOString(),
      tags: ["工信部", "数字化", "制造业"],
    },
  ];
}

// ── 优先级评分规则（双语关键词） ──
const PRIORITY_RULES = [
  {
    level: "urgent",
    label: "紧急预警",
    score: 95,
    keywords: [
      // 英文 — 极端事件
      "crash", "collapse", "halt", "ban", "freeze", "default", "bankrupt",
      "emergency", "crisis", "recession", "bubble", "systemic", "contagion",
      "plunge", "tumble", "slump", "meltdown", "war", "sanction",
      // 中文
      "暴跌", "崩盘", "危机", "熔断", "停牌", "违约", "破产", "紧急", "制裁",
    ],
  },
  {
    level: "high",
    label: "重要关注",
    score: 70,
    keywords: [
      // 英文 — 重大政策/市场事件
      "fed", "rate", "interest rate", "inflation", "gdp", "earnings", "profit",
      "merger", "acquisition", "ipo", "layoff", "cut", "hike", "tariff",
      "regulation", "sec", "probe", "investigation", "beats", "misses",
      "record high", "record low", "rally", "surge", "soar",
      // 中文
      "降息", "加息", "通胀", "并购", "收购", "业绩", "利率", "监管",
      "调查", "IPO", "裁员", "暴涨", "新高", "创纪录",
    ],
  },
  {
    level: "medium",
    label: "值得关注",
    score: 45,
    keywords: [
      "market", "stock", "share", "index", "trade", "revenue", "sales",
      "growth", "forecast", "outlook", "upgrade", "downgrade", "analyst",
      "tech", "ai", "chip", "semiconductor",
      "市场", "股票", "指数", "科技", "芯片", "半导体", "增长", "预测",
    ],
  },
];

// 计算新闻优先级与热度
function calcPriorityAndHeat(title, summary) {
  const text = (title + " " + (summary || "")).toLowerCase();
  for (const rule of PRIORITY_RULES) {
    if (rule.keywords.some((k) => text.includes(k.toLowerCase()))) {
      // 热度：匹配关键词越多分越高，加上时效因素
      const matchCount = rule.keywords.filter((k) =>
        text.includes(k.toLowerCase())
      ).length;
      const heatScore = Math.min(100, rule.score + matchCount * 3);
      return { level: rule.level, label: rule.label, score: rule.score, heatScore };
    }
  }
  return { level: "normal", label: "一般资讯", score: 20, heatScore: 20 };
}

// 标准化单条新闻
function normalizeItem(item, source) {
  const title = item.title || "";
  const summary =
    item.contentSnippet ||
    item.summary ||
    item.content ||
    title;
  const cleanTitle = title.replace(/<[^>]+>/g, "").trim();
  const cleanSummary = summary.replace(/<[^>]+>/g, "").trim().slice(0, 200);
  const { level, label, score, heatScore } = calcPriorityAndHeat(cleanTitle, cleanSummary);
  return {
    id: crypto.createHash("md5").update(item.link || title).digest("hex").slice(0, 12),
    title: cleanTitle,
    summary: cleanSummary,
    source: source.category,
    sourceName: source.name,
    url: item.link || "#",
    publishedAt: item.isoDate || item.pubDate || new Date().toISOString(),
    tags: extractTags(cleanTitle),
    priority: { level, label, score, heatScore },
  };
}

// 从标题自动提取关键词标签
const TAG_KEYWORDS = [
  "央行", "证监会", "发改委", "工信部", "财政部",
  "半导体", "芯片", "AI", "新能源", "光伏", "储能",
  "医药", "生物", "科技", "银行", "地产", "汽车",
  "利率", "降准", "降息", "IPO", "并购", "回购",
  "业绩", "分红", "增持", "减持",
  "fed", "rate", "inflation", "earnings", "merger", "ipo",
  "tech", "chip", "ai",
];
function extractTags(title) {
  return TAG_KEYWORDS.filter((k) =>
    title.toLowerCase().includes(k.toLowerCase())
  ).slice(0, 4);
}

// GET /api/v1/agent/news?refresh=true
router.get("/news", async (req, res) => {
  const forceRefresh = req.query.refresh === "true";

  // 命中缓存
  if (!forceRefresh && newsCache.data && Date.now() - newsCache.ts < NEWS_CACHE_TTL) {
    return res.json({ ...newsCache.data, cached: true });
  }

  const items = [];
  const sourceResults = [];
  let anySuccess = false;

  await Promise.allSettled(
    NEWS_SOURCES.map(async (source) => {
      try {
        const feed = await rssParser.parseURL(source.url);
        const normalized = (feed.items || [])
          .slice(0, 15)
          .map((item) => normalizeItem(item, source));
        items.push(...normalized);
        sourceResults.push({ name: source.name, status: "ok", count: normalized.length });
        anySuccess = true;
      } catch (e) {
        sourceResults.push({ name: source.name, status: "error", error: e.message });
      }
    })
  );

  // 若没有任何源成功，使用 mock 数据
  if (!anySuccess) {
    const mock = getMockNews();
    const result = {
      items: mock,
      sources: sourceResults,
      isMock: true,
      fetchedAt: new Date().toISOString(),
    };
    newsCache = { data: result, ts: Date.now() };
    return res.json(result);
  }

  // 按时间倒序，去重，取前50条
  const seen = new Set();
  const deduped = items
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
    .filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    })
    .slice(0, 50);

  const result = {
    items: deduped,
    sources: sourceResults,
    isMock: false,
    fetchedAt: new Date().toISOString(),
  };
  newsCache = { data: result, ts: Date.now() };
  res.json(result);
});

app.use("/api/v1/agent", router);

// ── 启动 ──
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`✅ 投研问答助手后端已启动: http://localhost:${PORT}`);
  console.log(`   API 前缀: /api/v1/agent`);
  console.log(`   Swagger 文档: http://localhost:${PORT}/api-docs`);
  const hasBailian = !!process.env.DASHSCOPE_API_KEY;
  console.log(`   模式: ${hasBailian ? "百炼 LLM（已配置 API Key）" : "Demo（LLM Provider 未配置）"}`);
});
