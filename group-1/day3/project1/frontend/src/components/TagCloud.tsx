import type { TagItem } from '../types/skill';

interface Props {
  tags: TagItem[];
  selected: string[];
  onToggle: (tag: string) => void;
}

export default function TagCloud({ tags, selected, onToggle }: Props) {
  if (!tags.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {tags.slice(0, 20).map((t) => {
        const active = selected.includes(t.tag);
        return (
          <button
            key={t.tag}
            onClick={() => onToggle(t.tag)}
            className={`cursor-pointer px-3 py-1 rounded-full text-xs font-medium transition-all border ${
              active
                ? 'bg-[var(--primary)] text-[var(--primary-fg)] border-[var(--primary)]'
                : 'bg-[var(--bg-alt)] text-[var(--fg-muted)] border-[var(--border)] hover:border-[var(--primary)] hover:text-[var(--primary)]'
            }`}
          >
            #{t.tag}
            <span className="ml-1 opacity-60">{t.count}</span>
          </button>
        );
      })}
    </div>
  );
}
