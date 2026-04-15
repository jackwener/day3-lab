/**
 * ReviewReport — Apple-style review results display, role-aware
 * 研究员：查看审核结果 + 提交合规 + 重新上传修改版
 * 合规审核员：查看审核结果 + 同意/驳回操作
 */
import { useState, useRef } from 'react';

const SEV = {
  P0: { label: 'P0', full: '严重', color: '#ff3b30', bg: 'rgba(255, 59, 48, 0.06)', border: 'rgba(255, 59, 48, 0.12)' },
  P1: { label: 'P1', full: '重要', color: '#ff9f0a', bg: 'rgba(255, 159, 10, 0.06)', border: 'rgba(255, 159, 10, 0.12)' },
  P2: { label: 'P2', full: '建议', color: '#007aff', bg: 'rgba(0, 122, 255, 0.05)', border: 'rgba(0, 122, 255, 0.1)' },
};

const s = {
  container: {
    padding: '32px 36px', overflowY: 'auto', flex: 1,
    animation: 'fadeIn 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  },
  summaryGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px',
  },
  summaryCard: (accent) => ({
    padding: '20px', borderRadius: '16px', background: '#f5f5f7',
    borderLeft: accent ? `3px solid ${accent}` : 'none',
  }),
  summaryValue: (color) => ({
    fontSize: '28px', fontWeight: 700, color: color || '#1d1d1f',
    letterSpacing: '-0.04em', lineHeight: 1,
  }),
  summaryLabel: {
    fontSize: '12px', color: '#86868b', marginTop: '6px',
    letterSpacing: '-0.01em', fontWeight: 500,
  },
  metaBar: {
    display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap',
    padding: '14px 20px', borderRadius: '12px',
    background: 'rgba(0, 122, 255, 0.03)', border: '0.5px solid rgba(0, 122, 255, 0.08)',
    marginBottom: '24px', fontSize: '13px', color: '#86868b', fontWeight: 500,
  },
  metaItem: { display: 'flex', alignItems: 'center', gap: '6px' },
  /* ── Status banner ── */
  statusBanner: (type) => ({
    padding: '14px 20px', borderRadius: '12px', marginBottom: '20px',
    fontSize: '13px', fontWeight: 500, letterSpacing: '-0.01em',
    ...(type === 'submitted' ? {
      background: 'rgba(255, 159, 10, 0.06)', border: '0.5px solid rgba(255, 159, 10, 0.15)',
      color: '#c77c00',
    } : type === 'approved' ? {
      background: 'rgba(52, 199, 89, 0.06)', border: '0.5px solid rgba(52, 199, 89, 0.15)',
      color: '#248a3d',
    } : type === 'rejected' ? {
      background: 'rgba(255, 59, 48, 0.06)', border: '0.5px solid rgba(255, 59, 48, 0.12)',
      color: '#ff3b30',
    } : type === 'compare_good' ? {
      background: 'rgba(52, 199, 89, 0.06)', border: '0.5px solid rgba(52, 199, 89, 0.15)',
      color: '#248a3d',
    } : {
      background: 'rgba(255, 159, 10, 0.06)', border: '0.5px solid rgba(255, 159, 10, 0.15)',
      color: '#c77c00',
    }),
  }),
  /* ── Actions ── */
  actions: {
    display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px', flexWrap: 'wrap',
  },
  btnPrimary: {
    padding: '8px 20px', borderRadius: '100px',
    fontSize: '13px', fontWeight: 500,
    background: '#0071e3', color: 'white',
    border: 'none', cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 6px rgba(0, 113, 227, 0.25)',
  },
  btnSecondary: {
    padding: '8px 20px', borderRadius: '100px',
    fontSize: '13px', fontWeight: 500,
    background: '#ff9f0a', color: 'white',
    border: 'none', cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 6px rgba(255, 159, 10, 0.25)',
  },
  btnApprove: {
    padding: '8px 20px', borderRadius: '100px',
    fontSize: '13px', fontWeight: 500,
    background: '#34c759', color: 'white',
    border: 'none', cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 6px rgba(52, 199, 89, 0.25)',
  },
  btnReject: {
    padding: '8px 20px', borderRadius: '100px',
    fontSize: '13px', fontWeight: 500,
    background: '#ff3b30', color: 'white',
    border: 'none', cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 6px rgba(255, 59, 48, 0.2)',
  },
  btnDisabled: {
    padding: '8px 20px', borderRadius: '100px',
    fontSize: '13px', fontWeight: 500,
    background: '#d1d1d6', color: 'white',
    border: 'none', cursor: 'not-allowed',
  },
  actionHint: { fontSize: '12px', color: '#aeaeb2' },
  btnOutline: {
    padding: '8px 20px', borderRadius: '100px',
    fontSize: '13px', fontWeight: 500,
    background: 'transparent', color: '#0071e3',
    border: '1.5px solid rgba(0, 113, 227, 0.3)',
    cursor: 'pointer', transition: 'all 0.2s ease',
    display: 'inline-flex', alignItems: 'center', gap: '6px',
  },
  /* ── Reject reason input ── */
  rejectInputWrap: {
    display: 'flex', gap: '8px', alignItems: 'center', width: '100%', marginTop: '8px',
  },
  rejectInput: {
    flex: 1, padding: '8px 14px', borderRadius: '10px',
    border: '1px solid rgba(0, 0, 0, 0.1)', fontSize: '13px',
    outline: 'none', background: '#ffffff',
    transition: 'border-color 0.2s',
  },
  /* ── Issue cards ── */
  sectionTitle: {
    fontSize: '13px', fontWeight: 600, color: '#86868b',
    letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '14px',
  },
  issueCard: (severity, isHovered) => ({
    padding: '18px 20px', borderRadius: '14px', marginBottom: '8px',
    background: isHovered ? SEV[severity]?.bg : '#ffffff',
    border: `0.5px solid ${isHovered ? SEV[severity]?.border : 'rgba(0,0,0,0.06)'}`,
    cursor: 'pointer',
    transition: 'all 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    boxShadow: isHovered ? '0 2px 8px rgba(0,0,0,0.04)' : 'none',
  }),
  issueHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px',
  },
  issueLeft: { display: 'flex', alignItems: 'center', gap: '8px' },
  sevBadge: (severity) => ({
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    minWidth: '28px', padding: '3px 8px', borderRadius: '6px',
    fontSize: '11px', fontWeight: 700, letterSpacing: '0.02em',
    color: 'white', background: SEV[severity]?.color || '#86868b',
  }),
  category: { fontSize: '12px', color: '#86868b', fontWeight: 500 },
  location: {
    fontSize: '12px', color: '#aeaeb2', fontFamily: 'SF Mono, Menlo, monospace', fontWeight: 500,
  },
  issueDesc: {
    fontSize: '14px', color: '#1d1d1f', lineHeight: 1.6,
    letterSpacing: '-0.01em', marginBottom: '10px',
  },
  suggestion: {
    fontSize: '13px', color: '#86868b', lineHeight: 1.6,
    padding: '10px 14px', borderRadius: '10px',
    background: 'rgba(0, 0, 0, 0.02)', letterSpacing: '-0.01em',
  },
  suggestionLabel: { color: '#0071e3', fontWeight: 600, fontSize: '12px' },
  toast: {
    position: 'fixed', bottom: '28px', right: '28px',
    padding: '12px 20px', borderRadius: '14px',
    background: 'rgba(29, 29, 31, 0.9)',
    backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
    color: 'white', fontSize: '13px', fontWeight: 500,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.18)',
    animation: 'fadeIn 0.3s ease', letterSpacing: '-0.01em',
  },
  empty: {
    padding: '80px 40px', textAlign: 'center',
    color: '#aeaeb2', fontSize: '15px', letterSpacing: '-0.01em',
  },
};

