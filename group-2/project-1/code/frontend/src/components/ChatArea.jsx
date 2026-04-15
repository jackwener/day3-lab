/**
 * ChatArea — 三态渲染 + 输入区域 + 消息气泡 + SSE 流式。
 * 对齐 TASK-10, 06 §4/§5, 05 US-002/US-004。
 */

import { useRef, useEffect, useCallback } from "react";
import Markdown from "react-markdown";

const FAQ_ITEMS = [
  "华芯科技的最新评级和目标价是多少？",
  "公司有哪些核心业务，各占比多少？",
  "华芯科技的核心竞争优势是什么？",
  "公司面临哪些主要风险？",
];

const MAX_CHARS = 500;

function ChatArea({
  currentSession,
  messages,
  isLoading,
  inputValue,
  onInputChange,
  onSend,
  onReferenceClick,
}) {
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // ── 自动滚动到底部 ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── 回车发送 ──
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        onSend();
      }
    },
    [onSend]
  );

  // ── 输入控制（500 字限制） ──
  const handleInputChange = (e) => {
    const val = e.target.value;
    if (val.length <= MAX_CHARS) {
      onInputChange(val);
    }
  };

  // ── 常见问题点击 → 自动发送 ──
  const handleFaqClick = (question) => {
    onInputChange(question);
    // 延迟一帧让 state 更新后再发送
    setTimeout(() => onSend(), 0);
  };

  // ── 引用标记渲染 — 替换 [n] 为可点击链接 ──
  const renderAnswerWithRefs = (answer, references) => {
    if (!references || references.length === 0) {
      return <Markdown>{answer}</Markdown>;
    }

    // 将 [1], [2] 等替换为可点击标记
    const refPattern = /\[(\d+)\]/g;
    const parts = answer.split(refPattern);

    return (
      <Markdown
        components={{
          p: ({ children }) => {
            // 在段落内处理引用标记
            return <p>{children}</p>;
          },
        }}
      >
        {answer}
      </Markdown>
    );
  };

  // 渲染 answer 文本，将 [n] 替换为可点击引用
  const renderAnswer = (text, references) => {
    if (!text) return null;
    if (!references || references.length === 0) {
      return <Markdown>{text}</Markdown>;
    }

    // 拆分文本，在 [n] 处插入可点击元素
    const segments = [];
    let lastIndex = 0;
    const regex = /\[(\d+)\]/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        segments.push(
          <Markdown key={`t-${lastIndex}`}>
            {text.slice(lastIndex, match.index)}
          </Markdown>
        );
      }
      const refIdx = parseInt(match[1], 10) - 1;
      const ref = references[refIdx];
      if (ref) {
        segments.push(
          <span
            key={`r-${match.index}`}
            className="ref-link"
            onClick={() => onReferenceClick(ref.chunk_id)}
          >
            [{match[1]}]
          </span>
        );
      } else {
        segments.push(<span key={`r-${match.index}`}>[{match[1]}]</span>);
      }
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      segments.push(
        <Markdown key={`t-${lastIndex}`}>{text.slice(lastIndex)}</Markdown>
      );
    }

    return <>{segments}</>;
  };

  // ── 来源标签 ──
  const getSourceTag = (source) => {
    const map = {
      copaw: { label: "CoPaw", cls: "copaw" },
      bailian: { label: "百炼", cls: "bailian" },
      demo: { label: "离线演示", cls: "demo" },
    };
    const info = map[source] || map.demo;
    return <span className={`source-tag ${info.cls}`}>{info.label}</span>;
  };

  // ── 时间格式化 HH:mm ──
  const formatTime = (ts) => {
    if (!ts) return "";
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  // ── 字符计数器样式 ──
  const charLen = inputValue.length;
  const counterCls =
    charLen >= MAX_CHARS ? "char-counter limit" : charLen > 450 ? "char-counter warn" : "char-counter";

  const canSend = inputValue.trim().length > 0 && !!currentSession && !isLoading;

  // ════════════════════════════════════════════════
  // 渲染
  // ════════════════════════════════════════════════

  // 状态 A: 空状态
  if (!currentSession) {
    return (
      <div className="chat-area">
        <div className="chat-messages">
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <h2>欢迎使用投研问答助手</h2>
            <p>请在左侧创建或选择一个会话开始</p>
          </div>
        </div>
      </div>
    );
  }

  // 状态 B: 有会话但无记录 → 常见问题
  if (messages.length === 0 && !isLoading) {
    return (
      <div className="chat-area">
        <div className="chat-messages">
          <div className="empty-state">
            <div className="empty-icon">💬</div>
            <h2>{currentSession.title || "新会话"}</h2>
            <p>您可以直接输入问题，或点击下方常见问题快速开始</p>
            <div className="faq-grid">
              {FAQ_ITEMS.map((q, i) => (
                <div
                  key={i}
                  className="faq-card"
                  onClick={() => handleFaqClick(q)}
                >
                  {q}
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* 输入区域 */}
        <div className="chat-input-area">
          <div className="input-wrapper">
            <textarea
              ref={textareaRef}
              rows={3}
              placeholder="请输入您的问题..."
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
            />
            <div className="input-actions">
              <button
                className="btn btn-secondary"
                onClick={() => onInputChange("")}
                disabled={!inputValue}
              >
                清空
              </button>
              <button
                className="btn btn-primary"
                onClick={onSend}
                disabled={!canSend}
              >
                发送
              </button>
            </div>
          </div>
          <div className={counterCls}>已输入 {charLen}/{MAX_CHARS} 字</div>
        </div>
      </div>
    );
  }

  // 状态 C: 对话历史
  return (
    <div className="chat-area">
      <div className="chat-messages">
        {messages.map((msg, idx) => {
          if (msg.role === "user") {
            return (
              <div key={idx} className="message-row user">
                <div className="message-bubble">{msg.query}</div>
              </div>
            );
          }
          // AI 消息
          return (
            <div key={idx} className="message-row ai">
              <div className="message-bubble">
                {/* 思考中动画 */}
                {isLoading && idx === messages.length - 1 && !msg.answer ? (
                  <div className="thinking-dots">
                    <span />
                    <span />
                    <span />
                  </div>
                ) : (
                  <>
                    {renderAnswer(msg.answer, msg.references)}
                    {msg.answer_source && msg.answer_source !== "error" && (
                      <div className="message-footer">
                        <span>{formatTime(msg.created_at)}</span>
                        {getSourceTag(msg.answer_source)}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <div className="chat-input-area">
        <div className="input-wrapper">
          <textarea
            ref={textareaRef}
            rows={3}
            placeholder="请输入您的问题..."
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={!currentSession}
          />
          <div className="input-actions">
            <button
              className="btn btn-secondary"
              onClick={() => onInputChange("")}
              disabled={!inputValue}
            >
              清空
            </button>
            <button
              className="btn btn-primary"
              onClick={onSend}
              disabled={!canSend}
            >
              {isLoading ? "发送中…" : "发送"}
            </button>
          </div>
        </div>
        <div className={counterCls}>已输入 {charLen}/{MAX_CHARS} 字</div>
      </div>
    </div>
  );
}

export default ChatArea;
