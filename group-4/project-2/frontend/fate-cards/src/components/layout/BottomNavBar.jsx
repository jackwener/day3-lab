const navItems = [
  { icon: 'style', label: '财运牌阵', key: 'draw' },
  { icon: 'photo_library', label: '历史', key: 'gallery' },
];

export default function BottomNavBar({ activePage, onNavigate }) {
  if (!onNavigate) {
    return (
      <nav className="fixed bottom-0 left-0 w-full z-50 md:hidden bg-slate-950/60 backdrop-blur-md rounded-t-3xl border-t border-white/5 shadow-[0_-10px_30px_rgba(223,142,255,0.15)] px-6 py-3">
        <div className="flex justify-around">
          {navItems.map((item) => {
            const isActive = activePage === item.key;
            return (
              <div
                key={item.key}
                className={
                  'flex flex-col items-center transition-all ' +
                  (isActive
                    ? 'bg-purple-500/20 text-purple-300 rounded-2xl px-4 py-2'
                    : 'text-slate-500 px-4 py-2')
                }
              >
                <span className="material-symbols-outlined text-xl">{item.icon}</span>
                <span className="text-xs mt-1 font-label">{item.label}</span>
              </div>
            );
          })}
        </div>
      </nav>
    );
  }

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 md:hidden bg-slate-950/60 backdrop-blur-md rounded-t-3xl border-t border-white/5 shadow-[0_-10px_30px_rgba(223,142,255,0.15)] px-6 py-3">
      <div className="flex justify-around">
        {navItems.map((item) => {
          const isActive = activePage === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onNavigate?.(item.key)}
              className={
                'flex flex-col items-center cursor-pointer transition-all ' +
                (isActive
                  ? 'bg-purple-500/20 text-purple-300 rounded-2xl px-4 py-2'
                  : 'text-slate-500 hover:text-lime-300 px-4 py-2')
              }
            >
              <span className="material-symbols-outlined text-xl">{item.icon}</span>
              <span className="text-xs mt-1 font-label">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
