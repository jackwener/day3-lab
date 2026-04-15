// 简单验证 SSE - 写结果到文件
const http = require("http");
const fs = require("fs");
const path = require("path");

const sessions = JSON.parse(fs.readFileSync(path.join(__dirname, "data/session_info.json"), "utf-8"));
const sid = sessions[0]?.session_id;
const body = JSON.stringify({ session_id: sid, query: "评级" });

const req = http.request({
  hostname: "localhost", port: 5000,
  path: "/api/v1/agent/ask", method: "POST",
  headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
  timeout: 30000,
}, (res) => {
  let all = "";
  res.on("data", c => all += c.toString());
  res.on("end", () => {
    fs.writeFileSync(path.join(__dirname, "_result.txt"), all, "utf-8");
    console.log("DONE - saved to _result.txt");
    process.exit(0);
  });
});
req.on("timeout", () => { console.log("TIMEOUT"); req.destroy(); process.exit(1); });
req.on("error", e => { console.log("ERROR:", e.message); process.exit(1); });
req.write(body);
req.end();
