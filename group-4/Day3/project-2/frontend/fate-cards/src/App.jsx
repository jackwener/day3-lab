import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useState } from 'react';
import useRitualState from './hooks/useRitualState';
import LoadingPage from './pages/LoadingPage';
import DiceRitualPage from './pages/DiceRitualPage';
import DrawCardsPage from './pages/DrawCardsPage';
import RevealPage from './pages/RevealPage';
import ReportPage from './pages/ReportPage';
import GalleryPage from './pages/GalleryPage';

const pageTransition = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } };

export default function App() {
  const [showGallery, setShowGallery] = useState(false);
  const {
    currentState,
    selectedCards,
    fateChoice,
    goToNextState,
    skipDice,
    selectCard,
    changeFate,
    acceptFate,
    restart,
    STATES,
    // 新增状态
    ritualId,
    profile,
    diceRoll,
    cardPool,
    drawPrompt,
    revealData,
    reportData,
    loading,
    error,
    dispatch,
  } = useRitualState();

  const navigateToPage = useCallback((pageKey) => {
    if (!pageKey) {
      return;
    }

    if (pageKey === 'gallery') {
      setShowGallery(true);
      return;
    }

    if (showGallery) {
      setShowGallery(false);
    }

    const pageStateMap = {
      loading: STATES.LOADING,
      dice: STATES.DICE,
      draw: STATES.DRAW,
      reveal: STATES.REVEAL,
      report: STATES.REPORT,
    };

    if (!pageStateMap[pageKey]) {
      return;
    }

    if (pageKey === 'reveal' && selectedCards.length !== 3) {
      dispatch({ type: 'SET_STATE', payload: STATES.DRAW });
      return;
    }

    if (pageKey === 'report' && (!revealData || !revealData.phases?.length)) {
      dispatch({ type: 'SET_STATE', payload: STATES.REVEAL });
      return;
    }

    dispatch({ type: 'SET_STATE', payload: pageStateMap[pageKey] });
  }, [
    STATES.DICE,
    STATES.DRAW,
    STATES.REPORT,
    STATES.REVEAL,
    STATES.LOADING,
    dispatch,
    selectedCards.length,
    revealData,
    showGallery,
  ]);

  return (
    <div className="bg-background text-on-surface min-h-screen">
      {/* 荒诞图鉴覆盖层 */}
      <AnimatePresence>
        {showGallery && (
          <motion.div key="gallery" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50">
            <GalleryPage onBack={() => navigateToPage('draw')} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {currentState === STATES.LOADING && (
          <motion.div key="loading" {...pageTransition}>
            <LoadingPage
              onComplete={() => goToNextState(STATES.LOADING)}
              dispatch={dispatch}
              onNavigate={navigateToPage}
            />
          </motion.div>
        )}
        {currentState === STATES.DICE && (
          <motion.div key="dice" {...pageTransition}>
            <DiceRitualPage
              onComplete={() => goToNextState(STATES.DICE)}
              onSkip={() => skipDice(ritualId)}
              ritualId={ritualId}
              dispatch={dispatch}
              onGallery={() => setShowGallery(true)}
              onNavigate={navigateToPage}
              profile={profile}
            />
          </motion.div>
        )}
        {currentState === STATES.DRAW && (
          <motion.div key="draw" {...pageTransition}>
            <DrawCardsPage
              onComplete={() => goToNextState(STATES.DRAW)}
              selectedCards={selectedCards}
              onCardSelect={selectCard}
              ritualId={ritualId}
              cardPool={cardPool}
              dispatch={dispatch}
              onGallery={() => setShowGallery(true)}
              onNavigate={navigateToPage}
              activePage={STATES.DRAW}
              drawPrompt={drawPrompt}
            />
          </motion.div>
        )}
        {currentState === STATES.REVEAL && (
          <motion.div key="reveal" {...pageTransition}>
            <RevealPage
              selectedCards={selectedCards}
              onChangeFate={changeFate}
              onAcceptFate={acceptFate}
              ritualId={ritualId}
              revealData={revealData}
              dispatch={dispatch}
              onGallery={() => setShowGallery(true)}
              onNavigate={navigateToPage}
              activePage={STATES.REVEAL}
            />
          </motion.div>
        )}
        {currentState === STATES.REPORT && (
          <motion.div key="report" {...pageTransition}>
            <ReportPage
              selectedCards={selectedCards}
              fateChoice={fateChoice}
              onRestart={restart}
              ritualId={ritualId}
              revealData={revealData}
              reportData={reportData}
              dispatch={dispatch}
              onGallery={() => setShowGallery(true)}
              onNavigate={navigateToPage}
              activePage={STATES.REPORT}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
