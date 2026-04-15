import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Sparkles, X, Zap, ArrowRight } from 'lucide-react';
import Header from '../components/Header';
import HotRanking from '../components/HotRanking';
import AuthorRanking from '../components/AuthorRanking';
import SkillCard from '../components/SkillCard';
import TagCloud from '../components/TagCloud';
import Pagination from '../components/Pagination';
import SkillCarousel from '../components/SkillCarousel';
import { fetchSkills, fetchTags, fetchCategories, smartSearch, getErrorMessage } from '../services/api';
import { SORT_OPTIONS, DEFAULT_FILTERS } from '../types/skill';
import { mockSkills, mockAuthors } from '../data/mockData';
import type { SkillSummary, TagItem, Category, SortOption, SearchMode } from '../types/skill';

/* ---------- Particle positions ---------- */
const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  left: `${(i * 17 + 7) % 100}%`,
  delay: `${(i * 0.7) % 6}s`,
  duration: `${5 + (i % 5) * 2}s`,
  size: `${1.5 + (i % 3)}px`,
}));

/* ---------- Aggregate stats ---------- */
function useStats() {
  return useMemo(() => {
    const totalSkills = mockSkills.length;
    const totalLikes = mockSkills.reduce((s, k) => s + k.like_count, 0);
    const totalDownloads = mockSkills.reduce((s, k) => s + k.download_count, 0);
    const fmt = (n: number) => n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n);
    return [
      { label: 'Skills', value: fmt(totalSkills), icon: '📦' },
      { label: 'Stars', value: fmt(totalLikes), icon: '⭐' },
      { label: 'Downloads', value: fmt(totalDownloads), icon: '⬇️' },
    ];
  }, []);
}

