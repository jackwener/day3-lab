import { Link } from 'react-router-dom';
import { Flame, TrendingUp } from 'lucide-react';
import type { SkillSummary } from '../types/skill';

interface Props {
  skills: SkillSummary[];
}

const fmt = (n: number) => (n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n));

const RANK_ICONS = ['👑', '💎', '🏅'];
const RANK_GLOWS = [
  'drop-shadow(0 0 8px rgba(251,191,36,0.6))',
  'drop-shadow(0 0 6px rgba(96,165,250,0.5))',
  'drop-shadow(0 0 6px rgba(251,146,60,0.5))',
];

export default function HotRanking({ skills }: Props) {
  const top = skills.slice(0, 10);

  return (
    <div>
      {/* Header — clean, no background */}
      <div className="flex items-center justify-between px-1 mb-2">
        <div className="flex items-center gap-2">
          <Flame size={16} className="text-[var(--gold)]" />
          <h3 className="text-sm font-bold text-[var(--fg)]">Skill 热榜</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="pulse-dot" />
          <span className="text-[10px] font-semibold text-[var(--success)] uppercase tracking-wider">Live</span>
        </div>
      </div>

      {/* Items */}
      <div>
        {top.map((s, i) => (
          <Link
            key={s.skill_id}
            to={`/skills/${s.skill_id}`}
            className="flex items-center gap-3 px-1 py-2.5 rounded-xl hover:bg-[var(--bg-card-hover)] transition-all group"
          >
            {/* Rank: crown/diamond/medal for top 3, number for rest */}
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

            {/* Info */}
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-[var(--fg)] truncate group-hover:text-[var(--primary)] transition-colors leading-tight">
                {s.name}
              </p>
              <div className="flex items-center gap-2 text-[11px] text-[var(--fg-muted)] mt-0.5">
                <span>🔥 {s.hot_score.toFixed(0)}</span>
                <span>⭐ {s.rating_avg.toFixed(1)}</span>
                <span>⬇ {fmt(s.download_count)}</span>
              </div>
            </div>

            <TrendingUp size={13} className="shrink-0 opacity-0 group-hover:opacity-100 text-[var(--accent-cyan)] transition-all" />
          </Link>
        ))}
      </div>
    </div>
  );
}
