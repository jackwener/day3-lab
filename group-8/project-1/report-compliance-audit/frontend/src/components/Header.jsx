/**
 * Header — Apple-style frosted glass navigation + role switcher
 * 毛玻璃效果 + 角色分段控件 + 状态指示器
 */

const ROLES = [
  { id: 'researcher', label: '研究员' },
  { id: 'compliance', label: '合规审核员' },
];

const s = {
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 24px',
    background: 'rgba(255, 255, 255, 0.72)',
    backdropFilter: 'saturate(180%) blur(20px)',
    WebkitBackdropFilter: 'saturate(180%) blur(20px)',
    borderBottom: '0.5px solid rgba(0, 0, 0, 0.06)',
    position: 'sticky', top: 0, zIndex: 100,
    animation: 'fadeIn 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  },
  brand: { display: 'flex', alignItems: 'center', gap: '12px' },
  logo: {
    width: '36px', height: '36px', borderRadius: '10px',
    background: 'linear-gradient(135deg, #0071e3, #007aff)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'white', fontSize: '18px', fontWeight: 600,
    boxShadow: '0 2px 8px rgba(0, 113, 227, 0.3)',
  },
  titleWrap: { display: 'flex', flexDirection: 'column' },
  title: {
    fontSize: '16px', fontWeight: 600, color: '#1d1d1f',
    letterSpacing: '-0.02em', lineHeight: 1.2,
  },
  subtitle: {
    fontSize: '11px', color: '#86868b', letterSpacing: '0.02em',
    fontWeight: 400, marginTop: '1px',
  },
  center: { display: 'flex', alignItems: 'center' },
  /* ── Apple-style segmented control ── */
  segmented: {
    display: 'inline-flex', padding: '3px',
    borderRadius: '10px', background: 'rgba(142, 142, 147, 0.12)',
  },
  segItem: (active) => ({
    padding: '6px 16px', borderRadius: '8px',
    fontSize: '13px', fontWeight: 500, letterSpacing: '-0.01em',
    cursor: 'pointer', border: 'none',
    background: active ? '#ffffff' : 'transparent',
    color: active ? '#1d1d1f' : '#86868b',
    boxShadow: active ? '0 1px 4px rgba(0, 0, 0, 0.08), 0 0.5px 1px rgba(0, 0, 0, 0.04)' : 'none',
    transition: 'all 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  }),
  right: { display: 'flex', alignItems: 'center', gap: '8px' },
  chip: (active) => ({
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    padding: '5px 12px', borderRadius: '100px',
    fontSize: '12px', fontWeight: 500, letterSpacing: '-0.01em',
    background: active ? 'rgba(52, 199, 89, 0.1)' : 'rgba(142, 142, 147, 0.1)',
    color: active ? '#248a3d' : '#86868b',
    transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  }),
  dot: (active) => ({
    width: '6px', height: '6px', borderRadius: '50%',
    background: active ? '#34c759' : '#aeaeb2',
    transition: 'background 0.3s ease',
    ...(active ? { boxShadow: '0 0 6px rgba(52, 199, 89, 0.4)' } : {}),
  }),
  toggleBtn: {
    padding: '5px 12px', borderRadius: '100px',
    fontSize: '12px', fontWeight: 500, letterSpacing: '-0.01em',
    background: 'transparent', color: '#0071e3',
    border: '1px solid rgba(0, 113, 227, 0.2)', cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
};

export default function Header({ aiAvailable, onToggleAi, role, onRoleChange }) {
  return (
    <header style={s.header}>
      <div style={s.brand}>
        <div style={s.logo}>R</div>
        <div style={s.titleWrap}>
          <span style={s.title}>研报哨兵</span>
          <span style={s.subtitle}>AI把关，合规无忧</span>
        </div>
      </div>

      {/* 角色切换分段控件 */}
      <div style={s.center}>
        <div style={s.segmented}>
          {ROLES.map(r => (
            <button
              key={r.id}
              style={s.segItem(role === r.id)}
              onClick={() => onRoleChange(r.id)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div style={s.right}>
        <span style={s.chip(true)}>
          <span style={s.dot(true)} />规则引擎
        </span>
        <span style={s.chip(aiAvailable)}>
          <span style={s.dot(aiAvailable)} />
          {aiAvailable ? 'AI 可用' : 'AI 已降级'}
        </span>
        <button
          style={s.toggleBtn}
          onClick={onToggleAi}
          onMouseEnter={e => { e.target.style.background = 'rgba(0,113,227,0.06)'; }}
          onMouseLeave={e => { e.target.style.background = 'transparent'; }}
        >
          {aiAvailable ? '模拟断开' : '恢复 AI'}
        </button>
      </div>
    </header>
  );
}
