import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import NebulaBg from '../components/ui/NebulaBg';
import TopNavBar from '../components/layout/TopNavBar';
import SideNavBar from '../components/layout/SideNavBar';
import BottomNavBar from '../components/layout/BottomNavBar';
import FateCard from '../components/cards/FateCard';
import FateDialog from '../components/dialogs/FateDialog';
import { submitReveal, submitChoice } from '../api/ritualApi';

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.3,
    },
  },
};

const cardVariants = {
  hidden: { y: 100, opacity: 0, rotateY: 180 },
  visible: {
    y: 0,
    opacity: 1,
    rotateY: 0,
    transition: {
      type: 'spring',
      damping: 20,
      stiffness: 100,
      duration: 0.8,
    },
  },
};

export default function RevealPage({
  selectedCards,
  onChangeFate,
  onAcceptFate,
  ritualId,
  revealData,
  dispatch,
  activePage,
  onNavigate,
}) {
  const [showDialog, setShowDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [revealError, setRevealError] = useState(null);
  const [revealedCards, setRevealedCards] = useState([]);
  const revealRequestedRef = useRef(false);
  const revealTimersRef = useRef([]);

  useEffect(() => {
    if (!revealData && !revealRequestedRef.current && selectedCards && selectedCards.length > 0) {
      revealRequestedRef.current = true;
      setLoading(true);
      setRevealError(null);
      submitReveal(ritualId, selectedCards)
        .then((data) => {
          if (data?.phases && dispatch) {
            dispatch({ type: 'SET_REVEAL_DATA', payload: data });
          }
        })
        .catch((err) => {
          console.warn('[RevealPage] submitReveal failed:', err);
          setRevealError('命运揭示失败，请返回重新抽牌。');
          revealRequestedRef.current = false;
        })
        .finally(() => setLoading(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loading && revealData?.phases?.length) {
      setShowDialog(false);
      setRevealedCards(Array(revealData.phases.length).fill(false));

      revealTimersRef.current.forEach(clearTimeout);
      revealTimersRef.current = [];

      revealData.phases.forEach((_, index) => {
        const timer = setTimeout(() => {
          setRevealedCards((prev) => {
            const next = [...prev];
            next[index] = true;
            return next;
          });
        }, 450 + index * 550);
        revealTimersRef.current.push(timer);
      });

      const dialogTimer = setTimeout(() => {
        setShowDialog(true);
      }, 450 + revealData.phases.length * 550 + 350);

      revealTimersRef.current.push(dialogTimer);

      return () => {
        revealTimersRef.current.forEach(clearTimeout);
      };
    }
  }, [loading, revealData]);

  useEffect(() => {
    return () => {
      revealTimersRef.current.forEach(clearTimeout);
    };
  }, []);

  // 处理改命
  const handleChangeFate = async () => {
    try {
      await submitChoice(ritualId, 'change');
      onChangeFate?.();
    } catch (e) {
      console.warn('[RevealPage] submitChoice failed:', e);
      setRevealError('改命失败，请稍后重试。');
    }
  };

  // 处理认命
  const handleAcceptFate = async () => {
    try {
      await submitChoice(ritualId, 'accept');
      onAcceptFate?.();
    } catch (e) {
      console.warn('[RevealPage] submitChoice failed:', e);
      setRevealError('确认走势失败，请稍后重试。');
    }
  };

  // 从 revealData 或 fallback 展示的卡牌
  const phases = revealData?.phases || [];
  const decisionPrompt = revealData?.decisionPrompt;

  return (
    <div className="relative min-h-screen">
      <NebulaBg />
      <TopNavBar onNavigate={onNavigate} onHome={() => onNavigate?.('draw')} onHistory={() => onNavigate?.('gallery')} />
      <SideNavBar
        activePage={activePage}
        onNavigate={onNavigate}
      />

      {/* 主内容 */}
      <main className="md:ml-72 flex items-center justify-center min-h-screen">
        {loading ? (
          <div className="flex flex-col items-center gap-4 text-on-surface-variant">
            <span className="material-symbols-outlined text-4xl text-primary animate-spin">autorenew</span>
            <p className="font-label text-sm">正在解读命运...</p>
          </div>
        ) : revealError ? (
          <div className="flex flex-col items-center gap-4 text-on-surface-variant">
            <span className="material-symbols-outlined text-4xl text-error">error</span>
            <p className="font-label text-sm text-error">{revealError}</p>
          </div>
        ) : (
          /* 三卡展示区 */
          <motion.div
            className="flex items-center justify-center gap-4 md:gap-8 px-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            style={{ perspective: '1000px' }}
          >
            {phases.map((item, index) => (
              <motion.div key={item.phase} variants={cardVariants} style={{ transformStyle: 'preserve-3d' }}>
                <FateCard
                  phase={item.phase}
                  isRevealed={revealedCards[index] || false}
                  name={item.card?.title || item.card?.name || ''}
                  description={item.card?.description || ''}
                  rarity={item.rarity || '普通'}
                  statusTitle={item.statusTitle}
                  statusSummary={item.statusSummary}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </main>

      {/* 改命对话框 */}
      <FateDialog
        isOpen={showDialog}
        onChangeFate={handleChangeFate}
        onAcceptFate={handleAcceptFate}
        copy={decisionPrompt}
      />

      <BottomNavBar activePage={activePage} onNavigate={onNavigate} />
    </div>
  );
}
