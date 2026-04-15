/**
 * DocumentDrawer — Apple-style 文档预览抽屉
 * 从右侧滑出，支持 PDF（iframe）和 DOCX（docx-preview 渲染）
 * 点击问题可定位到文档中的具体页码 / 段落
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { renderAsync } from 'docx-preview';

/* ────────── 样式 ────────── */
const s = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 300,
    background: 'rgba(0, 0, 0, 0.25)',
    backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
    transition: 'opacity 0.3s ease',
  },
  drawer: (open) => ({
    position: 'fixed', top: 0, right: 0, bottom: 0,
    width: '52%', minWidth: '480px', maxWidth: '820px',
    background: '#ffffff',
    boxShadow: '-8px 0 40px rgba(0, 0, 0, 0.12)',
    transform: open ? 'translateX(0)' : 'translateX(100%)',
    transition: 'transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    display: 'flex', flexDirection: 'column',
    zIndex: 301,
  }),
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 20px',
    borderBottom: '0.5px solid rgba(0, 0, 0, 0.06)',
    background: 'rgba(255, 255, 255, 0.92)',
    backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
    flexShrink: 0,
  },
  headerLeft: {
    display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0,
  },
  fileIcon: (isPdf) => ({
    width: '36px', height: '36px', borderRadius: '10px',
    background: isPdf
      ? 'linear-gradient(135deg, #ff3b30, #ff6b6b)'
      : 'linear-gradient(135deg, #2b5ea7, #4a90d9)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '15px', flexShrink: 0, color: '#fff', fontWeight: 700,
  }),
  fileInfo: { flex: 1, minWidth: 0 },
  fileName: {
    fontSize: '14px', fontWeight: 600, color: '#1d1d1f',
    letterSpacing: '-0.02em',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  fileMeta: { fontSize: '11px', color: '#86868b', marginTop: '2px' },
  headerActions: {
    display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0,
  },
  pageIndicator: {
    padding: '4px 12px', borderRadius: '8px',
    background: 'rgba(0, 113, 227, 0.08)',
    fontSize: '12px', fontWeight: 600, color: '#0071e3',
    letterSpacing: '-0.01em',
  },
  iconBtn: {
    width: '32px', height: '32px', borderRadius: '8px',
    background: 'rgba(142, 142, 147, 0.12)', border: 'none',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '14px', color: '#1d1d1f', transition: 'background 0.15s',
    textDecoration: 'none',
  },
  closeBtn: {
    width: '32px', height: '32px', borderRadius: '50%',
    background: 'rgba(142, 142, 147, 0.12)', border: 'none',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '14px', color: '#86868b', transition: 'background 0.15s',
  },
  body: {
    flex: 1, overflow: 'hidden', position: 'relative',
    background: '#f5f5f7',
  },
  iframe: { width: '100%', height: '100%', border: 'none' },
  docxWrap: {
    width: '100%', height: '100%', overflow: 'auto',
    background: '#e8e8ed',
    padding: '24px 0',
  },
  /* 定位提示条 */
  locateBar: {
    position: 'absolute', top: '12px', left: '50%', transform: 'translateX(-50%)',
    padding: '8px 18px', borderRadius: '100px',
    background: 'rgba(0, 113, 227, 0.92)',
    backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
    color: 'white', fontSize: '12px', fontWeight: 500,
    boxShadow: '0 4px 16px rgba(0, 113, 227, 0.25)',
    zIndex: 10, whiteSpace: 'nowrap',
    animation: 'slideDown 0.3s ease',
  },
  /* 加载状态 */
  loadingWrap: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    height: '100%', gap: '14px',
  },
  spinner: {
    width: '32px', height: '32px', borderRadius: '50%',
    border: '3px solid rgba(0, 113, 227, 0.15)',
    borderTopColor: '#0071e3',
    animation: 'spin 0.8s linear infinite',
  },
  loadingText: { fontSize: '13px', color: '#86868b' },
  errorWrap: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    height: '100%', gap: '12px', padding: '40px',
  },
  errorIcon: { fontSize: '40px' },
  errorTitle: { fontSize: '15px', fontWeight: 600, color: '#1d1d1f' },
  errorDesc: { fontSize: '13px', color: '#86868b', textAlign: 'center', lineHeight: 1.6 },
  retryBtn: {
    padding: '8px 22px', borderRadius: '100px',
    fontSize: '13px', fontWeight: 500,
    background: '#0071e3', color: 'white',
    border: 'none', cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0, 113, 227, 0.25)',
  },
};

