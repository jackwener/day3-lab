/**
 * UploadModal — Apple-style 上传弹窗
 * 拖拽/点选文件 + 审核模式选择 → 一步完成上传+审核
 */
import { useState, useRef, useCallback } from 'react';

const MODES = [
  { id: 'rule',     label: '规则审核',    desc: '基于预设规则自动化检查', icon: '📋', needsAi: false },
  { id: 'ai',       label: 'AI 审核',     desc: '大模型驱动智能审核',     icon: '🤖', needsAi: true },
  { id: 'rule_ai',  label: '联合审核',    desc: '规则+AI 双重校验',       icon: '🔗', needsAi: true },
];

const REPORT_TYPES = ['日报', '周报', '深度研究', '首次覆盖', '行业报告'];

const s = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 200,
    background: 'rgba(0, 0, 0, 0.35)',
    backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    animation: 'fadeIn 0.2s ease',
  },
  modal: {
    width: '560px', maxWidth: '92vw', maxHeight: '90vh', overflowY: 'auto',
    background: '#ffffff', borderRadius: '20px',
    boxShadow: '0 24px 80px rgba(0, 0, 0, 0.16), 0 8px 24px rgba(0, 0, 0, 0.08)',
    animation: 'scaleIn 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    padding: '32px',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: '24px',
  },
  title: {
    fontSize: '20px', fontWeight: 600, color: '#1d1d1f',
    letterSpacing: '-0.03em',
  },
  closeBtn: {
    width: '28px', height: '28px', borderRadius: '50%',
    background: 'rgba(142, 142, 147, 0.12)', border: 'none',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '14px', color: '#86868b', transition: 'background 0.2s',
  },
  /* ── Drop zone ── */
  dropzone: (active, hasFile) => ({
    border: `2px dashed ${active ? '#0071e3' : hasFile ? '#34c759' : 'rgba(0, 0, 0, 0.1)'}`,
    borderRadius: '16px', padding: hasFile ? '20px 24px' : '40px 24px',
    textAlign: 'center', cursor: 'pointer',
    background: active ? 'rgba(0, 113, 227, 0.04)' : hasFile ? 'rgba(52, 199, 89, 0.04)' : '#f5f5f7',
    transition: 'all 0.25s ease', marginBottom: '24px',
  }),
  dropIcon: { fontSize: '36px', marginBottom: '12px' },
  dropTitle: {
    fontSize: '15px', fontWeight: 500, color: '#1d1d1f',
    letterSpacing: '-0.01em', marginBottom: '6px',
  },
  dropHint: { fontSize: '12px', color: '#86868b' },
  fileInfo: {
    display: 'flex', alignItems: 'center', gap: '12px',
  },
  fileIcon: {
    width: '40px', height: '40px', borderRadius: '10px',
    background: 'rgba(0, 113, 227, 0.08)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '18px',
  },
  fileDetail: { flex: 1 },
  fileName: {
    fontSize: '14px', fontWeight: 500, color: '#1d1d1f',
    letterSpacing: '-0.01em', marginBottom: '2px',
  },
  fileMeta: { fontSize: '12px', color: '#86868b' },
  removeBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: '#ff3b30', fontSize: '12px', fontWeight: 500,
    padding: '4px 8px', borderRadius: '6px',
    transition: 'background 0.15s',
  },
  /* ── Mode selection ── */
  sectionLabel: {
    fontSize: '13px', fontWeight: 600, color: '#86868b',
    letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '12px',
  },
  degradeHint: {
    padding: '10px 14px', borderRadius: '10px', marginBottom: '12px',
    background: 'rgba(255, 159, 10, 0.08)', fontSize: '12px', color: '#c77c00',
    fontWeight: 500,
  },
  modeGrid: { display: 'flex', gap: '10px', marginBottom: '28px' },
  modeCard: (selected, disabled) => ({
    flex: 1, padding: '16px 14px', borderRadius: '14px',
    cursor: disabled ? 'not-allowed' : 'pointer', textAlign: 'center',
    background: disabled ? '#f5f5f7' : selected ? 'rgba(0, 113, 227, 0.04)' : '#ffffff',
    border: selected ? '2px solid #0071e3' : '1.5px solid rgba(0, 0, 0, 0.06)',
    opacity: disabled ? 0.4 : 1,
    transition: 'all 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    boxShadow: selected ? '0 2px 8px rgba(0, 113, 227, 0.08)' : 'none',
  }),
  modeIcon: { fontSize: '24px', marginBottom: '8px' },
  modeLabel: {
    fontSize: '13px', fontWeight: 600, color: '#1d1d1f',
    letterSpacing: '-0.02em', marginBottom: '4px',
  },
  modeDesc: { fontSize: '11px', color: '#86868b', lineHeight: 1.4 },
  /* ── Footer ── */
  footer: {
    display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px',
  },
  cancelBtn: {
    padding: '10px 22px', borderRadius: '100px',
    fontSize: '14px', fontWeight: 500,
    background: 'rgba(142, 142, 147, 0.12)', color: '#1d1d1f',
    border: 'none', cursor: 'pointer', transition: 'background 0.2s',
  },
  submitBtn: (disabled) => ({
    padding: '10px 24px', borderRadius: '100px',
    fontSize: '14px', fontWeight: 500,
    background: disabled ? '#d1d1d6' : '#0071e3', color: 'white',
    border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.25s ease',
    boxShadow: disabled ? 'none' : '0 2px 8px rgba(0, 113, 227, 0.25)',
  }),
  /* ── Progress ── */
  progressWrap: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '40px 20px', textAlign: 'center',
  },
  spinner: {
    width: '40px', height: '40px',
    border: '3px solid rgba(0, 113, 227, 0.12)',
    borderTopColor: '#0071e3', borderRadius: '50%',
    animation: 'spin 0.8s linear infinite', marginBottom: '16px',
  },
  progressText: {
    fontSize: '15px', fontWeight: 500, color: '#1d1d1f',
    letterSpacing: '-0.01em', marginBottom: '6px',
  },
  progressSub: { fontSize: '13px', color: '#86868b' },
  /* ── Error ── */
  error: {
    padding: '10px 14px', borderRadius: '10px', marginBottom: '16px',
    background: 'rgba(255, 59, 48, 0.06)', color: '#ff3b30',
    fontSize: '12px', fontWeight: 500,
  },
};

