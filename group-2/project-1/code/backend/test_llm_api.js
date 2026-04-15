/**
 * 验证脚本：
 * 1. 测试 /ask SSE 接口（Demo 模式）
 * 2. 直接调用 DashScope REST API 验证百炼 Key 是否可用
 */

const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

// ── 读取 .env ──
const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf-8").split("\n").forEach(line => {
    const t = line.trim();
    if (t && !t.startsWith("#")) {
      const idx = t.indexOf("=");
      if (idx > 0) {
        const k = t.slice(0, idx).trim();
        const v = t.slice(idx + 1).trim();
        if (!process.env[k]) process.env[k] = v;
      }
    }
  });
}

const API_KEY = process.env.DASHSCOPE_API_KEY;
console.log("=".repeat(60));
console.log("🔑 DASHSCOPE_API_KEY:", API_KEY ? `${API_KEY.slice(0, 8)}...${API_KEY.slice(-4)}` : "未配置");
console.log("=".repeat(60));

// ── 1. 测试 /ask 接口（本地 Node.js server） ──────────────────

async function testLocalAsk() {
  console.log("\n【TEST 1】本地 /ask SSE 接口\n");

  // 先创建会话
  const sessionResp = await postJSON("http://localhost:5000/api/v1/agent/sessions", { title: "LLM 验证会话" });
  const sessionId = sessionResp.session_id;
  console.log("✅ 创建会话:", sessionId);

  // 发送问答请求（SSE）
  return new Promise((resolve) => {
    const body = JSON.stringify({ session_id: sessionId, query: "茅台股票最新评级如何？" });
    const req = http.request({
      hostname: "localhost",
      port: 5000,
      path: "/api/v1/agent/ask",
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
    }, (res) => {
      console.log("   HTTP 状态:", res.statusCode);
      console.log("   Content-Type:", res.headers["content-type"]);

      let chunks = [];
      let doneData = null;

      res.on("data", (chunk) => {
        const lines = chunk.toString().split("\n").filter(l => l.startsWith("data:"));
        for (const line of lines) {
          try {
            const payload = JSON.parse(line.slice(5).trim());
            if (payload.event === "chunk") chunks.push(payload.text || "");
            if (payload.event === "done") doneData = payload;
          } catch {}
        }
      });

      res.on("end", () => {
        console.log("   ✅ SSE chunk 数:", chunks.length);
        console.log("   ✅ 回答内容:", chunks.join("").slice(0, 80) + "...");
        if (doneData) {
          console.log("   ✅ done 事件:");
          console.log("      answer_source:", doneData.answer_source);
          console.log("      llm_used:", doneData.llm_used);
          console.log("      response_time_ms:", doneData.response_time_ms);
        }
        resolve();
      });
    });
    req.write(body);
    req.end();
  });
}

// ── 2. 直接调用 DashScope REST API 验证 Key ───────────────────

async function testDashScopeAPI() {
  console.log("\n【TEST 2】直接调用 DashScope REST API 验证百炼 Key\n");

  if (!API_KEY) {
    console.log("⚠️  DASHSCOPE_API_KEY 未配置，跳过此测试");
    return;
  }

  const body = JSON.stringify({
    model: "qwen-turbo",
    input: { prompt: "你好，请用一句话回答：1+1等于几？" },
    parameters: { max_tokens: 100 },
  });

  return new Promise((resolve) => {
    const req = https.request({
      hostname: "dashscope.aliyuncs.com",
      path: "/api/v1/services/aigc/text-generation/generation",
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
      timeout: 30000,
    }, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        console.log("   HTTP 状态:", res.statusCode);
        try {
          const json = JSON.parse(data);
          if (res.statusCode === 200) {
            const answer = json?.output?.text || json?.output?.choices?.[0]?.message?.content || "(无回答)";
            console.log("   ✅ API Key 有效！");
            console.log("   ✅ 模型回答:", answer);
            console.log("   ✅ 使用 token:", json?.usage?.total_tokens || "N/A");
          } else {
            console.log("   ❌ API 返回错误:");
            console.log("      code:", json.code);
            console.log("      message:", json.message);
          }
        } catch (e) {
          console.log("   ❌ 解析响应失败:", data.slice(0, 200));
        }
        resolve();
      });
    });

    req.on("error", (e) => {
      console.log("   ❌ 网络请求失败:", e.message);
      resolve();
    });

    req.on("timeout", () => {
      console.log("   ❌ 请求超时（30s）");
      req.destroy();
      resolve();
    });

    req.write(body);
    req.end();
  });
}

// ── 工具函数 ─────────────────────────────────────────────────

function postJSON(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const u = new URL(url);
    const req = http.request({
      hostname: u.hostname, port: u.port, path: u.pathname,
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) },
    }, (res) => {
      let d = "";
      res.on("data", c => d += c);
      res.on("end", () => resolve(JSON.parse(d)));
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

// ── 主流程 ────────────────────────────────────────────────────

(async () => {
  try {
    await testLocalAsk();
  } catch (e) {
    console.log("   ❌ 本地接口测试失败:", e.message);
  }

  try {
    await testDashScopeAPI();
  } catch (e) {
    console.log("   ❌ DashScope API 测试失败:", e.message);
  }

  console.log("\n" + "=".repeat(60));
  console.log("验证完成");
  console.log("=".repeat(60));
})();
