import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Star, Trophy } from 'lucide-react';
import type { SkillSummary } from '../types/skill';

interface Props {
  skills: SkillSummary[];
}

/* Category → cover image (Unsplash tech-themed, 560x400 crop) */
const CAT_IMAGES: Record<string, string> = {
  frontend:  'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=560&h=400&fit=crop',
  backend:   'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=560&h=400&fit=crop',
  devops:    'https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=560&h=400&fit=crop',
  'ai-ml':   'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=560&h=400&fit=crop',
  database:  'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=560&h=400&fit=crop',
  testing:   'https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=560&h=400&fit=crop',
  security:  'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=560&h=400&fit=crop',
  mobile:    'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=560&h=400&fit=crop',
  tools:     'https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=560&h=400&fit=crop',
  cloud:     'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=560&h=400&fit=crop',
};

const CAT_COLORS: Record<string, string> = {
  frontend: '#a855f7', backend: '#22d3ee', devops: '#fbbf24',
  'ai-ml': '#ec4899', database: '#34d399', testing: '#60a5fa',
  security: '#f87171', mobile: '#fb923c', tools: '#a78bfa', cloud: '#2dd4bf',
};

const fmt = (n: number) => (n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n));

export default function SkillCarousel({ skills }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);

  const scroll = (dir: number) => {
    ref.current?.scrollBy({ left: dir * 320, behavior: 'smooth' });
  };

  /* Duplicate cards for seamless infinite loop */
  const cards = [...skills, ...skills];
  const duration = skills.length * 4; // ~4s per card → smooth pace

  return (
    <section className="py-10 max-w-[1440px] mx-auto px-6">
      {/* Section header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-[var(--fg)] flex items-center gap-2">
            <Trophy size={20} className="text-[var(--gold)]" />
            Skill 排行榜
          </h2>
          <p className="text-sm text-[var(--fg-muted)] mt-1">探索社区最受欢迎的技能</p>
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

      {/* Infinite marquee track — pause on hover */}
      <div
        ref={ref}
        className="carousel-marquee-wrapper"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div
          className="carousel-marquee-track"
          style={{
            animationDuration: `${duration}s`,
            animationPlayState: paused ? 'paused' : 'running',
          }}
        >
        {cards.map((s, i) => {
          const c = CAT_COLORS[s.category] || '#8b5cf6';
          const img = CAT_IMAGES[s.category] || CAT_IMAGES.frontend;
          return (
            <Link key={`${s.skill_id}-${i}`} to={`/skills/${s.skill_id}`} className="carousel-card group">
              {/* Cover image */}
              <div className="aspect-[7/4] overflow-hidden relative">
                <img
                  src={img}
                  alt={s.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  loading="lazy"
                />
                {/* Dark overlay for readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                {/* Rank badge */}
                <div className="absolute top-3 left-3">
                  {i < 3 ? (
                    <span className="text-lg" style={{ filter: 'drop-shadow(0 0 6px rgba(251,191,36,0.6))' }}>
                      {['👑', '💎', '🏅'][i]}
                    </span>
                  ) : (
                    <span className="w-6 h-6 flex items-center justify-center rounded-full text-[10px] font-bold bg-black/50 backdrop-blur-sm text-white/80">
                      {i + 1}
                    </span>
                  )}
                </div>

                {/* Category badge */}
                <div className="absolute top-3 right-3">
                  <span
                    className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md backdrop-blur-sm"
                    style={{ background: `${c}cc`, color: '#fff' }}
                  >
                    {s.category}
                  </span>
                </div>

                {/* Rating */}
                <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-md">
                  <Star size={10} className="text-[var(--gold)] fill-[var(--gold)]" />
                  <span className="text-[11px] font-bold text-white">{s.rating_avg.toFixed(1)}</span>
                </div>
              </div>

              {/* Info */}
              <div className="p-4">
                <p className="text-sm font-semibold text-[var(--fg)] truncate group-hover:text-[var(--primary)] transition-colors">
                  {s.name}
                </p>
                <p className="text-xs text-[var(--fg-muted)] mt-1 line-clamp-1">{s.description}</p>
                <div className="flex items-center gap-3 text-[11px] text-[var(--fg-muted)] mt-2.5">
                  <span>🔥 {s.hot_score.toFixed(0)}</span>
                  <span>⬇ {fmt(s.download_count)}</span>
                  <span>❤ {fmt(s.like_count)}</span>
                </div>
              </div>
            </Link>
          );
        })}
        </div>
      </div>
    </section>
  );
}