/* 全局注入 spin + slideDown 动画（仅一次） */
if (typeof document !== 'undefined' && !document.getElementById('drawer-keyframes')) {
  const style = document.createElement('style');
  style.id = 'drawer-keyframes';
  style.textContent = `
    @keyframes spin { to { transform: rotate(360deg) } }
    @keyframes slideDown {
      from { opacity: 0; transform: translate(-50%, -8px) }
      to   { opacity: 1; transform: translate(-50%, 0) }
    }
    /* docx-preview 渲染样式优化 */
    .docx-wrapper {
      background: #e8e8ed !important;
      padding: 24px 0 !important;
    }
    .docx-wrapper > section.docx {
      margin: 0 auto 24px !important;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08) !important;
      border-radius: 4px !important;
      max-width: 800px !important;
    }
  `;
  document.head.appendChild(style);
}

/** 从 location 字符串解析页码，如 "第3页 第2段" → 3 */
function parsePageFromLocation(loc) {
  if (!loc) return null;
  const m = loc.match(/第(\d+)页/);
  return m ? parseInt(m[1], 10) : null;
}

/** 从 location 解析段落号，如 "第3页 第2段" → 2 */
function parseParagraphFromLocation(loc) {
  if (!loc) return null;
  const m = loc.match(/第(\d+)段/);
  return m ? parseInt(m[1], 10) : null;
}

