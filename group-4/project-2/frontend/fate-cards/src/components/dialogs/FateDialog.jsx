import { AnimatePresence, motion } from 'framer-motion';
import GlassPanel from '../ui/GlassPanel';
import NeonButton from '../ui/NeonButton';

export default function FateDialog({ isOpen, onChangeFate, onAcceptFate, copy }) {
  const dialogCopy = copy || {
    title: '未来走势已经显影',
    subtitle: '你可以接受当前剧本，也可以消耗一次改命机会，重抽未来牌。',
    changeLabel: '重写未来仓位',
    acceptLabel: '接受当前走势',
    warning: '每次强行改命，都会降低你的短线运气稳定度。',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1, transition: { type: 'spring', damping: 20, stiffness: 300 } }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="max-w-md w-full mx-4"
          >
            <GlassPanel className="p-8">
              <div className="flex flex-col items-center text-center">
                {/* 图标 */}
                <span className="material-symbols-outlined text-5xl text-primary mb-4 select-none">
                  psychology_alt
                </span>

                {/* 标题 */}
                <h2 className="font-headline text-2xl font-bold text-on-surface">
                  {dialogCopy.title}
                </h2>
                <h3 className="font-headline text-xl text-on-surface mt-1">
                  {dialogCopy.subtitle}
                </h3>

                {/* 副标题英文 */}
                <p className="font-label text-xs text-on-surface-variant uppercase tracking-[0.3em] mt-2">
                  Rebalance your fortune?
                </p>

                {/* 按钮区 */}
                <div className="mt-8 space-y-3 w-full">
                  {/* 改命按钮 */}
                  <div className="relative flex justify-center">
                    <NeonButton variant="primary" onClick={onChangeFate} icon="autorenew">
                      {dialogCopy.changeLabel}
                    </NeonButton>
                  </div>

                  {/* 认命按钮 */}
                  <NeonButton variant="outlined" onClick={onAcceptFate} className="w-full">
                    {dialogCopy.acceptLabel}
                  </NeonButton>
                </div>

                {/* 底部警告 */}
                <div className="flex items-center gap-2 mt-4">
                  <span
                    className="w-2 h-2 rounded-full bg-error"
                    style={{ animation: 'pulse 1.5s infinite' }}
                  />
                  <span className="font-label text-xs text-error/60">
                    {dialogCopy.warning}
                  </span>
                </div>
              </div>
            </GlassPanel>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
