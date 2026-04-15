interface Props {
  max?: number;
  value: number;
  count?: number;
  interactive?: boolean;
  onChange?: (score: number) => void;
  size?: 'sm' | 'md';
}

export default function StarRating({ max = 5, value, count, interactive, onChange, size = 'md' }: Props) {
  const sz = size === 'sm' ? 'text-base' : 'text-xl';

  return (
    <span className="inline-flex items-center gap-1">
      {Array.from({ length: max }, (_, i) => {
        const star = i + 1;
        const filled = star <= Math.round(value);
        return (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onChange?.(star)}
            className={`${sz} transition-colors ${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'} ${filled ? 'text-[var(--warning)]' : 'text-[var(--fg-muted)] opacity-40'}`}
            style={{ background: 'none', border: 'none', padding: 0 }}
          >
            ★
          </button>
        );
      })}
      {typeof value === 'number' && value > 0 && (
        <span className="text-sm text-[var(--fg-muted)] ml-1">
          {value.toFixed(1)}{count != null && <span>({count})</span>}
        </span>
      )}
    </span>
  );
}