export default function SkillList() {
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState<SkillSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [smartFallback, setSmartFallback] = useState(false);
  const [smartLoading, setSmartLoading] = useState(false);
  const mountRef = useRef(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const stats = useStats();

  const hotSkills = useMemo(() => [...mockSkills].sort((a, b) => b.hot_score - a.hot_score), []);

  /* ---- URL filters ---- */
  const category = params.get('category') || '';
  const selectedTags = params.get('tags') ? params.get('tags')!.split(',') : [];
  const sort = (params.get('sort') || DEFAULT_FILTERS.sort) as SortOption;
  const page = Number(params.get('page')) || 1;
  const pageSize = 12;
  const q = params.get('q') || '';
  const mode = (params.get('mode') || 'keyword') as SearchMode;

  /* local search state */
  const [input, setInput] = useState(q);
  const [searchMode, setSearchMode] = useState<SearchMode>(mode);
  useEffect(() => { setInput(q); }, [q]);
  useEffect(() => { setSearchMode(mode); }, [mode]);

  const setFilter = useCallback((updates: Record<string, string>) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      Object.entries(updates).forEach(([k, v]) => {
        if (v) next.set(k, v); else next.delete(k);
      });
      if (!updates.page) next.set('page', '1');
      return next;
    });
  }, [setParams]);

  const handleSearch = useCallback((val: string, m: SearchMode) => {
    setFilter({ q: val, mode: m });
  }, [setFilter]);

  const handleInput = useCallback((val: string) => {
    setInput(val);
    if (searchMode === 'keyword') {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => handleSearch(val, 'keyword'), 300);
    }
  }, [searchMode, handleSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(input, searchMode);
  };

  const toggleMode = () => {
    const next: SearchMode = searchMode === 'keyword' ? 'smart' : 'keyword';
    setSearchMode(next);
    if (next === 'keyword' && input) handleSearch(input, 'keyword');
  };

  /* ---- fetch meta ---- */
  useEffect(() => {
    fetchTags().then((r) => setTags(r.items)).catch(() => {});
    fetchCategories().then((r) => setCategories(r.items)).catch(() => {});
    return () => { mountRef.current = false; };
  }, []);

  /* ---- fetch skills ---- */
  useEffect(() => {
    let cancelled = false;
    if (mode === 'smart' && q) {
      setSmartLoading(true);
      setSmartFallback(false);
      smartSearch(q)
        .then((r) => { if (!cancelled) { setItems(r.items); setTotal(r.items.length); setSmartFallback(r.fallback); } })
        .catch((e) => { if (!cancelled) setError(getErrorMessage(e)); })
        .finally(() => { if (!cancelled) { setSmartLoading(false); setLoading(false); } });
      return () => { cancelled = true; };
    }
    setLoading(true);
    const p: Record<string, string> = { sort, page: String(page), page_size: String(pageSize) };
    if (category) p.category = category;
    if (selectedTags.length) p.tags = selectedTags.join(',');
    if (q) p.q = q;
    fetchSkills(p)
      .then((r) => { if (!cancelled) { setItems(r.items); setTotal(r.total); setError(null); } })
      .catch((e) => { if (!cancelled) setError(getErrorMessage(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, selectedTags.join(','), sort, page, q, mode]);

  const handleTagToggle = (tag: string) => {
    const next = selectedTags.includes(tag) ? selectedTags.filter((t) => t !== tag) : [...selectedTags, tag];
    setFilter({ tags: next.join(',') });
  };

  const Skeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="glass-card p-5 space-y-3 !transform-none">
          <div className="skeleton h-4 w-20" />
          <div className="skeleton h-5 w-3/4" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-3 w-1/2 mt-3" />
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Header />

      {/* ============ HERO ============ */}
      <section className="hero-section border-b border-[var(--border)] -mt-14 pt-14">
        {/* Decorative layers */}
        <div className="hero-orb-1" />
        <div className="hero-orb-2" />
        <div className="hero-orb-3" />
        <div className="hero-beam" />
        <div className="hero-beam-2" />
        <div className="hero-grid" />
        <div className="hero-particles">
          {PARTICLES.map((p, i) => (
            <span key={i} style={{
              left: p.left, bottom: '-4px',
              width: p.size, height: p.size,
              animationDelay: p.delay, animationDuration: p.duration,
            }} />
          ))}
        </div>

        <div className="relative mx-auto max-w-3xl px-6 pt-16 pb-10 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-card shimmer text-xs text-[var(--fg-muted)] mb-6 !transform-none">
            <Zap size={12} className="text-[var(--primary)]" />
            Agent Skills 市场
            <ArrowRight size={12} />
          </div>

          {/* Title */}
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-4 leading-tight">
            <span className="gradient-text-animated">发现、创建、分享</span>
            <br />
            <span className="text-[var(--fg)]">你的 Agent Skills</span>
          </h1>

          <p className="text-base text-[var(--fg-muted)] mb-8 max-w-xl mx-auto leading-relaxed">
            语义搜索 + 一键安装，赋能每一位开发者
          </p>

          {/* ===== BIG SEARCH ===== */}
          <form onSubmit={handleSubmit} className="search-hero relative max-w-2xl mx-auto flex items-center px-5 py-3.5">
            <button type="button" onClick={toggleMode}
              title={searchMode === 'keyword' ? '切换到智能搜索' : '切换到关键词搜索'}
              className={`cursor-pointer shrink-0 mr-3 p-1 rounded-lg transition-all ${
                searchMode === 'smart'
                  ? 'text-[var(--primary)] bg-[var(--primary-light)] scale-110'
                  : 'text-[var(--fg-muted)] hover:text-[var(--fg)]'
              }`}>
              {searchMode === 'smart' ? <Sparkles size={20} /> : <Search size={20} />}
            </button>
            <input
              value={input}
              onChange={(e) => handleInput(e.target.value)}
              placeholder={searchMode === 'smart' ? '用自然语言描述你想要的技能…' : '搜索技能、标签、作者…'}
              maxLength={200}
              className="flex-1 bg-transparent text-[var(--fg)] text-base placeholder:text-[var(--fg-muted)] focus:outline-none"
            />
            {input && (
              <button type="button" onClick={() => { setInput(''); handleSearch('', searchMode); }}
                className="cursor-pointer shrink-0 p-1 mr-2 text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors">
                <X size={16} />
              </button>
            )}
            <button type="submit"
              className="cursor-pointer shrink-0 px-5 py-2 rounded-xl bg-[var(--primary)] text-[var(--primary-fg)] text-sm font-semibold hover:bg-[var(--primary-hover)] glow-breathe transition-all">
              搜索
            </button>
          </form>

          {/* ===== STATS ===== */}
          <div className="flex items-center justify-center gap-4 mt-8 mb-6">
            {stats.map((s, i) => (
              <div key={i} className="hero-stat glass-card !transform-none px-5 py-2.5 flex items-center gap-2">
                <span className="text-sm">{s.icon}</span>
                <span className="font-bold text-[var(--fg)]">{s.value}</span>
                <span className="text-xs text-[var(--fg-muted)]">{s.label}</span>
              </div>
            ))}
            <button className="cursor-pointer px-4 py-2 rounded-full bg-[var(--success)]/15 text-[var(--success)] text-xs font-semibold hover:bg-[var(--success)]/25 transition-colors">
              ▶ Playground
            </button>
          </div>

          {/* ===== CATEGORIES ===== */}
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <button onClick={() => setFilter({ category: '' })}
              className={`cursor-pointer px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                !category
                  ? 'bg-[var(--primary)] text-[var(--primary-fg)] shadow-[0_2px_12px_rgba(139,92,246,0.35)]'
                  : 'glass-card !transform-none text-[var(--fg-muted)] hover:text-[var(--fg)]'
              }`}>
              全部
            </button>
            {categories.map((c) => (
              <button key={c.key} onClick={() => setFilter({ category: c.key })}
                className={`cursor-pointer px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                  category === c.key
                    ? 'bg-[var(--primary)] text-[var(--primary-fg)] shadow-[0_2px_12px_rgba(139,92,246,0.35)]'
                    : 'glass-card !transform-none text-[var(--fg-muted)] hover:text-[var(--fg)]'
                }`}>
                {c.label}
                <span className="ml-1.5 opacity-50">{c.count}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Neon separator */}
      <div className="neon-line" />

      {/* ============ 3-COLUMN CONTENT ============ */}
      <div className="mx-auto max-w-[1440px] px-6 py-8 flex gap-6">
        {/* Left sidebar: rankings stacked, separated by vertical line */}
        <aside className="w-[260px] shrink-0 hidden xl:block border-r border-[var(--border)] pr-5">
          <div className="sticky top-20">
            <HotRanking skills={hotSkills} />
            <AuthorRanking authors={mockAuthors} />
          </div>
        </aside>

        <main className="flex-1 min-w-0">
          {/* Sort row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1.5">
              {SORT_OPTIONS.map((o) => (
                <button key={o.value} onClick={() => setFilter({ sort: o.value })}
                  className={`cursor-pointer px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    sort === o.value
                      ? 'bg-[var(--primary-light)] text-[var(--primary)] font-semibold'
                      : 'text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-card)]'
                  }`}>
                  {o.icon} {o.label}
                </button>
              ))}
            </div>
            <span className="text-[11px] text-[var(--fg-muted)]">{total} 个技能</span>
          </div>

          {smartFallback && (
            <div className="mb-4 px-3 py-2 rounded-xl glass-card !transform-none text-xs text-[var(--warning)] border-[var(--warning)]/20">
              ⚠️ AI 暂不可用，已使用关键词兜底
            </div>
          )}

          {tags.length > 0 && (
            <div className="mb-5">
              <TagCloud tags={tags} selected={selectedTags} onToggle={handleTagToggle} />
            </div>
          )}

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl glass-card !transform-none text-[var(--danger)] text-xs border-[var(--danger)]/20">
              {error}
            </div>
          )}

          {loading || smartLoading ? <Skeleton /> : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-5xl mb-4">🔍</p>
              <p className="text-[var(--fg-muted)] mb-4 text-sm">没有找到匹配的技能</p>
              <button onClick={() => setParams({})}
                className="cursor-pointer px-4 py-2 rounded-xl bg-[var(--primary)] text-[var(--primary-fg)] text-xs font-medium hover:bg-[var(--primary-hover)] transition-colors">
                清空筛选
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {items.map((s, i) => (
                  <div key={s.skill_id} className="fade-up" style={{ animationDelay: `${i * 50}ms` }}>
                    <SkillCard skill={s} />
                  </div>
                ))}
              </div>
              <Pagination page={page} total={total} pageSize={pageSize}
                onChange={(p) => setFilter({ page: String(p) })} />
            </>
          )}
        </main>
      </div>

      {/* Bottom carousel — skill ranking */}
      <div className="neon-line" />
      <SkillCarousel skills={hotSkills} />
    </div>
  );
}
