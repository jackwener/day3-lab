import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Download, ThumbsUp, Star, Eye, Sun, Moon, Loader2 } from 'lucide-react';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';
import StarRating from '../components/StarRating';
import { useTheme } from '../components/ThemeProvider';
import { fetchSkillDetail, downloadZip, likeSkill, unlikeSkill, favoriteSkill, unfavoriteSkill, rateSkill, getErrorMessage } from '../services/api';
import type { SkillDetail as SkillDetailType } from '../types/skill';

function Toast({ msg, onClose }: { msg: string; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className="toast fixed top-4 right-4 z-50 px-4 py-2 rounded-lg bg-[var(--bg-alt)] border border-[var(--border)] shadow-lg text-sm text-[var(--fg)]">
      {msg}
    </div>
  );
}

export default function SkillDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const contentRef = useRef<HTMLDivElement>(null);

  const [skill, setSkill] = useState<SkillDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  /* interaction states */
  const [liked, setLiked] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [favCount, setFavCount] = useState(0);
  const [ratingAvg, setRatingAvg] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);
  const [dlCount, setDlCount] = useState(0);

  /* ---- load detail ---- */
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchSkillDetail(id)
      .then((d) => {
        setSkill(d);
        setLikeCount(d.like_count);
        setFavCount(d.favorite_count);
        setRatingAvg(d.rating_avg);
        setRatingCount(d.rating_count);
        setDlCount(d.download_count);
      })
      .catch((e) => {
        const msg = getErrorMessage(e);
        if (msg === '技能不存在') setNotFound(true);
        else setToast(msg);
      })
      .finally(() => setLoading(false));
  }, [id]);

  /* ---- highlight code blocks ---- */
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.querySelectorAll('pre code').forEach((el) => {
        hljs.highlightElement(el as HTMLElement);
      });
    }
  }, [skill]);

  /* ---- optimistic interaction helpers ---- */
  const handleLike = useCallback(async () => {
    if (!id) return;
    const prev = { liked, likeCount };
    setLiked(!liked);
    setLikeCount(liked ? likeCount - 1 : likeCount + 1);
    try {
      const r = liked ? await unlikeSkill(id) : await likeSkill(id);
      setLiked(r.liked);
      setLikeCount(r.like_count);
    } catch (e) {
      setLiked(prev.liked);
      setLikeCount(prev.likeCount);
      setToast(getErrorMessage(e));
    }
  }, [id, liked, likeCount]);

  const handleFav = useCallback(async () => {
    if (!id) return;
    const prev = { favorited, favCount };
    setFavorited(!favorited);
    setFavCount(favorited ? favCount - 1 : favCount + 1);
    try {
      const r = favorited ? await unfavoriteSkill(id) : await favoriteSkill(id);
      setFavorited(r.favorited);
      setFavCount(r.favorite_count);
    } catch (e) {
      setFavorited(prev.favorited);
      setFavCount(prev.favCount);
      setToast(getErrorMessage(e));
    }
  }, [id, favorited, favCount]);

  const handleRate = useCallback(async (score: number) => {
    if (!id) return;
    try {
      const r = await rateSkill(id, score);
      setRatingAvg(r.rating_avg);
      setRatingCount(r.rating_count);
      setToast(`已评 ${score} 星`);
    } catch (e) {
      setToast(getErrorMessage(e));
    }
  }, [id]);

  const handleDownload = () => {
    if (!id) return;
    downloadZip(id);
    setDlCount((c) => c + 1);
  };

  /* ---- renders ---- */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--bg)]">
        <Loader2 className="animate-spin text-[var(--primary)]" size={32} />
      </div>
    );
  }

  if (notFound || !skill) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--bg)] text-center">
        <p className="text-5xl mb-4">🔍</p>
        <h2 className="text-xl font-bold text-[var(--fg)] mb-2">技能不存在</h2>
        <Link to="/" className="text-[var(--primary)] hover:underline mt-4">返回首页</Link>
      </div>
    );
  }

  const safeHtml = DOMPurify.sanitize(skill.skill_md_html);

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}

      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--bg)]/60 backdrop-blur-2xl">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <button onClick={() => navigate(-1)} className="cursor-pointer flex items-center gap-1 text-sm text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors">
            <ArrowLeft size={16} /> 返回
          </button>
          <button onClick={toggle} className="cursor-pointer p-2 rounded-lg hover:bg-[var(--bg-alt)] text-[var(--fg-muted)]">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      {/* Content */}
      <article className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-bold text-[var(--fg)] mb-3">{skill.name}</h1>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--fg-muted)] mb-4">
          <span className="px-2 py-0.5 rounded bg-[var(--primary-light)] text-[var(--primary)] text-xs font-medium">{skill.category}</span>
          <span>·</span>
          <span>{new Date(skill.updated_at).toLocaleDateString('zh-CN')}</span>
          {skill.tags.map((t) => (
            <span key={t} className="px-2 py-0.5 rounded-full bg-[var(--bg-alt)] border border-[var(--border)] text-xs">#{t}</span>
          ))}
        </div>

        {/* Interaction bar */}
        <div className="flex flex-wrap items-center gap-4 py-4 border-y border-[var(--border)] mb-6">
          <StarRating value={ratingAvg} count={ratingCount} interactive onChange={handleRate} />
          <span className="flex items-center gap-1 text-sm text-[var(--fg-muted)]"><Eye size={14} />{skill.view_count}</span>
          <span className="flex items-center gap-1 text-sm text-[var(--fg-muted)]"><Download size={14} />{dlCount}</span>

          <div className="flex items-center gap-2 ml-auto">
            {skill.has_bundle && (
              <button onClick={handleDownload}
                className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--primary)] text-[var(--primary-fg)] text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors">
                <Download size={14} /> 下载 ZIP
              </button>
            )}
            <button onClick={handleLike}
              className={`cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                liked ? 'bg-[var(--primary-light)] border-[var(--primary)] text-[var(--primary)]' : 'border-[var(--border)] text-[var(--fg)] hover:bg-[var(--bg-alt)]'
              }`}>
              <ThumbsUp size={14} /> {likeCount}
            </button>
            <button onClick={handleFav}
              className={`cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                favorited ? 'bg-[var(--primary-light)] border-[var(--primary)] text-[var(--primary)]' : 'border-[var(--border)] text-[var(--fg)] hover:bg-[var(--bg-alt)]'
              }`}>
              <Star size={14} /> {favCount}
            </button>
          </div>
        </div>

        {/* Markdown body */}
        <div
          ref={contentRef}
          className="markdown-body"
          dangerouslySetInnerHTML={{ __html: safeHtml }}
        />
      </article>
    </div>
  );
}
