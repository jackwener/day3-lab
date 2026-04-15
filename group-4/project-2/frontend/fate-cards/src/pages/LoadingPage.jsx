import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { createRitual } from '../api/ritualApi';

export default function LoadingPage({ onComplete, dispatch }) {
  const ritualCreated = useRef(false);
  const completionTriggered = useRef(false);
  const [loadingCopy, setLoadingCopy] = useState({
    title: '正在校准你的财富磁场...',
    subtitle: '读取持仓情绪、资金流向与偏财波动',
    statusPill: 'Fortune signal syncing',
  });
  const [creationError, setCreationError] = useState(null);
  const [ritualReady, setRitualReady] = useState(false);
  const [minDelayPassed, setMinDelayPassed] = useState(false);

  useEffect(() => {
    if (!ritualCreated.current) {
      ritualCreated.current = true;
      createRitual().then((data) => {
        if (dispatch) {
          if (data?.ritualId) {
            dispatch({ type: 'SET_RITUAL_ID', payload: data.ritualId });
            setRitualReady(true);
          }
          if (data?.profile) {
            dispatch({ type: 'SET_PROFILE', payload: data.profile });
            if (data.profile.loading) {
              setLoadingCopy(data.profile.loading);
            }
          }
        }
      }).catch((err) => {
        console.warn('[LoadingPage] createRitual failed:', err);
        setCreationError('初始化财富仪式失败，请刷新重试。');
      });
    }

    const timer = setTimeout(() => {
      setMinDelayPassed(true);
    }, 3500);
    return () => clearTimeout(timer);
  }, [dispatch]);

  useEffect(() => {
    if (!completionTriggered.current && ritualReady && minDelayPassed) {
      completionTriggered.current = true;
      onComplete?.();
    }
  }, [ritualReady, minDelayPassed, onComplete]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-background">
      {/* 背景层：星场 */}
      <div
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)',
          backgroundSize: '40px 40px',
        }}
      />
      {/* 背景层：放射状紫色发光 */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgba(223,142,255,0.12) 0%, rgba(0,238,252,0.04) 35%, transparent 70%)',
        }}
      />

      {/* 主内容 */}
      <div className="relative z-10 text-center flex flex-col items-center px-6">
        {/* 中心涡旋 */}
        <motion.div
          className="relative flex items-center justify-center w-64 h-64 md:w-80 md:h-80 mb-10"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
        >
          {/* 外层脉冲环 */}
          <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping opacity-20" />

          {/* 外边框容器 */}
          <div
            className="relative w-full h-full rounded-full bg-surface-container-lowest border border-primary/20 flex items-center justify-center overflow-hidden"
            style={{
              boxShadow:
                '0 0 40px rgba(223,142,255,0.25), 0 0 80px rgba(0,238,252,0.1), inset 0 0 40px rgba(223,142,255,0.05)',
            }}
          >
            {/* 内旋转环1 */}
            <div className="absolute inset-4 rounded-full border-t-4 border-l-4 border-primary animate-spin" />
            {/* 内旋转环2（反向）*/}
            <div
              className="absolute inset-8 rounded-full border-b-4 border-r-4 border-secondary"
              style={{ animation: 'spin-reverse 1.5s linear infinite' }}
            />
            {/* 中心图标 */}
            <span
              className="material-symbols-outlined select-none"
              style={{
                fontSize: '56px',
                color: '#df8eff',
                filter: 'drop-shadow(0 0 12px rgba(223,142,255,0.8)) drop-shadow(0 0 24px rgba(223,142,255,0.4))',
              }}
            >
              auto_fix_high
            </span>
          </div>
        </motion.div>

        {/* 文本区 */}
        <motion.div
          className="flex flex-col items-center gap-4"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.15, delayChildren: 0.5 } },
          }}
        >
          {/* 主标题 */}
          <motion.h1
            className="font-headline text-4xl md:text-5xl font-bold text-on-surface"
            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
            style={{
              textShadow: '2px 0 #00eefc, -2px 0 #df8eff',
            }}
          >
            {loadingCopy.title}
          </motion.h1>

          {/* 分隔线 */}
          <motion.div
            className="h-[2px] w-12 bg-gradient-to-r from-primary to-secondary mx-auto"
            variants={{ hidden: { opacity: 0, scaleX: 0 }, visible: { opacity: 1, scaleX: 1 } }}
          />

          {/* 副标题 */}
          <motion.p
            className="font-label text-secondary uppercase tracking-[0.2em]"
            variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
          >
            {loadingCopy.subtitle}
          </motion.p>
          {creationError && (
            <p className="text-sm text-error">{creationError}</p>
          )}
        </motion.div>

      </div>

      {/* 装饰文本：左下角 */}
      <div className="fixed bottom-8 left-8 opacity-5 text-4xl font-headline text-on-surface pointer-events-none select-none">
        FATE.EXE
      </div>

      {/* 装饰文本：右上角 */}
      <div className="fixed top-8 right-8 border border-primary/20 bg-primary/5 rounded-full px-4 py-2 flex items-center gap-2 text-xs font-label text-on-surface-variant backdrop-blur-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
        {loadingCopy.statusPill}
      </div>
    </div>
  );
}