export default function DocumentDrawer({
  open, onClose, fileUrl, fileName, fileType, targetLocation,
}) {
  const docxContainerRef = useRef(null);
  const iframeRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [locateMsg, setLocateMsg] = useState(null);
  const locateTimer = useRef(null);
  const docxBlobRef = useRef(null);      // 缓存已下载的 blob
  const loadedUrlRef = useRef(null);     // 记录已加载的 url

  const isPdf = fileType?.toLowerCase() === 'pdf' ||
    fileName?.toLowerCase()?.endsWith('.pdf');

  const targetPage = parsePageFromLocation(targetLocation);
  const targetPara = parseParagraphFromLocation(targetLocation);

  /* ── 加载 DOCX 并渲染 ── */
  const loadDocx = useCallback(async (url) => {
    if (!url) return;
    setLoading(true);
    setError(null);
    try {
      let blob;
      // 同一 URL 复用已下载的 blob，避免重复网络请求
      if (loadedUrlRef.current === url && docxBlobRef.current) {
        blob = docxBlobRef.current;
      } else {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`加载失败 (${resp.status})`);
        blob = await resp.blob();
        docxBlobRef.current = blob;
        loadedUrlRef.current = url;
      }

      if (docxContainerRef.current) {
        docxContainerRef.current.innerHTML = '';
        await renderAsync(blob, docxContainerRef.current, undefined, {
          className: 'docx',
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          breakPages: true,
          ignoreLastRenderedPageBreak: false,
          experimental: false,
        });
      }
    } catch (e) {
      console.error('DOCX 渲染失败:', e);
      setError(e.message || '文档加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── 打开抽屉时加载文档 ── */
  useEffect(() => {
    if (!open || !fileUrl) return;
    if (isPdf) return; // PDF 由 iframe 自行处理

    // 每次打开都重新渲染（关闭时 DOM 已被卸载）
    loadDocx(fileUrl);
  }, [open, fileUrl, isPdf, loadDocx]);

  /* ── 定位到指定页/段 ── */
  useEffect(() => {
    if (!open || !targetLocation) return;

    // PDF → iframe #page=N
    if (isPdf && targetPage && iframeRef.current) {
      const base = fileUrl.split('#')[0];
      iframeRef.current.src = `${base}#page=${targetPage}`;
    }

    // DOCX → 滚动到对应页的段落
    if (!isPdf && docxContainerRef.current) {
      const sections = docxContainerRef.current.querySelectorAll('section.docx');
      const pageIdx = (targetPage || 1) - 1;
      const section = sections[pageIdx] || sections[0];
      if (section) {
        if (targetPara) {
          // 尝试定位到段落
          const paras = section.querySelectorAll('p');
          const paraEl = paras[targetPara - 1];
          if (paraEl) {
            paraEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // 高亮闪烁效果
            paraEl.style.transition = 'background 0.3s';
            paraEl.style.background = 'rgba(0, 113, 227, 0.12)';
            paraEl.style.borderRadius = '4px';
            setTimeout(() => {
              paraEl.style.background = 'transparent';
            }, 2500);
          } else {
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        } else {
          section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    }

    // 显示定位提示
    setLocateMsg(`已定位到 ${targetLocation}`);
    if (locateTimer.current) clearTimeout(locateTimer.current);
    locateTimer.current = setTimeout(() => setLocateMsg(null), 2500);

    return () => {
      if (locateTimer.current) clearTimeout(locateTimer.current);
    };
  }, [targetLocation, open, isPdf, targetPage, targetPara, fileUrl]);

  /* 关闭时清理 */
  const handleClose = () => {
    onClose();
    setLocateMsg(null);
    // 保留 blob 缓存（同文件再开秒加载），切换文件时会自动重新 fetch
  };

  if (!open) return null;

  const iframeSrc = isPdf && targetPage
    ? `${fileUrl}#page=${targetPage}`
    : fileUrl;

  return (
    <>
      {/* Overlay */}
      <div style={s.overlay} onClick={handleClose} />

      {/* Drawer */}
      <div style={s.drawer(open)}>
        {/* Header */}
        <div style={s.header}>
          <div style={s.headerLeft}>
            <div style={s.fileIcon(isPdf)}>
              {isPdf ? 'PDF' : 'W'}
            </div>
            <div style={s.fileInfo}>
              <div style={s.fileName} title={fileName}>{fileName || '研报文件'}</div>
              <div style={s.fileMeta}>
                {isPdf ? 'PDF 文档' : 'Word 文档'}
                {targetPage ? ` · 第 ${targetPage} 页` : ''}
                {targetPara ? ` 第 ${targetPara} 段` : ''}
              </div>
            </div>
          </div>
          <div style={s.headerActions}>
            {targetPage && (
              <span style={s.pageIndicator}>P.{targetPage}</span>
            )}
            <button
              style={s.iconBtn}
              title="下载原文"
              onClick={() => {
                const a = document.createElement('a');
                a.href = fileUrl;
                a.download = fileName || 'document';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(142,142,147,0.2)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(142,142,147,0.12)'; }}
            >
              ↓
            </button>
            <button style={s.closeBtn} onClick={handleClose} title="关闭"
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(142,142,147,0.2)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(142,142,147,0.12)'; }}>
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={s.body}>
          {locateMsg && <div style={s.locateBar}>{locateMsg}</div>}

          {isPdf ? (
            /* PDF: 浏览器内嵌预览 */
            <iframe
              ref={iframeRef}
              src={iframeSrc}
              style={s.iframe}
              title="PDF 预览"
            />
          ) : (
            /* DOCX: docx-preview 渲染 */
            <>
              {loading && (
                <div style={s.loadingWrap}>
                  <div style={s.spinner} />
                  <div style={s.loadingText}>正在渲染文档…</div>
                </div>
              )}
              {error && (
                <div style={s.errorWrap}>
                  <div style={s.errorIcon}>⚠️</div>
                  <div style={s.errorTitle}>文档加载失败</div>
                  <div style={s.errorDesc}>{error}</div>
                  <button style={s.retryBtn} onClick={() => loadDocx(fileUrl)}>
                    重试
                  </button>
                </div>
              )}
              <div
                ref={docxContainerRef}
                style={{
                  ...s.docxWrap,
                  display: loading || error ? 'none' : 'block',
                }}
              />
            </>
          )}
        </div>
      </div>
    </>
  );
}

export { parsePageFromLocation };
