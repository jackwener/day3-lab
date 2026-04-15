import { useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Hash } from 'lucide-react';
import type { TagItem, SkillSummary } from '../types/skill';

interface Props {
  tags: TagItem[];
  skills: SkillSummary[];
}

/* Official logos via Simple Icons CDN (colored for dark bg) */
const TAG_META: Record<string, { logo: string; label: string; color: string }> = {
  react:    { logo: 'https://cdn.simpleicons.org/react/61dafb',       label: 'React',        color: '#61dafb' },
  typescript:{ logo: 'https://cdn.simpleicons.org/typescript/3178c6', label: 'TypeScript',   color: '#3178c6' },
  python:   { logo: 'https://cdn.simpleicons.org/python/3776ab',      label: 'Python',       color: '#3776ab' },
  docker:   { logo: 'https://cdn.simpleicons.org/docker/2496ed',      label: 'Docker',       color: '#2496ed' },
  nextjs:   { logo: 'https://cdn.simpleicons.org/nextdotjs/ffffff',   label: 'Next.js',      color: '#ffffff' },
  vue:      { logo: 'https://cdn.simpleicons.org/vuedotjs/4fc08d',    label: 'Vue',          color: '#4fc08d' },
  rust:     { logo: 'https://cdn.simpleicons.org/rust/dea584',        label: 'Rust',         color: '#dea584' },
  go:       { logo: 'https://cdn.simpleicons.org/go/00add8',          label: 'Go',           color: '#00add8' },
  graphql:  { logo: 'https://cdn.simpleicons.org/graphql/e10098',     label: 'GraphQL',      color: '#e10098' },
  redis:    { logo: 'https://cdn.simpleicons.org/redis/dc382d',       label: 'Redis',        color: '#dc382d' },
  mongodb:  { logo: 'https://cdn.simpleicons.org/mongodb/47a248',     label: 'MongoDB',      color: '#47a248' },
  aws:      { logo: 'https://cdn.simpleicons.org/amazonaws/ff9900',   label: 'AWS',          color: '#ff9900' },
  kubernetes:{ logo: 'https://cdn.simpleicons.org/kubernetes/326ce5', label: 'Kubernetes',   color: '#326ce5' },
  terraform:{ logo: 'https://cdn.simpleicons.org/terraform/7b42bc',  label: 'Terraform',    color: '#7b42bc' },
  tailwind: { logo: 'https://cdn.simpleicons.org/tailwindcss/06b6d4', label: 'Tailwind CSS', color: '#06b6d4' },
  node:     { logo: 'https://cdn.simpleicons.org/nodedotjs/339933',   label: 'Node.js',      color: '#339933' },
  'ci-cd':  { logo: 'https://cdn.simpleicons.org/githubactions/2088ff', label: 'CI/CD',      color: '#2088ff' },
  performance:      { logo: '', label: '性能优化', color: '#fbbf24' },
  'design-patterns':{ logo: '', label: '设计模式', color: '#a855f7' },
  microservices:    { logo: '', label: '微服务',   color: '#22d3ee' },
};

const FALLBACK_EMOJIS: Record<string, string> = {
  performance: '⚡',
  'design-patterns': '🧩',
  microservices: '🔗',
};

export default function TagCarousel({ tags, skills }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  /* For each tag, find the top skill (highest hot_score) */
  const tagToSkill = useMemo(() => {
    const map: Record<string, SkillSummary> = {};
    const sorted = [...skills].sort((a, b) => b.hot_score - a.hot_score);
    for (const t of tags) {
      const found = sorted.find((s) => s.tags.includes(t.tag));
      if (found) map[t.tag] = found;
    }
    return map;
  }, [tags, skills]);

  const scroll = (dir: number) => {
    ref.current?.scrollBy({ left: dir * 300, behavior: 'smooth' });
  };

  const handleClick = (tag: string) => {
    const skill = tagToSkill[tag];
    if (skill) navigate(`/skills/${skill.skill_id}`);
  };

  return (
    <section className="py-10 max-w-[1440px] mx-auto px-6">
      {/* Section header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-[var(--fg)] flex items-center gap-2">
            <Hash size={20} className="text-[var(--primary)]" />
            热门标签
          </h2>
          <p className="text-sm text-[var(--fg-muted)] mt-1">探索热门技术标签，点击发现最佳 Skill</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => scroll(-1)}
            className="cursor-pointer w-9 h-9 rounded-full bg-[var(--bg-card)] border border-[var(--border)] flex items-center justify-center text-[var(--fg-muted)] hover:text-[var(--fg)] hover:border-[var(--border-hover)] transition-all"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => scroll(1)}
            className="cursor-pointer w-9 h-9 rounded-full bg-[var(--bg-card)] border border-[var(--border)] flex items-center justify-center text-[var(--fg-muted)] hover:text-[var(--fg)] hover:border-[var(--border-hover)] transition-all"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Scrollable track */}
      <div ref={ref} className="carousel-track">
        {tags.map((t) => {
          const meta = TAG_META[t.tag] || { logo: '', label: t.tag, color: '#8b5cf6' };
          const topSkill = tagToSkill[t.tag];
          const emoji = FALLBACK_EMOJIS[t.tag];

          return (
            <div
              key={t.tag}
              onClick={() => handleClick(t.tag)}
              className="carousel-card group cursor-pointer"
            >
              {/* Logo area with soft glow */}
              <div
                className="h-32 flex items-center justify-center relative overflow-hidden"
                style={{ background: `radial-gradient(circle at 50% 60%, ${meta.color}15, transparent 70%)` }}
              >
                {meta.logo ? (
                  <img
                    src={meta.logo}
                    alt={meta.label}
                    className="w-14 h-14 object-contain group-hover:scale-110 transition-transform duration-500"
                    loading="lazy"
                  />
                ) : (
                  <span className="text-4xl group-hover:scale-110 transition-transform duration-500">
                    {emoji || '#'}
                  </span>
                )}
                {/* Hover glow */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-40 transition-opacity duration-500"
                  style={{ background: `radial-gradient(circle at 50% 80%, ${meta.color}50, transparent 60%)` }}
                />
              </div>

              {/* Info */}
              <div className="px-4 py-3 border-t border-[var(--border)]">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-[var(--fg)] group-hover:text-[var(--primary)] transition-colors">
                    {meta.label}
                  </p>
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-md"
                    style={{ background: `${meta.color}18`, color: meta.color }}
                  >
                    {t.count}
                  </span>
                </div>
                {topSkill && (
                  <p className="text-[11px] text-[var(--fg-muted)] truncate mt-1.5">
                    🏆 {topSkill.name}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
