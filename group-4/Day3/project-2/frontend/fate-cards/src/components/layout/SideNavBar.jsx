const menuItems = [
  { icon: 'auto_stories', label: '财运牌阵', key: 'draw' },
  { icon: 'photo_library', label: '历史战绩', key: 'gallery' },
];

export default function SideNavBar({ activePage, onNavigate }) {
  return (
    <aside className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 z-50 w-72 bg-slate-950/80 backdrop-blur-xl border-r border-white/10 shadow-[20px_0_50px_rgba(15,13,22,0.8)] pt-8 pb-6 px-6">
      {/* Logo 区 */}
      <div className="flex items-center gap-2 mb-2">
        <span className="material-symbols-outlined text-primary">auto_stories</span>
        <span className="font-headline text-xl font-bold text-primary">财富祭司</span>
      </div>

      {/* 业力指示 */}
      <p className="font-label text-xs text-on-surface-variant uppercase tracking-[0.2em] mb-8">
        当前财运：观察中
      </p>

      {/* 菜单项 */}
      <nav className="flex flex-col gap-1">
        {menuItems.map((item) => {
          const isActive = activePage === item.key;
          return (
            <div
              key={item.key}
              onClick={() => onNavigate?.(item.key)}
              className={
                'flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer ' +
                (isActive
                  ? 'bg-cyan-400/10 border-r-2 border-cyan-400 text-cyan-400'
                  : 'text-on-surface-variant hover:bg-white/5 hover:text-white')
              }
            >
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              <span className="font-label text-sm font-medium">{item.label}</span>
            </div>
          );
        })}
      </nav>

      {/* 底部按钮 */}
      <button
        type="button"
        onClick={() => onNavigate?.('gallery')}
        className="mt-auto w-full py-3 rounded-full border border-outline-variant/30 text-on-surface-variant font-label text-sm hover:bg-white/5 hover:text-white transition-all cursor-pointer"
      >
        查看历史报告
      </button>
    </aside>
  );
}