export default function ReviewReport({
  result, previousResult, report, role,
  onReupload, onSubmitCompliance, onApprove, onReject,
  onOpenDocument, onLocateInDocument,
}) {
  const [locateMsg, setLocateMsg] = useState(null);
  const [hoveredIssue, setHoveredIssue] = useState(null);
  const [rejectNote, setRejectNote] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const fileInputRef = useRef(null);
  const timerRef = useRef(null);

  const isResearcher = role === 'researcher';

  if (!result) {
    return <div style={s.empty}>
      {isResearcher ? '选择一份已审核的研报查看报告' : '选择一份研报查看审核详情'}
    </div>;
  }

  const severityOrder = { P0: 0, P1: 1, P2: 2 };
  const sorted = [...result.issues].sort(
    (a, b) => (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9)
  );

  const handleLocate = (issue) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    /* 如果有文档预览回调，打开抽屉并定位到具体位置 */
    if (onLocateInDocument && issue.location) {
      onLocateInDocument(issue.location);
    } else {
      setLocateMsg(`已定位到 ${issue.location}`);
      timerRef.current = setTimeout(() => setLocateMsg(null), 2200);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && onReupload) onReupload(file);
    e.target.value = '';
  };

  const handleReject = () => {
    if (showRejectInput) {
      onReject(report.id, rejectNote || '存在合规问题，请修改后重新提交');
      setShowRejectInput(false);
      setRejectNote('');
    } else {
      setShowRejectInput(true);
    }
  };

  const compare = previousResult ? {
    prev: previousResult.summary.total,
    curr: result.summary.total,
    diff: previousResult.summary.total - result.summary.total,
  } : null;

  const status = report?.status;

  return (
    <div style={s.container}>
      {/* Summary */}
      <div style={s.summaryGrid}>
        <div style={s.summaryCard()}>
          <div style={s.summaryValue()}>{result.summary.total}</div>
          <div style={s.summaryLabel}>总问题数</div>
        </div>
        <div style={s.summaryCard(SEV.P0.color)}>
          <div style={s.summaryValue(SEV.P0.color)}>{result.summary.p0}</div>
          <div style={s.summaryLabel}>P0 严重</div>
        </div>
        <div style={s.summaryCard(SEV.P1.color)}>
          <div style={s.summaryValue(SEV.P1.color)}>{result.summary.p1}</div>
          <div style={s.summaryLabel}>P1 重要</div>
        </div>
        <div style={s.summaryCard(SEV.P2.color)}>
          <div style={s.summaryValue(SEV.P2.color)}>{result.summary.p2}</div>
          <div style={s.summaryLabel}>P2 建议</div>
        </div>
      </div>

      {/* Meta */}
      <div style={s.metaBar}>
        <span style={s.metaItem}>{result.reportName}</span>
        <span style={s.metaItem}>
          <span style={{ color: '#0071e3' }}>{result.reviewModeLabel}</span>
        </span>
        <span style={s.metaItem}>耗时 {result.duration}</span>
        <span style={s.metaItem}>{result.id}</span>
        {/* 查看原文按钮 */}
        {onOpenDocument && (
          <button style={s.btnOutline} onClick={onOpenDocument}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(0,113,227,0.06)';
              e.currentTarget.style.borderColor = '#0071e3';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.borderColor = 'rgba(0,113,227,0.3)';
            }}>
            📄 查看原文
          </button>
        )}
      </div>

      {/* Status banner */}
      {status === 'submitted' && isResearcher && (
        <div style={s.statusBanner('submitted')}>
          已提交合规审核，等待合规审核员审批
        </div>
      )}
      {status === 'approved' && (
        <div style={s.statusBanner('approved')}>
          合规通过{report.complianceNote ? ` — ${report.complianceNote}` : ''}
        </div>
      )}
      {status === 'rejected' && (
        <div style={s.statusBanner('rejected')}>
          合规驳回{report.complianceNote ? ` — ${report.complianceNote}` : ''}
        </div>
      )}

      {/* Compare banner */}
      {compare && (
        <div style={s.statusBanner(compare.diff > 0 ? 'compare_good' : 'compare_bad')}>
          与上次审核对比：{compare.prev} 个问题 → {compare.curr} 个问题
          {compare.diff > 0 ? `，减少了 ${compare.diff} 个`
            : compare.diff < 0 ? `，新增了 ${Math.abs(compare.diff)} 个`
            : '，数量相同'}
        </div>
      )}

      {/* ── 研究员操作区 ── */}
      {isResearcher && (
        <div style={s.actions}>
          {/* 审核完成 → 可提交合规 */}
          {status === 'completed' && (
            <button style={s.btnPrimary} onClick={() => onSubmitCompliance(report.id)}
              onMouseEnter={e => { e.target.style.background = '#0077ed'; }}
              onMouseLeave={e => { e.target.style.background = '#0071e3'; }}>
              提交合规审核
            </button>
          )}
          {/* 审核完成 或 被驳回 → 可重新上传 */}
          {(status === 'completed' || status === 'rejected') && (
            <>
              <button style={s.btnSecondary} onClick={() => fileInputRef.current?.click()}
                onMouseEnter={e => { e.target.style.background = '#e68f09'; }}
                onMouseLeave={e => { e.target.style.background = '#ff9f0a'; }}>
                重新上传修改版
              </button>
              <span style={s.actionHint}>上传后将自动发起重新审核</span>
            </>
          )}
          {status === 'submitted' && (
            <span style={s.actionHint}>等待合规审核员审批中…</span>
          )}
          {status === 'approved' && (
            <span style={s.actionHint}>已通过合规审核，可发布</span>
          )}
          <input ref={fileInputRef} type="file" accept=".pdf,.docx"
            style={{ display: 'none' }} onChange={handleFileChange} />
        </div>
      )}

      {/* ── 合规审核员操作区 ── */}
      {!isResearcher && (
        <div style={s.actions}>
          {status === 'submitted' && (
            <>
              <button style={s.btnApprove} onClick={() => onApprove(report.id, '合规通过，可发布')}
                onMouseEnter={e => { e.target.style.background = '#2db84d'; }}
                onMouseLeave={e => { e.target.style.background = '#34c759'; }}>
                同意
              </button>
              <button style={s.btnReject} onClick={handleReject}
                onMouseEnter={e => { e.target.style.background = '#e0342b'; }}
                onMouseLeave={e => { e.target.style.background = '#ff3b30'; }}>
                {showRejectInput ? '确认驳回' : '驳回'}
              </button>
              {showRejectInput && (
                <div style={s.rejectInputWrap}>
                  <input
                    style={s.rejectInput} placeholder="请输入驳回原因…"
                    value={rejectNote} onChange={e => setRejectNote(e.target.value)}
                    onFocus={e => { e.target.style.borderColor = '#0071e3'; }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(0,0,0,0.1)'; }}
                    autoFocus
                  />
                  <button style={{ ...s.btnReject, padding: '6px 14px', fontSize: '12px' }}
                    onClick={() => { setShowRejectInput(false); setRejectNote(''); }}>
                    取消
                  </button>
                </div>
              )}
            </>
          )}
          {status === 'approved' && (
            <span style={s.actionHint}>已审批通过</span>
          )}
          {status === 'rejected' && (
            <span style={s.actionHint}>已驳回，等待研究员修改</span>
          )}
        </div>
      )}

      {/* Issue list */}
      <p style={s.sectionTitle}>问题列表 · {result.issues.length}</p>

      {sorted.map((issue, i) => (
        <div
          key={issue.id}
          style={{
            ...s.issueCard(issue.severity, hoveredIssue === issue.id),
            animation: `fadeIn 0.3s ease ${i * 0.05}s both`,
          }}
          onClick={() => handleLocate(issue)}
          onMouseEnter={() => setHoveredIssue(issue.id)}
          onMouseLeave={() => setHoveredIssue(null)}
        >
          <div style={s.issueHeader}>
            <div style={s.issueLeft}>
              <span style={s.sevBadge(issue.severity)}>{issue.severity}</span>
              <span style={s.category}>{issue.category}</span>
            </div>
            <span style={s.location}>{issue.location}</span>
          </div>
          <div style={s.issueDesc}>{issue.description}</div>
          <div style={s.suggestion}>
            <span style={s.suggestionLabel}>修改建议　</span>
            {issue.suggestion}
          </div>
        </div>
      ))}

      {sorted.length === 0 && <div style={s.empty}>审核通过，未发现问题</div>}
      {locateMsg && <div style={s.toast}>{locateMsg}</div>}
    </div>
  );
}
