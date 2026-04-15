const http = require("http");

const data = JSON.stringify({
  query: "评级",
  session_id: "0fd712a4-e044-413c-87cd-01ca6ba66dad",
});

const req = http.request(
  {
    hostname: "localhost",
    port: 5000,
    path: "/api/v1/agent/ask",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(data),
    },
  },
  (res) => {
    console.log("Status:", res.statusCode);
    console.log("Headers:", JSON.stringify(res.headers));
    let body = "";
    res.on("data", (chunk) => {
      body += chunk;
      // Print each SSE line as it arrives
      const lines = body.split("\n");
      body = lines.pop() || "";
      for (const line of lines) {
        if (line.trim()) console.log("SSE>", line);
      }
    });
    res.on("end", () => {
      if (body.trim()) console.log("SSE>", body);
      console.log("DONE - stream ended");
    });
  }
);

req.on("error", (e) => console.error("Error:", e.message));
req.write(data);
req.end();
