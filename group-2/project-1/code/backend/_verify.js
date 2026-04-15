// 快速验证 SSE 问答
const http = require("http");
const fs = require("fs");
const path = require("path");

// 读取刚创建的会话
const sessions = JSON.parse(fs.readFileSync(path.join(__dirname, "data/session_info.json"), "utf-8"));
const sid = sessions[0]?.session_id;
if (!sid) { console.log("无会话"); process.exit(1); }

console.log("使用会话:", sid);
const body = JSON.stringify({ session_id: sid, query: "该股票最新评级是什么？" });

const req = http.request({
  hostname: "localhost", port: 5000,
  path: "/api/v1/agent/ask", method: "POST",
  headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
}, (res) => {
  console.log("HTTP:", res.statusCode, res.headers["content-type"]);
  let chunks = 0, doneData = null;
  res.on("data", (chunk) => {
    const lines = chunk.toString().split("\n").filter(l => l.startsWith("data:"));
    for (const line of lines) {
      const raw = line.slice(5).trim();
      if (raw === "[DONE]") { console.log("收到 [DONE]"); return; }
      try {
        const p = JSON.parse(raw);
        if (p.event === "chunk") chunks++;
        if (p.event === "done") doneData = p;
      } catch {}
    }
  });
  res.on("end", () => {
    console.log("chunk 数:", chunks);
    if (doneData) {
      console.log("answer_source:", doneData.answer_source);
      console.log("回答前 80 字:", doneData.answer?.slice(0, 80));
      console.log("references:", JSON.stringify(doneData.references));
    }
    console.log("\n✅ 主链路验证通过！");
  });
});
req.write(body);
req.end();
