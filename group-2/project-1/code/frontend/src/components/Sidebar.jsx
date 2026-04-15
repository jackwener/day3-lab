/**
 * Sidebar — 会话列表管理。
 * 对齐 TASK-09, 06 §3, 05 US-001。
 */

import { useState } from "react";

function Sidebar({
  sessions,
  currentSession,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
}) {
  const [confirmId, setConfirmId] = useState(null);

  // ── 删除确认（对齐 AC-001-03） ──
  const handleDeleteClick = (e, sessionId) => {
    e.stopPropagation();
    setConfirmId(sessionId);
  };

  const handleConfirmDelete = () => {
    if (confirmId) {
      onDeleteSession(confirmId);
      setConfirmId(null);
    }
  };

  // ── 副标题：最后一轮 query 前 20 字 ──
  const getSubtitle = (session) => {
    if (session.last_query) {
      return session.last_query.length > 20
        ? session.last_query.slice(0, 20) + "…"
        : session.last_query;
    }
    return "暂无问答";
  };

  return (
    <aside className="sidebar">
      {/* 新建按钮 */}
      <div className="sidebar-header">
        <button onClick={onCreateSession}>+ 新建会话</button>
      </div>

      {/* 会话列表（按 created_at 倒序） */}
      <div className="session-list">
        {sessions.length === 0 ? (
          <div className="sidebar-empty">
            暂无会话<br />点击上方「+ 新建会话」开始
          </div>
        ) : (
          sessions.map((session) => (
            <div
              key={session.session_id}
              className={`session-item ${
                currentSession?.session_id === session.session_id ? "active" : ""
              }`}
              onClick={() => onSelectSession(session)}
            >
              <div className="session-meta">
                <span className="session-title">{session.title || "新会话"}</span>
                <span className="session-count">{session.query_count || 0} 条</span>
              </div>
              <div className="session-sub">{getSubtitle(session)}</div>
              <button
                className="delete-btn"
                onClick={(e) => handleDeleteClick(e, session.session_id)}
                title="删除会话"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>

      {/* 删除确认对话框 */}
      {confirmId && (
        <div className="confirm-overlay" onClick={() => setConfirmId(null)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <p>确认删除该会话？删除后不可恢复。</p>
            <div className="confirm-actions">
              <button className="btn btn-secondary" onClick={() => setConfirmId(null)}>
                取消
              </button>
              <button
                className="btn btn-primary"
                style={{ background: "#ef4444" }}
                onClick={handleConfirmDelete}
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

export default Sidebar;
