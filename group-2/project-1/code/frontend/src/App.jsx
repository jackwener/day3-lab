import { useState, useEffect, useCallback } from "react";
import {
  getSessions,
  createSession,
  deleteSession,
  getRecords,
  askQuestion,
  getHealth,
  getCapabilities,
  getDocChunk,
} from "./api/client";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import ChatArea from "./components/ChatArea";
import DocPreview from "./components/DocPreview";
import ReportCompare from "./components/ReportCompare";
import SentimentMonitor from "./components/SentimentMonitor";

/**
 * App — 主布局与全局状态管理。
 * 对齐 TASK-08: 三栏布局 + 全局状态 + 初始化逻辑。
 */
function App() {
  // ── 全局状态（对齐 06 §7） ──
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [healthStatus, setHealthStatus] = useState("UP");
  const [capabilities, setCapabilities] = useState(null);
  const [docPreviewChunk, setDocPreviewChunk] = useState(null);
  const [isDocPreviewOpen, setIsDocPreviewOpen] = useState(false);
  const [activeView, setActiveView] = useState("chat"); // "chat" | "compare" | "sentiment"

  /**
   * 将后端返回的 record 数组转换为前端 messages 格式。
   * 后端每条 record = {query, answer, ...}（一条记录包含问与答）
   * 前端需要拆成两条: user msg + assistant msg
   */
  const recordsToMessages = (records) => {
    const msgs = [];
    for (const r of records) {
      msgs.push({
        role: "user",
        query: r.query,
        created_at: r.timestamp,
      });
      msgs.push({
        role: "assistant",
        answer: r.answer,
        answer_source: r.answer_source,
        references: r.references || [],
        created_at: r.timestamp,
      });
    }
    return msgs;
  };

  // ── 初始化逻辑（对齐 TASK-08 §6） ──
  useEffect(() => {
    getCapabilities().then(setCapabilities).catch(() => {});
    getHealth()
      .then((data) => setHealthStatus(data.status || "UP"))
      .catch(() => setHealthStatus("ERROR"));
    getSessions()
      .then((data) => {
        const list = data.sessions || data || [];
        setSessions(list);
        if (list.length > 0) {
          setCurrentSession(list[0]);
          getRecords(list[0].session_id)
            .then((r) => setMessages(recordsToMessages(r.records || r || [])))
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, []);

  // ── 健康检查轮询 — 每 30 秒（对齐 06 §2.2） ──
  useEffect(() => {
    const timer = setInterval(() => {
      getHealth()
        .then((data) => setHealthStatus(data.status || "UP"))
        .catch(() => setHealthStatus("ERROR"));
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // ── 会话操作 ──
  const handleSelectSession = useCallback(async (session) => {
    setCurrentSession(session);
    try {
      const data = await getRecords(session.session_id);
      setMessages(recordsToMessages(data.records || data || []));
    } catch {
      setMessages([]);
    }
  }, []);

  const handleCreateSession = useCallback(async () => {
    try {
      const newSession = await createSession();
      setSessions((prev) => [newSession, ...prev]);
      setCurrentSession(newSession);
      setMessages([]);
    } catch (e) {
      console.error("创建会话失败:", e);
    }
  }, []);

  const handleDeleteSession = useCallback(
    async (sessionId) => {
      try {
        await deleteSession(sessionId);
        setSessions((prev) => prev.filter((s) => s.session_id !== sessionId));
        if (currentSession?.session_id === sessionId) {
          setCurrentSession(null);
          setMessages([]);
        }
      } catch (e) {
        console.error("删除会话失败:", e);
      }
    },
    [currentSession]
  );

  // ── 发送消息（SSE 流式） ──
  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || !currentSession || isLoading) return;

    const query = inputValue.trim();
    setInputValue("");
    setIsLoading(true);

    // 立即添加用户消息
    const userMsg = {
      role: "user",
      query,
      created_at: new Date().toISOString(),
    };
    // 添加空的 AI 消息占位
    const aiMsg = {
      role: "assistant",
      answer: "",
      answer_source: "",
      references: [],
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg, aiMsg]);

    await askQuestion(
      query,
      currentSession.session_id,
      (chunk) => {
        // onChunk: 逐字追加
        const text = chunk.text || chunk.delta || "";
        setMessages((prev) => {
          const updated = [...prev];
          const last = { ...updated[updated.length - 1] };
          last.answer = (last.answer || "") + text;
          updated[updated.length - 1] = last;
          return updated;
        });
      },
      (result) => {
        // onDone: 用完整结果替换
        if (result) {
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: "assistant",
              answer: result.answer || updated[updated.length - 1].answer,
              answer_source: result.answer_source || "demo",
              references: result.references || [],
              created_at: result.created_at || new Date().toISOString(),
            };
            return updated;
          });
        }
        setIsLoading(false);
        // 刷新会话列表（query_count 更新）
        getSessions()
          .then((data) => setSessions(data.sessions || data || []))
          .catch(() => {});
      },
      () => {
        // onError
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            answer: "抱歉，服务暂时不可用，请稍后重试。",
            answer_source: "error",
          };
          return updated;
        });
        setIsLoading(false);
      }
    );
  }, [inputValue, currentSession, isLoading]);

  // ── 引用点击 → 打开 DocPreview ──
  const handleReferenceClick = useCallback(async (chunkId) => {
    try {
      const chunk = await getDocChunk(chunkId);
      setDocPreviewChunk(chunk);
      setIsDocPreviewOpen(true);
    } catch {
      setDocPreviewChunk(null);
      setIsDocPreviewOpen(true);
    }
  }, []);

  return (
    <>
      <Header healthStatus={healthStatus} capabilities={capabilities}>
        <nav className="app-nav">
          <button
            className={`nav-btn ${activeView === "chat" ? "active" : ""}`}
            onClick={() => setActiveView("chat")}
          >
            💬 问答
          </button>
          <button
            className={`nav-btn ${activeView === "compare" ? "active" : ""}`}
            onClick={() => setActiveView("compare")}
          >
            📊 研报对比
          </button>
          <button
            className={`nav-btn ${activeView === "sentiment" ? "active" : ""}`}
            onClick={() => setActiveView("sentiment")}
          >
            📡 舆情监控
          </button>
        </nav>
      </Header>

      {healthStatus === "DEGRADED" && (
        <div className="degraded-banner">
          ⚠️ 当前为 Demo 模式/服务受限
        </div>
      )}
      {healthStatus === "ERROR" && (
        <div className="degraded-banner" style={{ background: "#fee2e2", color: "#991b1b", borderColor: "#fca5a5" }}>
          ⚠️ 后端服务不可用，请稍后重试
        </div>
      )}

      {activeView === "chat" ? (
        <div className="app-body">
          <Sidebar
            sessions={sessions}
            currentSession={currentSession}
            onSelectSession={handleSelectSession}
            onCreateSession={handleCreateSession}
            onDeleteSession={handleDeleteSession}
          />
          <ChatArea
            currentSession={currentSession}
            messages={messages}
            isLoading={isLoading}
            inputValue={inputValue}
            onInputChange={setInputValue}
            onSend={handleSend}
            onReferenceClick={handleReferenceClick}
          />
          {isDocPreviewOpen && (
            <DocPreview
              chunk={docPreviewChunk}
              onClose={() => setIsDocPreviewOpen(false)}
            />
          )}
        </div>
      ) : activeView === "compare" ? (
        <div className="app-body">
          <ReportCompare />
        </div>
      ) : (
        <div className="app-body">
          <SentimentMonitor />
        </div>
      )}
    </>
  );
}

export default App;
