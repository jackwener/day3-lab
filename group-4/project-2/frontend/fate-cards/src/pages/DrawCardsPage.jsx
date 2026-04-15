import { useEffect, useState } from 'react';
import NebulaBg from '../components/ui/NebulaBg';
import TopNavBar from '../components/layout/TopNavBar';
import SideNavBar from '../components/layout/SideNavBar';
import BottomNavBar from '../components/layout/BottomNavBar';
import TarotGrid from '../components/cards/TarotGrid';
import NeonButton from '../components/ui/NeonButton';
import { getDrawPool } from '../api/ritualApi';

export default function DrawCardsPage({
  onComplete,
  selectedCards = [],
  onCardSelect,
  ritualId,
  cardPool = [],
  dispatch,
  activePage,
  onNavigate,
  drawPrompt,
}) {
  const [isFetchingPool, setIsFetchingPool] = useState(false);
  const [poolError, setPoolError] = useState(null);

  useEffect(() => {
    if (!ritualId || cardPool.length > 0 || isFetchingPool) {
      return;
    }

    setIsFetchingPool(true);
    setPoolError(null);

    getDrawPool(ritualId).then((data) => {
        const cards = Array.isArray(data) ? data : data?.cards || [];
        if (dispatch) {
          dispatch({ type: 'SET_CARD_POOL', payload: cards });
          if (data?.drawPrompt) {
            dispatch({ type: 'SET_DRAW_PROMPT', payload: data.drawPrompt });
          }
        }
        if (cards.length === 0) {
          setPoolError('卡池尚未就绪，请稍后重试。');
        }
      }).catch((err) => {
        console.warn('[DrawCardsPage] getDrawPool failed:', err);
        setPoolError('卡牌加载失败，请返回重试。');
      }).finally(() => {
        setIsFetchingPool(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ritualId]);

  const copy = drawPrompt || {
    stageBadge: '财富三相推演',
    title: '选择三张投资命运牌',
    helper: '它们会分别解释你的资金过去、当下仓位，以及下一步财运走向。',
    footerHint: '选牌时别只看好运，先看自己能不能接得住这波机会。',
    progressLabel: '已选财运牌',
  };

  return (
    <div className="relative min-h-screen pb-24 md:pb-0">
      <NebulaBg />
      <TopNavBar onNavigate={onNavigate} />
      <SideNavBar
        activePage={activePage}
        onNavigate={onNavigate}
      />

      {/* 主内容 */}
      <main className="md:ml-72 pt-24 px-6">
        {/* 阶段指示徽章 */}
        <div className="inline-block">
          <span className="bg-secondary/10 text-secondary border border-secondary/20 rounded-full px-4 py-1 font-label text-xs uppercase tracking-[0.15em]">
            {copy.stageBadge}
          </span>
        </div>

        {/* 主标题 */}
        <h1 className="font-headline text-3xl md:text-4xl font-bold text-on-surface mt-4 mb-8">
          {copy.title}
        </h1>
        <p className="text-on-surface-variant mb-6 max-w-2xl">
          {copy.helper}
        </p>

        {/* 进度指标区 */}
        <div className="flex justify-between items-center mb-6">
          {/* 圆点进度 */}
          <div className="flex items-center gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className={[
                  'w-3 h-3 rounded-full transition-all duration-300',
                  i < selectedCards.length
                    ? 'bg-primary'
                    : 'border border-outline-variant',
                ].join(' ')}
              />
            ))}
          </div>

          {/* 抽卡状态 */}
          <span className="font-label text-tertiary text-sm">
            {copy.progressLabel} {selectedCards.length} / 3
          </span>
        </div>

        {/* 卡牌网格 */}
        <TarotGrid
          cardPool={cardPool}
          selectedCards={selectedCards}
          onCardSelect={onCardSelect}
          maxSelections={3}
          isLocked={selectedCards.length >= 3}
        />

        {!ritualId && (
          <p className="mt-6 text-center text-sm text-on-surface-variant">
            正在建立本次财运仪式，请稍候...
          </p>
        )}

        {isFetchingPool && (
          <p className="mt-6 text-center text-sm text-on-surface-variant">
            正在从后端抽取本轮财运牌...
          </p>
        )}

        {poolError && (
          <p className="mt-6 text-center text-sm text-error">
            {poolError}
          </p>
        )}

        {/* 操作按钮区 */}
        <div className="mt-8 text-center">
          <NeonButton
            variant="primary"
            disabled={selectedCards.length < 3}
            onClick={onComplete}
          >
            查看财运走向
          </NeonButton>

          <p className="mt-4 text-on-surface-variant text-sm font-body italic">
            {copy.footerHint}
          </p>
        </div>
      </main>

      <BottomNavBar activePage={activePage} onNavigate={onNavigate} />
    </div>
  );
}
