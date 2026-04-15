import { Link, useNavigate } from 'react-router-dom';
import { Plus, Upload, Sun, Moon, Zap } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export default function Header() {
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-4 px-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#8b5cf6] to-[#22d3ee] flex items-center justify-center shadow-[0_2px_12px_rgba(139,92,246,0.3)] group-hover:shadow-[0_2px_20px_rgba(139,92,246,0.5)] transition-shadow">
            <Zap size={16} className="text-white" />
          </div>
          <span className="text-lg font-extrabold tracking-tight gradient-text">SkillHub</span>
        </Link>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Nav Links */}
        <nav className="hidden md:flex items-center gap-1 text-sm">
          <Link to="/"
            className="px-3 py-1.5 rounded-lg text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-card)] transition-all">
            探索
          </Link>
          <Link to="/create"
            className="px-3 py-1.5 rounded-lg text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-card)] transition-all">
            新建
          </Link>
          <Link to="/upload"
            className="px-3 py-1.5 rounded-lg text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-card)] transition-all">
            上传
          </Link>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => navigate('/create')}
            className="cursor-pointer md:hidden flex items-center gap-1.5 rounded-xl bg-[var(--primary)] px-3.5 py-1.5 text-sm font-semibold text-[var(--primary-fg)] hover:bg-[var(--primary-hover)] shadow-[0_2px_12px_rgba(124,58,237,0.3)] transition-all">
            <Plus size={14} />
          </button>
          <button onClick={() => navigate('/upload')}
            className="cursor-pointer md:hidden flex items-center gap-1.5 rounded-xl border border-[var(--border)] px-3.5 py-1.5 text-sm font-medium text-[var(--fg)] hover:bg-[var(--bg-card-hover)] transition-all">
            <Upload size={14} />
          </button>
          <a href="https://github.com" target="_blank" rel="noopener noreferrer"
            className="p-2 rounded-xl hover:bg-[var(--bg-card)] text-[var(--fg-muted)] hover:text-[var(--fg)] transition-all">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
          </a>
          <button onClick={toggle} title="切换主题"
            className="cursor-pointer p-2 rounded-xl hover:bg-[var(--bg-card)] text-[var(--fg-muted)] hover:text-[var(--fg)] transition-all">
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </div>
      </div>
    </header>
  );
}
