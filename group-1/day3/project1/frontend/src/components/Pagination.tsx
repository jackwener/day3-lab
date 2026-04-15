import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  page: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}

export default function Pagination({ page, total, pageSize, onChange }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const pages: (number | '...')[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }

  const btn = 'w-9 h-9 flex items-center justify-center rounded-lg text-sm transition-colors';

  return (
    <nav className="flex items-center justify-center gap-1 mt-8">
      <button disabled={page <= 1} onClick={() => onChange(page - 1)}
        className={`${btn} ${page <= 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-[var(--primary-light)] cursor-pointer'}`}>
        <ChevronLeft size={16} />
      </button>
      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`e${i}`} className="w-9 h-9 flex items-center justify-center text-[var(--fg-muted)]">…</span>
        ) : (
          <button key={p} onClick={() => onChange(p)}
            className={`${btn} cursor-pointer ${p === page ? 'bg-[var(--primary)] text-[var(--primary-fg)] font-semibold' : 'hover:bg-[var(--primary-light)]'}`}>
            {p}
          </button>
        )
      )}
      <button disabled={page >= totalPages} onClick={() => onChange(page + 1)}
        className={`${btn} ${page >= totalPages ? 'opacity-30 cursor-not-allowed' : 'hover:bg-[var(--primary-light)] cursor-pointer'}`}>
        <ChevronRight size={16} />
      </button>
      <span className="ml-3 text-xs text-[var(--fg-muted)]">共 {total} 项</span>
    </nav>
  );
}
