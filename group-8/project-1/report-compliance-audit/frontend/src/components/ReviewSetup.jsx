/**
 * ReviewSetup — Apple-style mode selection cards
 * US-002: 发起审核与模式选择
 */
import { useState } from 'react';

const MODES = [
  { id: 'rule',    label: '规则审核',          desc: '基于预设规则的自动化检查', sub: '适合常规日报与周报', icon: '📋', needsAi: false },
  { id: 'ai',      label: 'AI 审核',           desc: '大模型驱动的智能内容审核', sub: '适合深度研究报告', icon: '🤖', needsAi: true },
  { id: 'rule_ai', label: '规则 + AI 联合审核', desc: '双重校验综合评分',        sub: '适合重要研报终审', icon: '🔗', needsAi: true },
];

const s = {
  container: {
    padding: '40px 36px', flex: 1,
    animation: 'fadeIn 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  },
  reportCard: {
    padding: '20px 24px', borderRadius: '16px',
    background: '#f5f5f7', marginBottom: '32px',
  },
  reportName: {
    fontSize: '18px', fontWeight: 600, color: '#1d1d1f',
    letterSpacing: '-0.02em', marginBottom: '6px',
  },
  reportMeta: { fontSize: '13px', color: '#86868b', letterSpacing: '-0.01em' },
  sectionLabel: {
    fontSize: '13px', fontWeight: 600, color: '#86868b',
    letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '16px',
  },
  degradeHint: {
    padding: '12px 16px', borderRadius: '12px', marginBottom: '20px',
    background: 'rgba(255, 159, 10, 0.08)', fontSize: '13px', color: '#c77c00',
    fontWeight: 500, letterSpacing: '-0.01em',
  },
  modeGrid: { display: 'flex', gap: '12px', marginBottom: '32px' },
  modeCard: (selected, disabled) => ({
    flex: 1, padding: '24px 20px', borderRadius: '16px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    background: disabled ? '#f5f5f7' : selected ? 'rgba(0, 113, 227, 0.04)' : '#ffffff',
    border: selected ? '2px solid #0071e3' : '1.5px solid rgba(0, 0, 0, 0.06)',
    opacity: disabled ? 0.45 : 1,
    transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    boxShadow: selected ? '0 2px 12px rgba(0, 113, 227, 0.08)' : '0 1px 2px rgba(0,0,0,0.02)',
  }),
  modeIcon: { fontSize: '32px', marginBottom: '14px' },
  modeLabel: {
    fontSize: '15px', fontWeight: 600, color: '#1d1d1f',
    letterSpacing: '-0.02em', marginBottom: '6px',
  },
  modeDesc: {
    fontSize: '13px', color: '#86868b', lineHeight: 1.5,
    letterSpacing: '-0.01em',
  },
  modeSub: {
    fontSize: '11px', color: '#aeaeb2', marginTop: '8px',
  },
  startBtn: (disabled) => ({
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    padding: '12px 28px', borderRadius: '100px',
    fontSize: '15px', fontWeight: 500, letterSpacing: '-0.01em',
    background: disabled ? '#d1d1d6' : '#0071e3', color: 'white',
    border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.25s ease',
    boxShadow: disabled ? 'none' : '0 2px 8px rgba(0, 113, 227, 0.25)',
  }),
  /* Reviewing state */
  reviewingBox: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: '80px 40px', textAlign: 'center',
    animation: 'fadeIn 0.4s ease',
  },
  spinner: {
    width: '44px', height: '44px',
    border: '3px solid rgba(0, 113, 227, 0.12)',
    borderTopColor: '#0071e3', borderRadius: '50%',
    animation: 'spin 0.8s linear infinite', marginBottom: '24px',
  },
  reviewingTitle: {
    fontSize: '17px', fontWeight: 600, color: '#1d1d1f',
    letterSpacing: '-0.02em', marginBottom: '8px',
  },
  reviewingMeta: { fontSize: '13px', color: '#86868b' },
};

export default function ReviewSetup({ report, aiAvailable, reviewing, onStartReview }) {
  const [selectedMode, setSelectedMode] = useState('rule');
  const [hovered, setHovered] = useState(null);

  if (reviewing) {
    return (
      <div style={s.reviewingBox}>
        <div style={s.spinner} />
        <p style={s.reviewingTitle}>正在审核中…</p>
        <p style={s.reviewingMeta}>
          {MODES.find(m => m.id === selectedMode)?.label || selectedMode}
        </p>
      </div>
    );
  }

  return (
    <div style={s.container}>
      <div style={s.reportCard}>
        <div style={s.reportName}>{report.name}</div>
        <div style={s.reportMeta}>
          {report.fileType?.toUpperCase()}{report.fileSize ? ` · ${report.fileSize}` : ''} · 上传于 {report.uploadTime}
        </div>
      </div>

      <p style={s.sectionLabel}>审核模式</p>

      {!aiAvailable && (
        <div style={s.degradeHint}>
          AI 服务当前不可用，仅规则审核可使用
        </div>
      )}

      <div style={s.modeGrid}>
        {MODES.map(mode => {
          const disabled = mode.needsAi && !aiAvailable;
          const selected = selectedMode === mode.id && !disabled;
          const isHovered = hovered === mode.id && !disabled;
          return (
            <div
              key={mode.id}
              style={{
                ...s.modeCard(selected, disabled),
                ...(isHovered && !selected ? {
                  borderColor: 'rgba(0, 113, 227, 0.2)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                } : {}),
              }}
              onClick={() => !disabled && setSelectedMode(mode.id)}
              onMouseEnter={() => setHovered(mode.id)}
              onMouseLeave={() => setHovered(null)}
            >
              <div style={s.modeIcon}>{mode.icon}</div>
              <div style={s.modeLabel}>{mode.label}</div>
              <div style={s.modeDesc}>
                {disabled ? '当前不可用' : mode.desc}
              </div>
              {!disabled && <div style={s.modeSub}>{mode.sub}</div>}
            </div>
          );
        })}
      </div>

      <button
        style={s.startBtn(false)}
        onClick={() => onStartReview(selectedMode)}
        onMouseEnter={e => { e.target.style.background = '#0077ed'; }}
        onMouseLeave={e => { e.target.style.background = '#0071e3'; }}
      >
        发起审核
      </button>
    </div>
  );
}
