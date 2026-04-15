import type { Category } from '../types/skill';

interface Props {
  categories: Category[];
  selected: string;
  onSelect: (cat: string) => void;
}

export default function Sidebar({ categories, selected, onSelect }: Props) {
  return (
    <aside className="w-52 shrink-0 hidden lg:block">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--fg-muted)] mb-3 px-2">分类</h3>
      <ul className="space-y-0.5">
        <li>
          <button
            onClick={() => onSelect('')}
            className={`cursor-pointer w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
              !selected
                ? 'bg-[var(--primary-light)] text-[var(--primary)] font-medium'
                : 'text-[var(--fg)] hover:bg-[var(--bg-alt)]'
            }`}
          >
            全部
          </button>
        </li>
        {categories.map((c) => (
          <li key={c.key}>
            <button
              onClick={() => onSelect(c.key)}
              className={`cursor-pointer w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex justify-between items-center ${
                selected === c.key
                  ? 'bg-[var(--primary-light)] text-[var(--primary)] font-medium'
                  : 'text-[var(--fg)] hover:bg-[var(--bg-alt)]'
              }`}
            >
              <span>{c.label}</span>
              <span className="text-xs text-[var(--fg-muted)]">{c.count}</span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
