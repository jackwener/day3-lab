/**
 * DocPreview — 原文预览面板（方案 A：简化版）。
 * 对齐 TASK-11, 06 §4.3, 05 US-003。
 */

function DocPreview({ chunk, onClose }) {
  // chunk 不存在或加载失败
  if (!chunk || chunk.error) {
    return (
      <aside className="doc-preview">
        <div className="doc-preview-header">
          <span>原文预览</span>
          <button onClick={onClose} title="关闭">×</button>
        </div>
        <div className="doc-preview-body">
          <div className="not-found">原文引用未找到</div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="doc-preview">
      {/* 顶部：文档标题 + 关闭按钮 */}
      <div className="doc-preview-header">
        <span>{chunk.doc_title || "原文预览"}</span>
        <button onClick={onClose} title="关闭">×</button>
      </div>

      {/* 内容区 */}
      <div className="doc-preview-body">
        {/* 章节信息 */}
        {chunk.section && <div className="doc-section">📑 {chunk.section}</div>}

        {/* 页码 */}
        {chunk.page && <div className="doc-page">📄 第 {chunk.page} 页</div>}

        {/* 高亮原文段落 */}
        {chunk.highlight_text && (
          <div className="highlight-text">{chunk.highlight_text}</div>
        )}

        {/* 查看原文链接 */}
        {chunk.doc_url && (
          <a
            className="view-original"
            href={chunk.doc_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            🔗 查看原文 PDF
          </a>
        )}
      </div>
    </aside>
  );
}

export default DocPreview;
