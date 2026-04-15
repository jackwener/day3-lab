/**
 * Sidebar — Apple-style clean list, role-aware
 * 研究员：全列表 + 上传按钮
 * 合规审核员：仅显示 submitted/approved/rejected 状态的研报，无上传
 */
import { useState } from 'react';

const STATUS = {
  pending:   { label: '待审核', color: '#ff9f0a', bg: 'rgba(255, 159, 10, 0.1)' },
  reviewing: { label: '审核中', color: '#007aff', bg: 'rgba(0, 122, 255, 0.1)' },
  completed: { label: '审核完成', color: '#5856d6', bg: 'rgba(88, 86, 214, 0.1)' },
  submitted: { label: '待合规审批', color: '#ff9f0a', bg: 'rgba(255, 159, 10, 0.1)' },
  approved:  { label: '合规通过', color: '#34c759', bg: 'rgba(52, 199, 89, 0.1)' },
  rejected:  { label: '合规驳回', color: '#ff3b30', bg: 'rgba(255, 59, 48, 0.08)' },
};

const s = {
  sidebar: {
    width: '300px', minWidth: '300px',
    background: 'rgba(255, 255, 255, 0.72)',
    backdropFilter: 'saturate(180%) blur(20px)',
    WebkitBackdropFilter: 'saturate(180%) blur(20px)',
    borderRadius: '16px', display: 'flex', flexDirection: 'column',
    border: '0.5px solid rgba(0, 0, 0, 0.06)',
    overflow: 'hidden',
    animation: 'fadeIn 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  },
  header: {
    padding: '18px 20px 14px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  title: {
    fontSize: '13px', fontWeight: 600, color: '#86868b',
    letterSpacing: '0.04em', textTransform: 'uppercase',
  },
  uploadBtn: {
    padding: '6px 14px', borderRadius: '100px',
    fontSize: '13px', fontWeight: 500,
    background: '#0071e3', color: 'white',
    border: 'none', cursor: 'pointer',
    transition: 'all 0.2s ease',
    letterSpacing: '-0.01em',
  },
  uploadBtnDisabled: {
    padding: '6px 14px', borderRadius: '100px',
    fontSize: '13px', fontWeight: 500,
    background: '#d1d1d6', color: 'white',
    border: 'none', cursor: 'not-allowed',
  },
  sep: {
    height: '0.5px', background: 'rgba(60, 60, 67, 0.08)',
    margin: '0 20px',
  },
  list: { flex: 1, overflowY: 'auto', padding: '8px 10px' },
  item: (selected) => ({
    padding: '12px 14px', borderRadius: '12px', cursor: 'pointer',
    marginBottom: '2px',
    background: selected ? 'rgba(0, 113, 227, 0.06)' : 'transparent',
    transition: 'all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  }),
  itemName: {
    fontSize: '14px', fontWeight: 500, color: '#1d1d1f',
    marginBottom: '6px', lineHeight: 1.3,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    letterSpacing: '-0.01em',
  },
  itemMeta: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    fontSize: '12px', color: '#86868b',
  },
  badge: (status) => ({
    display: 'inline-block', padding: '2px 8px', borderRadius: '100px',
    fontSize: '11px', fontWeight: 500,
    color: STATUS[status]?.color || '#86868b',
    background: STATUS[status]?.bg || 'rgba(142,142,147,0.1)',
  }),
  compNote: {
    fontSize: '11px', color: '#ff3b30', marginTop: '4px',
    lineHeight: 1.4, fontWeight: 500,
  },
  error: {
    margin: '0 12px 8px', padding: '10px 14px', borderRadius: '10px',
    fontSize: '12px', fontWeight: 500, lineHeight: 1.5,
    background: 'rgba(255, 59, 48, 0.06)', color: '#ff3b30',
  },
  empty: {
    padding: '48px 20px', textAlign: 'center',
    color: '#aeaeb2', fontSize: '13px', lineHeight: 1.7,
  },
};

export default function Sidebar({ reports, selectedId, onSelect, onOpenUpload, role }) {
  const [hoveredId, setHoveredId] = useState(null);

  const isResearcher = role === 'researcher';

  /* 合规审核员只看到 submitted / approved / rejected */
  const filteredReports = isResearcher
    ? reports
    : reports.filter(r => ['submitted', 'approved', 'rejected'].includes(r.status));

  const listTitle = isResearcher
    ? `研报列表 · ${filteredReports.length}`
    : `合规审批 · ${filteredReports.length}`;

  return (
    <aside style={s.sidebar}>
      <div style={s.header}>
        <span style={s.title}>{listTitle}</span>
        {isResearcher && (
          <button
            style={s.uploadBtn}
            onClick={onOpenUpload}
            onMouseEnter={e => { e.target.style.background = '#0077ed'; }}
            onMouseLeave={e => { e.target.style.background = '#0071e3'; }}
          >
            上传研报
          </button>
        )}
      </div>

      <div style={s.sep} />

      <div style={s.list}>
        {filteredReports.map((report, i) => {
          const isSelected = report.id === selectedId;
          const isHovered = hoveredId === report.id;
          return (
            <div
              key={report.id}
              style={{
                ...s.item(isSelected),
                ...(isHovered && !isSelected ? { background: 'rgba(0, 0, 0, 0.03)' } : {}),
                animation: `fadeIn 0.3s ease ${i * 0.04}s both`,
              }}
              onClick={() => onSelect(report.id)}
              onMouseEnter={() => setHoveredId(report.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <div style={s.itemName} title={report.name}>
                {report.name}
              </div>
              <div style={s.itemMeta}>
                <span>{report.uploadTime}</span>
                <span style={s.badge(report.status)}>
                  {STATUS[report.status]?.label || report.status}
                </span>
              </div>
              {/* 驳回原因（研究员视角显示） */}
              {isResearcher && report.status === 'rejected' && report.complianceNote && (
                <div style={s.compNote}>驳回：{report.complianceNote}</div>
              )}
            </div>
          );
        })}
        {filteredReports.length === 0 && (
          <div style={s.empty}>
            {isResearcher ? '暂无研报，点击上方按钮上传' : '暂无待审批研报'}
          </div>
        )}
      </div>
    </aside>
  );
}
