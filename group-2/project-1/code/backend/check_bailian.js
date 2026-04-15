/**
 * 直接验证 DashScope (百炼) API Key 是否可用
 */
const https = require("https");
const fs = require("fs");
const path = require("path");

// 读取 .env
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
console.log("API Key:", API_KEY ? `${API_KEY.slice(0,10)}...${API_KEY.slice(-4)}` : "未配置");

if (!API_KEY) { console.log("未配置 API Key，退出"); process.exit(1); }

const body = JSON.stringify({
  model: "qwen-turbo",
  input: { prompt: "请用一句话回答：1+1等于几？" },
  parameters: { max_tokens: 50 },
});

console.log("正在请求 DashScope API...");
const startTime = Date.now();

const req = https.request({
  hostname: "dashscope.aliyuncs.com",
  path: "/api/v1/services/aigc/text-generation/generation",
  method: "POST",
  headers: {
    "Authorization": `Bearer ${API_KEY}`,
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
  },
  timeout: 20000,
}, (res) => {
  let data = "";
  res.on("data", c => data += c);
  res.on("end", () => {
    const elapsed = Date.now() - startTime;
    console.log("HTTP 状态:", res.statusCode, `(${elapsed}ms)`);
    try {
      const json = JSON.parse(data);
      if (res.statusCode === 200) {
        const answer = json?.output?.text || "(无 text 字段)";
        console.log("✅ API Key 有效！");
        console.log("   模型回答:", answer);
        console.log("   Token 消耗:", json?.usage?.total_tokens || "N/A");
      } else {
        console.log("❌ API 错误:", json.code, "-", json.message);
      }
    } catch (e) {
      console.log("❌ 解析失败:", data.slice(0, 300));
    }
  });
});

req.on("error", e => { console.log("❌ 网络错误:", e.message); });
req.on("timeout", () => { console.log("❌ 超时（20s）"); req.destroy(); });

req.write(body);
req.end();
