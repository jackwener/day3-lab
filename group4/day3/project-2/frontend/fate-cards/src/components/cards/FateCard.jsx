import { useState } from 'react';

const phaseConfig = {
  past: {
    label: '过去 / PAST',
    labelColor: 'text-on-surface-variant',
    borderClass: 'border-white/5',
    extraClass: 'rotate-[-8deg]',
    gradientFrom: 'from-slate-800',
    gradientTo: 'to-slate-700',
  },
  present: {
    label: '现在 / PRESENT',
    labelColor: 'text-secondary',
    borderClass: 'border-secondary/20',
    extraClass: 'scale-105 z-10',
    shadowStyle: '0 0 30px rgba(0,238,252,0.15)',
    gradientFrom: 'from-cyan-900/50',
    gradientTo: 'to-slate-800',
  },
  future: {
    label: '未来 / FUTURE',
    labelColor: 'text-primary',
    borderClass: 'border-primary/20',
    extraClass: 'rotate-[8deg]',
    shadowStyle: '0 0 40px rgba(223,142,255,0.2)',
    gradientFrom: 'from-purple-900/50',
    gradientTo: 'to-slate-800',
  },
};

const rarityConfig = {
  普通: {
    className: 'bg-slate-700 text-slate-200',
    label: '普通',
  },
  稀有: {
    className: 'bg-secondary/20 text-secondary border border-secondary/40',
    label: '稀有',
  },
  传说: {
    className: 'bg-primary/20 text-primary border border-primary/40',
    label: '传说',
  },
};

const rarityAlias = {
  common: '普通',
  rare: '稀有',
  legendary: '传说',
};

export default function FateCard({ phase, name, description, rarity = '普通', statusTitle, statusSummary, isRevealed = false }) {
  const [hovered, setHovered] = useState(false);
  const config = phaseConfig[phase] || phaseConfig.past;
  const normalizedRarity = rarityAlias[rarity] || rarity;
  const rarityStyle = rarityConfig[normalizedRarity] || rarityConfig['普通'];

  const containerStyle = {
    perspective: '1000px',
  };

  const cardStyle = {
    transformStyle: 'preserve-3d',
    transform: hovered ? 'translateY(-4px) rotateX(-4deg)' : 'none',
    boxShadow: config.shadowStyle || undefined,
  };

  const cardInnerStyle = {
    width: '100%',
    height: '100%',
    position: 'relative',
    transformStyle: 'preserve-3d',
    transition: 'transform 0.75s cubic-bezier(0.23, 1, 0.32, 1)',
    transform: isRevealed ? 'rotateY(180deg)' : 'rotateY(0deg)',
  };

  const frontFaceStyle = {
    position: 'absolute',
    inset: 0,
    backfaceVisibility: 'hidden',
    transform: 'rotateY(180deg)',
  };

  const backFaceStyle = {
    position: 'absolute',
    inset: 0,
    backfaceVisibility: 'hidden',
    transform: 'rotateY(0deg)',
  };

  return (
    <div
      className={[
        'w-48 h-72 md:w-56 md:h-80 rounded-2xl overflow-hidden relative',
        'bg-surface-container-high border',
        config.borderClass,
        config.extraClass,
      ].join(' ')}
      style={{ ...containerStyle, ...cardStyle }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={cardInnerStyle} className={isRevealed ? 'z-10' : ''}>
        {/* 正面 - 解释已揭示内容 */}
        <div style={frontFaceStyle} className="w-full h-full">
          <div
            className={[
              'w-full h-full p-4 flex flex-col justify-start',
              'bg-surface-container-high',
            ].join(' ')}
          >
            <span
              className={[
                'font-label text-xs uppercase tracking-[0.15em]',
                config.labelColor,
              ].join(' ')}
            >
              {config.label}
            </span>
            <span
              className={[
                'font-label text-xs mt-1 inline-flex items-center gap-1',
                rarityStyle.className,
              ].join(' ')}
            >
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-current" />
              {rarityStyle.label}
            </span>

            <h3 className="font-headline text-lg font-bold text-on-surface mt-1 leading-tight">
              {name}
            </h3>

            <p className="font-body text-xs text-on-surface-variant mt-2 line-clamp-2 leading-relaxed">
              {description}
            </p>

            {(statusTitle || statusSummary) && (
              <div className="mt-3 border-t border-white/10 pt-3">
                {statusTitle && (
                  <p className="text-[10px] uppercase tracking-[0.18em] text-secondary/80">
                    {statusTitle}
                  </p>
                )}
                {statusSummary && (
                  <p className="font-body text-[11px] text-on-surface/80 mt-1 line-clamp-3 leading-relaxed">
                    {statusSummary}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 背面 - 神秘卡面 */}
        <div
          style={backFaceStyle}
          className={[
            'h-full w-full bg-gradient-to-b from-slate-800 via-slate-900 to-black',
            'relative',
          ].join(' ')}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-black/40" />
          <div className="absolute inset-0 flex items-center justify-center opacity-50">
            <span className="material-symbols-outlined text-6xl text-white select-none">
              auto_awesome
            </span>
          </div>
          <div className="absolute inset-0">
            <div className="absolute inset-4 border border-primary/20 rounded-xl" />
          </div>
          <span className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs text-white/40 tracking-[0.2em] uppercase">
            Fortune Card
          </span>
        </div>

        <div className="absolute inset-0 pointer-events-none border border-white/10" />
      </div>
    </div>
  );
}
