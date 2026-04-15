export default function TopNavBar({ onNavigate, onHistory, onHome }) {
  const handleHistory = () => onHistory?.() ?? onNavigate?.('gallery');
  const handleHome = () => onHome?.() ?? onNavigate?.('draw');

  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/5">
      <div className="flex justify-between items-center px-6 py-4 md:pl-80">
        {/* Logo */}
        <button
          type="button"
          onClick={handleHome}
          className="text-2xl font-bold tracking-tighter text-purple-400 font-headline"
          style={{ filter: 'drop-shadow(0 0 8px rgba(223,142,255,0.6))' }}
          aria-label="返回选牌页"
        >
          财运神谕局
        </button>

        {/* 右侧图标区 */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleHome}
            className="material-symbols-outlined text-on-surface-variant hover:text-primary hover:scale-110 transition-transform cursor-pointer select-none"
            aria-label="返回仪式"
          >
            auto_fix_high
          </button>
          <button
            type="button"
            onClick={handleHistory}
            className="material-symbols-outlined text-on-surface-variant hover:text-primary hover:scale-110 transition-transform cursor-pointer select-none"
            aria-label="查看历史"
          >
            settings
          </button>
        </div>
      </div>
    </nav>
  );
}
