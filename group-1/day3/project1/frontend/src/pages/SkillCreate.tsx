import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Sparkles, Loader2 } from 'lucide-react';
import { createSkill, generateDraft, fetchCategories, getErrorMessage } from '../services/api';
import type { Category } from '../types/skill';

function Toast({ msg, onClose }: { msg: string; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className="toast fixed top-4 right-4 z-50 px-4 py-2 rounded-lg bg-[var(--bg-alt)] border border-[var(--border)] shadow-lg text-sm text-[var(--fg)]">
      {msg}
    </div>
  );
}

export default function SkillCreate() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);

  /* form fields */
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [skillMd, setSkillMd] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  /* submit state */
  const [submitting, setSubmitting] = useState(false);

  /* LLM draft state */
  const [intent, setIntent] = useState('');
  const [draftLoading, setDraftLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    fetchCategories().then((r) => setCategories(r.items)).catch(() => {});
  }, []);

  /* cooldown timer */
  useEffect(() => {
    if (cooldown > 0) {
      cooldownRef.current = setInterval(() => setCooldown((c) => c - 1), 1000);
      return () => clearInterval(cooldownRef.current);
    }
  }, [cooldown > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---- tag chip input ---- */
  const handleTagKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault();
      const t = tagInput.trim().replace(/,/g, '');
      if (t && tags.length < 6 && !tags.includes(t)) setTags([...tags, t]);
      setTagInput('');
    } else if (e.key === 'Backspace' && !tagInput && tags.length) {
      setTags(tags.slice(0, -1));
    }
  };

  /* ---- validation ---- */
  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = '请输入名称';
    else if (name.length > 80) errs.name = '名称不超过 80 字';
    if (!category) errs.category = '请选择分类';
    if (!description.trim()) errs.description = '请输入描述';
    else if (description.length > 200) errs.description = '描述不超过 200 字';
    if (!skillMd.trim()) errs.skillMd = '请输入 Markdown 内容';
    else if (skillMd.length > 10000) errs.skillMd = '内容不超过 10000 字';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  /* ---- LLM draft ---- */
  const handleDraft = useCallback(async () => {
    if (intent.length < 10 || cooldown > 0 || draftLoading) return;
    setDraftLoading(true);
    try {
      const r = await generateDraft(intent, category || undefined);
      if (skillMd && !window.confirm('当前已有内容，是否覆盖？')) return;
      setSkillMd(r.skill_md_draft);
      if (r.fallback) setToast('AI 暂不可用，已使用模板草稿');
    } catch (e) {
      setToast(getErrorMessage(e));
    } finally {
      setDraftLoading(false);
      setCooldown(5);
    }
  }, [intent, category, cooldown, draftLoading, skillMd]);

  /* ---- submit ---- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const r = await createSkill({ name: name.trim(), category, description: description.trim(), skill_md: skillMd, tags });
      navigate(`/skills/${r.skill_id}`);
    } catch (e) {
      setToast(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  const fieldCls = (field: string) =>
    `w-full rounded-lg border bg-[var(--bg-alt)] px-3 py-2 text-sm text-[var(--fg)] placeholder:text-[var(--fg-muted)] focus:outline-none transition-colors ${
      errors[field] ? 'border-[var(--danger)]' : 'border-[var(--border)] focus:border-[var(--primary)]'
    }`;

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}

      {/* Top */}
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--bg)]/60 backdrop-blur-2xl">
        <div className="mx-auto flex h-14 max-w-3xl items-center px-4">
          <Link to="/" className="flex items-center gap-1 text-sm text-[var(--fg-muted)] hover:text-[var(--fg)]">
            <ArrowLeft size={16} /> 返回列表
          </Link>
          <h1 className="ml-4 text-base font-bold text-[var(--fg)]">新建技能</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        {/* LLM assist */}
        <div className="rounded-xl border border-dashed border-[var(--primary)] bg-[var(--primary-light)] p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-[var(--primary)] mb-2">
            <Sparkles size={16} /> AI 协助生成草稿
          </div>
          <div className="flex gap-2">
            <input value={intent} onChange={(e) => setIntent(e.target.value)}
              placeholder="描述你的 skill 用途（≥10 字）"
              className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--fg)] placeholder:text-[var(--fg-muted)] focus:outline-none focus:border-[var(--primary)]" />
            <button type="button" onClick={handleDraft}
              disabled={intent.length < 10 || cooldown > 0 || draftLoading}
              className="cursor-pointer px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-fg)] text-sm font-medium hover:bg-[var(--primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5">
              {draftLoading ? <><Loader2 size={14} className="animate-spin" /> 生成中…</> : cooldown > 0 ? `${cooldown}s` : '生成草稿'}
            </button>
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-[var(--fg)] mb-1">名称 <span className="text-[var(--danger)]">*</span></label>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className={fieldCls('name')} placeholder="技能名称" />
          {errors.name && <p className="text-xs text-[var(--danger)] mt-1">{errors.name}</p>}
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-[var(--fg)] mb-1">分类 <span className="text-[var(--danger)]">*</span></label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={fieldCls('category')}>
            <option value="">请选择分类</option>
            {categories.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
          {errors.category && <p className="text-xs text-[var(--danger)] mt-1">{errors.category}</p>}
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-[var(--fg)] mb-1">标签（最多 6 个）</label>
          <div className="flex flex-wrap gap-1.5 p-2 rounded-lg border border-[var(--border)] bg-[var(--bg-alt)] min-h-[38px]">
            {tags.map((t) => (
              <span key={t} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--primary-light)] text-[var(--primary)] text-xs">
                #{t}
                <button type="button" onClick={() => setTags(tags.filter((x) => x !== t))} className="cursor-pointer hover:text-[var(--danger)]">×</button>
              </span>
            ))}
            {tags.length < 6 && (
              <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={handleTagKey}
                placeholder={tags.length === 0 ? '输入标签后回车' : ''} className="flex-1 min-w-[80px] bg-transparent text-sm text-[var(--fg)] outline-none" />
            )}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-[var(--fg)] mb-1">描述 <span className="text-[var(--danger)]">*</span></label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={200} rows={2} className={fieldCls('description')} placeholder="简要描述技能用途" />
          {errors.description && <p className="text-xs text-[var(--danger)] mt-1">{errors.description}</p>}
        </div>

        {/* Skill MD */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-[var(--fg)]">Skill.md <span className="text-[var(--danger)]">*</span></label>
            <button type="button" onClick={() => setPreview(!preview)} className="cursor-pointer text-xs text-[var(--primary)] hover:underline">
              {preview ? '编辑' : '预览'}
            </button>
          </div>
          {preview ? (
            <div className="markdown-body rounded-lg border border-[var(--border)] bg-[var(--bg-alt)] p-4 min-h-[200px] text-sm"
              dangerouslySetInnerHTML={{ __html: skillMd }} />
          ) : (
            <textarea value={skillMd} onChange={(e) => setSkillMd(e.target.value)} rows={12} className={fieldCls('skillMd')} placeholder="支持 Markdown 格式" />
          )}
          {errors.skillMd && <p className="text-xs text-[var(--danger)] mt-1">{errors.skillMd}</p>}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => navigate('/')}
            className="cursor-pointer px-6 py-2.5 rounded-lg border border-[var(--border)] text-sm text-[var(--fg)] hover:bg-[var(--bg-alt)] transition-colors">
            取消
          </button>
          <button type="submit" disabled={submitting}
            className="cursor-pointer px-6 py-2.5 rounded-lg bg-[var(--primary)] text-[var(--primary-fg)] text-sm font-medium hover:bg-[var(--primary-hover)] disabled:opacity-50 transition-colors flex items-center gap-1.5">
            {submitting ? <><Loader2 size={14} className="animate-spin" /> 提交中…</> : '保存'}
          </button>
        </div>
      </form>
    </div>
  );
}
