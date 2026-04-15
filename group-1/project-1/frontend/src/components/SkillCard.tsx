import { Link } from 'react-router-dom';
import { Eye, Download, ThumbsUp, Star } from 'lucide-react';
import type { SkillSummary } from '../types/skill';

interface Props {
  skill: SkillSummary;
}

const COVERS: Record<string, { bg: string; emoji: string }> = {
  frontend: { bg: 'linear-gradient(135deg, #a855f7, #6366f1)', emoji: '⚛️' },
  backend: { bg: 'linear-gradient(135deg, #06b6d4, #3b82f6)', emoji: '⚙️' },
  devops: { bg: 'linear-gradient(135deg, #f59e0b, #ef4444)', emoji: '🚀' },
  'ai-ml': { bg: 'linear-gradient(135deg, #ec4899, #8b5cf6)', emoji: '🧠' },
  database: { bg: 'linear-gradient(135deg, #10b981, #06b6d4)', emoji: '🗄️' },
  testing: { bg: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', emoji: '🧪' },
  security: { bg: 'linear-gradient(135deg, #ef4444, #f97316)', emoji: '🔐' },
  mobile: { bg: 'linear-gradient(135deg, #f97316, #ec4899)', emoji: '📱' },
  tools: { bg: 'linear-gradient(135deg, #8b5cf6, #6366f1)', emoji: '🛠️' },
  cloud: { bg: 'linear-gradient(135deg, #14b8a6, #3b82f6)', emoji: '☁️' },
};

const CAT_COLORS: Record<string, string> = {
  frontend: '#a855f7', backend: '#22d3ee', devops: '#fbbf24',
  'ai-ml': '#ec4899', database: '#34d399', testing: '#60a5fa',
  security: '#f87171', mobile: '#fb923c', tools: '#a78bfa', cloud: '#2dd4bf',
};

const fmt = (n: number) => (n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n));

export default function SkillCard({ skill }: Props) {
  const cover = COVERS[skill.category] || { bg: 'linear-gradient(135deg, #8b5cf6, #6366f1)', emoji: '📦' };
  const c = CAT_COLORS[skill.category] || '#8b5cf6';

  return (
    <Link
      to={`/skills/${skill.skill_id}`}
      className="glass-card gradient-border block overflow-hidden group"
    >
      <div className="p-5">
        {/* Icon + Category + Rating */}
        <div className="flex items-start gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
            style={{ background: cover.bg }}
          >
            {cover.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span
                className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
                style={{ background: `${c}18`, color: c }}
              >
                {skill.category}
              </span>
              <span className="flex items-center gap-1 text-xs font-bold text-[var(--gold)]">
                ⭐ {skill.rating_avg > 0 ? skill.rating_avg.toFixed(1) : '-'}
              </span>
            </div>
            <h3 className="text-sm font-bold text-[var(--fg)] mt-1.5 truncate group-hover:text-[var(--primary)] transition-colors">
              {skill.name}
            </h3>
          </div>
        </div>

        {/* Description */}
        <p className="text-[13px] text-[var(--fg-muted)] mb-3 line-clamp-2 leading-relaxed">
          {skill.description}
        </p>

        {/* Tags */}
        {skill.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {skill.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--bg-alt)] text-[var(--fg-muted)] border border-[var(--border)] font-medium"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-3 text-[11px] text-[var(--fg-muted)] pt-3 border-t border-[var(--border)]">
          <span className="flex items-center gap-1 stat-glow"><Eye size={12} />{fmt(skill.view_count)}</span>
          <span className="flex items-center gap-1 stat-glow"><Download size={12} />{fmt(skill.download_count)}</span>
          <span className="flex items-center gap-1 stat-glow"><ThumbsUp size={12} />{skill.like_count}</span>
          <span className="flex items-center gap-1 stat-glow"><Star size={12} />{skill.favorite_count}</span>
        </div>
      </div>
    </Link>
  );
}
