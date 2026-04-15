import { Trophy, Heart } from 'lucide-react';
import type { Author } from '../data/mockData';

interface Props {
  authors: Author[];
}

const RANK_ICONS = ['👑', '💎', '🏅'];
const RANK_GLOWS = [
  'drop-shadow(0 0 8px rgba(251,191,36,0.6))',
  'drop-shadow(0 0 6px rgba(96,165,250,0.5))',
  'drop-shadow(0 0 6px rgba(251,146,60,0.5))',
];

export default function AuthorRanking({ authors }: Props) {
  return (
    <div>
      {/* Header — separated from HotRanking by a neon line */}
      <div className="neon-line my-4" />
      <div className="flex items-center gap-2 px-1 mb-2">
        <Trophy size={16} className="text-[var(--gold)]" />
        <h3 className="text-sm font-bold text-[var(--fg)]">作者排行榜</h3>
      </div>

      {/* Items */}
      <div>
        {authors.slice(0, 10).map((a, i) => (
          <div
            key={a.name}
            className="flex items-center gap-3 px-1 py-2.5 rounded-xl hover:bg-[var(--bg-card-hover)] transition-all group cursor-default"
          >
            {/* Rank */}
            {i < 3 ? (
              <span
                className="w-7 flex items-center justify-center shrink-0 text-lg leading-none"
                style={{ filter: RANK_GLOWS[i] }}
              >
                {RANK_ICONS[i]}
              </span>
            ) : (
              <span className="w-7 h-7 flex items-center justify-center rounded-full text-[11px] font-bold shrink-0 bg-[rgba(139,92,246,0.08)] text-[var(--fg-muted)]">
                {i + 1}
              </span>
            )}

            {/* Avatar */}
            <span className="text-lg shrink-0">{a.avatar}</span>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-[var(--fg)] truncate group-hover:text-[var(--primary)] transition-colors leading-tight">
                {a.name}
              </p>
              <div className="flex items-center gap-2 text-[11px] text-[var(--fg-muted)] mt-0.5">
                <span>{a.skill_count} skills</span>
                <span className="flex items-center gap-0.5 group-hover:text-[var(--accent-cyan)] transition-colors">
                  <Heart size={9} />{a.total_likes >= 1000 ? (a.total_likes / 1000).toFixed(1) + 'k' : a.total_likes}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