export default function UploadModal({ open, onClose, aiAvailable, onUploadAndReview }) {
  const [file, setFile] = useState(null);
  const [mode, setMode] = useState('rule');
  const [reportType, setReportType] = useState('深度研究');
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const handleFile = useCallback((f) => {
    setError(null);
    const ext = f.name.split('.').pop().toLowerCase();
    if (!['pdf', 'docx'].includes(ext)) {
      setError('仅支持 PDF / DOCX 格式');
      return;
    }
    if (f.size > 20 * 1024 * 1024) {
      setError('文件大小不能超过 20 MB');
      return;
    }
    setFile(f);
  }, []);

  const handleDragOver = (e) => { e.preventDefault(); setDragActive(true); };
  const handleDragLeave = () => setDragActive(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  };
  const handleInputChange = (e) => {
    if (e.target.files?.[0]) handleFile(e.target.files[0]);
    e.target.value = '';
  };

  const handleSubmit = async () => {
    if (!file || uploading) return;
    setUploading(true);
    setError(null);
    try {
      await onUploadAndReview(file, mode, reportType);
      /* 成功后重置并关闭 */
      setFile(null);
      setMode('rule');
      setReportType('深度研究');
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (uploading) return;
    setFile(null);
    setMode('rule');
    setReportType('深度研究');
    setError(null);
    onClose();
  };

  if (!open) return null;

  return (
    <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <div style={s.modal}>
        <div style={s.header}>
          <span style={s.title}>上传研报</span>
          <button style={s.closeBtn} onClick={handleClose}
            onMouseEnter={e => { e.target.style.background = 'rgba(142,142,147,0.2)'; }}
            onMouseLeave={e => { e.target.style.background = 'rgba(142,142,147,0.12)'; }}>
            ✕
          </button>
        </div>

        {uploading ? (
          <div style={s.progressWrap}>
            <div style={s.spinner} />
            <p style={s.progressText}>正在上传并审核…</p>
            <p style={s.progressSub}>
              {file?.name} · {MODES.find(m => m.id === mode)?.label}
            </p>
          </div>
        ) : (
          <>
            {/* ── Drop zone ── */}
            <div
              style={s.dropzone(dragActive, !!file)}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !file && inputRef.current?.click()}
            >
              {file ? (
                <div style={s.fileInfo}>
                  <div style={s.fileIcon}>
                    {file.name.endsWith('.pdf') ? '📄' : '📝'}
                  </div>
                  <div style={s.fileDetail}>
                    <div style={s.fileName}>{file.name}</div>
                    <div style={s.fileMeta}>
                      {(file.size / (1024 * 1024)).toFixed(1)} MB
                    </div>
                  </div>
                  <button style={s.removeBtn} onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    onMouseEnter={e => { e.target.style.background = 'rgba(255,59,48,0.08)'; }}
                    onMouseLeave={e => { e.target.style.background = 'transparent'; }}>
                    移除
                  </button>
                </div>
              ) : (
                <>
                  <div style={s.dropIcon}>📎</div>
                  <div style={s.dropTitle}>拖拽文件到此处，或点击选择</div>
                  <div style={s.dropHint}>支持 PDF / DOCX，≤ 20 MB</div>
                </>
              )}
            </div>
            <input ref={inputRef} type="file" accept=".pdf,.docx"
              style={{ display: 'none' }} onChange={handleInputChange} />

            {error && <div style={s.error}>{error}</div>}

            {/* ── Report type ── */}
            <p style={s.sectionLabel}>研报类型</p>
            <div style={{
              display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px',
            }}>
              {REPORT_TYPES.map(t => (
                <button key={t} onClick={() => setReportType(t)} style={{
                  padding: '6px 16px', borderRadius: '100px',
                  fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                  border: reportType === t ? '1.5px solid #0071e3' : '1.5px solid rgba(0,0,0,0.08)',
                  background: reportType === t ? 'rgba(0,113,227,0.06)' : '#fff',
                  color: reportType === t ? '#0071e3' : '#1d1d1f',
                  transition: 'all 0.2s ease',
                }}>
                  {t}
                </button>
              ))}
            </div>

            {/* ── Mode selection ── */}
            <p style={s.sectionLabel}>审核模式</p>
            {!aiAvailable && (
              <div style={s.degradeHint}>
                AI 服务当前不可用，仅规则审核可使用
              </div>
            )}
            <div style={s.modeGrid}>
              {MODES.map(m => {
                const disabled = m.needsAi && !aiAvailable;
                const selected = mode === m.id && !disabled;
                return (
                  <div key={m.id} style={s.modeCard(selected, disabled)}
                    onClick={() => !disabled && setMode(m.id)}>
                    <div style={s.modeIcon}>{m.icon}</div>
                    <div style={s.modeLabel}>{m.label}</div>
                    <div style={s.modeDesc}>{disabled ? '当前不可用' : m.desc}</div>
                  </div>
                );
              })}
            </div>

            {/* ── Footer ── */}
            <div style={s.footer}>
              <button style={s.cancelBtn} onClick={handleClose}
                onMouseEnter={e => { e.target.style.background = 'rgba(142,142,147,0.2)'; }}
                onMouseLeave={e => { e.target.style.background = 'rgba(142,142,147,0.12)'; }}>
                取消
              </button>
              <button style={s.submitBtn(!file)} onClick={handleSubmit}
                onMouseEnter={e => file && (e.target.style.background = '#0077ed')}
                onMouseLeave={e => file && (e.target.style.background = '#0071e3')}>
                上传并审核
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
