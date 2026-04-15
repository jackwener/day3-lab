import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Upload, FileArchive, Loader2, X } from 'lucide-react';
import { uploadZip, getErrorMessage } from '../services/api';

function Toast({ msg, onClose }: { msg: string; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className="toast fixed top-4 right-4 z-50 px-4 py-2 rounded-lg bg-[var(--bg-alt)] border border-[var(--border)] shadow-lg text-sm text-[var(--fg)]">
      {msg}
    </div>
  );
}

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export default function SkillUpload() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const validateFile = (f: File): string | null => {
    if (!f.name.endsWith('.zip')) return '请选择 .zip 文件';
    if (f.size > MAX_SIZE) return '压缩包超过 10MB，请精简后重试';
    return null;
  };

  const handleFile = useCallback((f: File) => {
    const err = validateFile(f);
    if (err) { setError(err); setFile(null); return; }
    setError(null);
    setFile(f);
    setProgress(0);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setProgress(0);
    setError(null);
    try {
      const r = await uploadZip(file, setProgress);
      navigate(`/skills/${r.skill_id}`);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}

      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--bg)]/60 backdrop-blur-2xl">
        <div className="mx-auto flex h-14 max-w-2xl items-center px-4">
          <Link to="/" className="flex items-center gap-1 text-sm text-[var(--fg-muted)] hover:text-[var(--fg)]">
            <ArrowLeft size={16} /> 返回列表
          </Link>
          <h1 className="ml-4 text-base font-bold text-[var(--fg)]">上传 ZIP 技能包</h1>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-12">
        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition-colors ${
            dragOver
              ? 'border-[var(--primary)] bg-[var(--primary-light)]'
              : 'border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--primary-light)]'
          }`}
        >
          <input ref={inputRef} type="file" accept=".zip" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

          {file ? (
            <div className="flex flex-col items-center gap-3">
              <FileArchive size={48} className="text-[var(--primary)]" />
              <div>
                <p className="text-sm font-medium text-[var(--fg)]">{file.name}</p>
                <p className="text-xs text-[var(--fg-muted)]">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); setProgress(0); }}
                className="cursor-pointer text-xs text-[var(--fg-muted)] hover:text-[var(--danger)] flex items-center gap-1">
                <X size={12} /> 重新选择
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Upload size={48} className="text-[var(--fg-muted)]" />
              <p className="text-sm text-[var(--fg)]">点击选择或拖拽 .zip 文件到此处</p>
              <p className="text-xs text-[var(--fg-muted)]">文件大小不超过 10MB，根目录须包含 skill.md</p>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 px-4 py-3 rounded-lg bg-[var(--danger)]/10 text-[var(--danger)] text-sm">
            {error}
          </div>
        )}

        {/* Progress */}
        {uploading && (
          <div className="mt-6">
            <div className="flex items-center justify-between text-sm text-[var(--fg-muted)] mb-2">
              <span>上传中…</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-[var(--bg-alt)] overflow-hidden">
              <div className="h-full rounded-full bg-[var(--primary)] transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {/* Upload button */}
        <div className="mt-8 flex gap-3">
          <button type="button" onClick={() => navigate('/')}
            className="cursor-pointer px-6 py-2.5 rounded-lg border border-[var(--border)] text-sm text-[var(--fg)] hover:bg-[var(--bg-alt)] transition-colors">
            取消
          </button>
          <button onClick={handleUpload} disabled={!file || uploading}
            className="cursor-pointer px-6 py-2.5 rounded-lg bg-[var(--primary)] text-[var(--primary-fg)] text-sm font-medium hover:bg-[var(--primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5">
            {uploading ? <><Loader2 size={14} className="animate-spin" /> 上传中…</> : <><Upload size={14} /> 开始上传</>}
          </button>
        </div>
      </div>
    </div>
  );
}
