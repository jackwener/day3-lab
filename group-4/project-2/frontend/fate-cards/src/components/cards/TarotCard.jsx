import { useState, useEffect } from 'react';

export default function TarotCard({ cardId, title, subtitle, tags = [], isSelected, isLocked, onClick }) {
  const [hovered, setHovered] = useState(false);
  // 控制卡牌是否已翻转揭示（选中后延迟翻转）
  const [isRevealed, setIsRevealed] = useState(false);

  // 选中后延迟翻转，增加仪式感
  useEffect(() => {
    if (isSelected && !isRevealed) {
      const timer = setTimeout(() => setIsRevealed(true), 300);
      return () => clearTimeout(timer);
    }
    if (!isSelected && isRevealed) {
      setIsRevealed(false);
    }
  }, [isSelected, isRevealed]);

  const handleClick = () => {
    if (!isLocked) {
      onClick(cardId);
    }
  };

  // 3D 翻转容器
  const containerStyle = {
    perspective: '1000px',
  };

  // 卡牌翻转样式
  const cardInnerStyle = {
    transformStyle: 'preserve-3d',
    transition: 'transform 0.6s cubic-bezier(0.23, 1, 0.32, 1)',
    transform: isRevealed 
      ? 'rotateY(180deg)' 
      : !isLocked && hovered 
        ? 'rotateY(10deg) rotateX(5deg) translateZ(20px)' 
        : 'none',
  };

  // 卡牌纹理背景
  const textureStyle = {
    background: `
      repeating-linear-gradient(30deg, rgba(223,142,255,0.1) 0px, transparent 1px, transparent 40px),
      repeating-linear-gradient(150deg, rgba(0,238,252,0.05) 0px, transparent 1px, transparent 40px),
      repeating-linear-gradient(60deg, rgba(223,142,255,0.05) 0px, transparent 1px, transparent 70px)
    `,
    backgroundSize: '40px 70px',
  };

  // 卡牌面样式（正面和背面都要 absolute + backface-visibility: hidden）
  const faceStyle = {
    position: 'absolute',
    inset: 0,
    backfaceVisibility: 'hidden',
  };

  // 背面样式（初始朝上）
  const backStyle = {
    ...faceStyle,
    transform: 'rotateY(0deg)',
  };

  // 正面样式（初始朝后，翻转后显示）
  const frontStyle = {
    ...faceStyle,
    transform: 'rotateY(180deg)',
  };

  return (
    <div
      className={[
        'aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl',
        isLocked ? 'opacity-50 grayscale cursor-not-allowed' : 'cursor-pointer',
        isSelected
          ? 'border border-primary/40 shadow-[0_0_30px_rgba(223,142,255,0.4)]'
          : 'border border-white/10 bg-surface-container-highest',
      ].join(' ')}
      style={containerStyle}
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* 翻转容器 */}
      <div className="w-full h-full relative" style={cardInnerStyle}>
        
        {/* 背面 - 神秘图案（未选中时显示） */}
        <div style={backStyle} className="w-full h-full">
          <div className="w-full h-full relative bg-gradient-to-b from-slate-800 via-slate-900 to-black" style={textureStyle}>
            <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-black/40" />
            
            {/* 神秘图案 */}
            <div className="relative h-full flex flex-col items-center justify-center p-4">
              {/* 中央神秘符号 */}
              <div className="relative">
                <span className="material-symbols-outlined text-5xl text-primary/60 select-none">
                  auto_awesome
                </span>
                <div className="absolute inset-0 blur-xl bg-primary/20 rounded-full" />
              </div>
              
              {/* 装饰边框 */}
              <div className="absolute inset-4 border border-primary/20 rounded-xl pointer-events-none" />
              
              {/* 底部提示 */}
              <span className="absolute bottom-4 text-[10px] uppercase tracking-[0.25em] text-white/40">
                Fortune Card
              </span>
            </div>
          </div>
        </div>

        {/* 正面 - 卡牌内容（翻转后显示） */}
        <div style={frontStyle} className="w-full h-full">
          <div className="w-full h-full relative" style={textureStyle}>
            <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-black/40" />
            <div className="relative h-full flex flex-col justify-between p-4">
              <div className="flex justify-between items-start gap-2">
                <span className="text-[10px] uppercase tracking-[0.25em] text-white/70">Fortune Card</span>
                <span className="material-symbols-outlined text-primary">candlestick_chart</span>
              </div>

              <div className="space-y-2">
                <h3 className="text-white font-headline text-base leading-tight">{title || '财运命牌'}</h3>
                <p className="text-white/70 text-xs leading-relaxed">{subtitle || '等待后端揭示本轮卡牌信息'}</p>
                <div className="flex flex-wrap gap-1 pt-2">
                  {tags.slice(0, 2).map((tag) => (
                    <span key={tag} className="text-[10px] px-2 py-1 rounded-full bg-white/10 text-white/80">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 选中光晕 */}
        {isSelected && (
          <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
        )}
      </div>
    </div>
  );
}
