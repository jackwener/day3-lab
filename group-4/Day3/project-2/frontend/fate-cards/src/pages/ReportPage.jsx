import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import NebulaBg from '../components/ui/NebulaBg';
import TopNavBar from '../components/layout/TopNavBar';
import SideNavBar from '../components/layout/SideNavBar';
import BottomNavBar from '../components/layout/BottomNavBar';
import GlassPanel from '../components/ui/GlassPanel';
import NeonButton from '../components/ui/NeonButton';
import { getReport } from '../api/ritualApi';

// 卡牌渐变色映射
const cardGradients = [
  'from-purple-900/80 to-indigo-900/80',
  'from-cyan-900/80 to-teal-900/80',
  'from-violet-900/80 to-purple-900/80',
];

// phase 标签颜色映射
const phaseLabelColors = {
  past: 'text-on-surface-variant',
  present: 'text-secondary',
  future: 'text-primary',
};
const phaseIcons = {
  past: 'history',
  present: 'trending_up',
  future: 'auto_graph',
};

// 属性进度条颜色映射
const barColorMap = {
  primary: {
    bar: 'bg-gradient-to-r from-primary to-primary-container',
    shadow: '0 0 10px rgba(223,142,255,0.4)',
  },
  tertiary: {
    bar: 'bg-tertiary',
    shadow: '0 0 10px rgba(222,255,171,0.4)',
  },
  secondary: {
    bar: 'bg-secondary',
    shadow: '0 0 10px rgba(0,238,252,0.4)',
  },
};

// 渲染带高亮的引言文本
function HighlightedText({ text, highlights }) {
  if (!highlights || highlights.length === 0) {
    return <span>{text}</span>;
  }

  // 按 word 分割文本
  let parts = [{ content: text, highlight: null }];

  highlights.forEach(({ word, color }) => {
    const newParts = [];
    parts.forEach(part => {
      if (part.highlight !== null) {
        newParts.push(part);
        return;
      }
      const idx = part.content.indexOf(word);
      if (idx === -1) {
        newParts.push(part);
        return;
      }
      if (idx > 0) {
        newParts.push({ content: part.content.slice(0, idx), highlight: null });
      }
      newParts.push({ content: word, highlight: color });
      if (idx + word.length < part.content.length) {
        newParts.push({ content: part.content.slice(idx + word.length), highlight: null });
      }
    });
    parts = newParts;
  });

  return (
    <>
      {parts.map((part, i) =>
        part.highlight ? (
          <span key={i} className={part.highlight}>
            {part.content}
          </span>
        ) : (
          <span key={i}>{part.content}</span>
        )
      )}
    </>
  );
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.5, staggerChildren: 0.15 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const cardStaggerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const cardVariant = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45 } },
};

export default function ReportPage({
  selectedCards,
  fateChoice,
  onRestart,
  ritualId,
  revealData,
  reportData,
  dispatch,
  activePage,
  onNavigate,
}) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!reportData) {
      setLoading(true);
      getReport(ritualId)
        .then((data) => {
          if (data && dispatch) {
            dispatch({ type: 'SET_REPORT_DATA', payload: data });
          }
        })
        .catch((err) => {
          console.warn('[ReportPage] getReport failed:', err);
        })
        .finally(() => setLoading(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 数据全部来自 reportData（后端）
  const phases = reportData?.phases || [];
  const attributes = reportData?.attributes || [];
  const quote = reportData?.quote || { text: '', highlights: [] };
  const terms = reportData?.systemTerms || { karmaPoints: '-', dimensionRank: '-' };
  const ending = reportData?.ending || null;
  const personality = reportData?.personality || null;
  const recommendedFund = reportData?.recommendedFund || null;
  const recommendedFundName = (recommendedFund?.name || '').replace(/\s*[\(（]后端[\)）]\s*$/u, '');
  const hero = reportData?.hero || {
    eyebrow: 'Investment Fortune Synthesis',
    title: '今日投资财运报告',
    summary: '',
  };

  if (loading) {
    return (
      <div className="relative min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-on-surface-variant">
          <span className="material-symbols-outlined text-4xl text-primary animate-spin">autorenew</span>
          <p className="font-label text-sm">正在生成命运裁决...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen pb-24 md:pb-0">
      <NebulaBg />
      <TopNavBar onNavigate={onNavigate} onHome={() => onNavigate?.('draw')} onHistory={() => onNavigate?.('gallery')} />
      <SideNavBar activePage={activePage} onNavigate={onNavigate} />

      <motion.div
        className="md:ml-72 pt-24 px-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="lg:grid lg:grid-cols-12 lg:gap-8 max-w-7xl mx-auto py-8">
          {/* 左侧列 */}
          <div className="lg:col-span-7">
            {/* 标题区 */}
            <motion.div variants={itemVariants}>
              <p className="font-label text-sm text-secondary uppercase tracking-[0.2em]">
                {hero.eyebrow}
              </p>
              <h1
                className="font-headline text-4xl font-bold text-primary mt-2"
                style={{ textShadow: '0 0 20px rgba(223,142,255,0.4)' }}
              >
                {hero.title}
              </h1>
              {hero.summary && (
                <p className="mt-4 text-on-surface-variant max-w-2xl">
                  {hero.summary}
                </p>
              )}
            </motion.div>

            {/* 三卡展示区 */}
            <motion.div
              className="flex items-end justify-center gap-4 my-8"
              variants={cardStaggerVariants}
            >
              {phases.map((phaseItem, i) => {
                const isPresent = phaseItem.phase === 'present';
                const cardClass =
                  'aspect-[2/3] w-40 md:w-48 rounded-2xl overflow-hidden relative ' +
                  (isPresent
                    ? 'border border-secondary/30 shadow-[0_0_30px_rgba(0,238,252,0.15)] scale-105 z-10'
                    : 'border border-white/5');

                return (
                  <motion.div key={phaseItem.phase} className={cardClass} variants={cardVariant}>
                    {/* 上半渐变色块 */}
                    <div
                      className={`h-1/2 bg-gradient-to-br ${cardGradients[i] || cardGradients[0]} w-full`}
                    />
                    {/* 阶段图标 */}
                    <div className="absolute top-3 left-3">
                      <span className="material-symbols-outlined text-sm text-white/70">
                        {phaseIcons[phaseItem.phase]}
                      </span>
                    </div>
                    {/* 渐变遮罩 */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    {/* 底部文字层 */}
                    <div className="absolute bottom-0 p-4 w-full">
                      <p
                        className={`font-label text-xs uppercase tracking-[0.15em] ${phaseLabelColors[phaseItem.phase] || 'text-on-surface-variant'}`}
                      >
                        {phaseItem.label}·{phaseItem.subLabel}
                      </p>
                      <p className="font-headline text-xl font-bold text-white mt-1 leading-tight">
                        {phaseItem.card?.title || phaseItem.card?.name || ''}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>

            <motion.div className="grid md:grid-cols-3 gap-4 mb-8" variants={cardStaggerVariants}>
              {phases.map((phaseItem) => (
                <motion.div
                  key={`${phaseItem.phase}-insight`}
                  variants={cardVariant}
                  className="rounded-2xl border border-white/5 bg-surface-container-low p-4"
                >
                  <p className="text-xs uppercase tracking-[0.18em] text-secondary/80">
                    {phaseItem.statusTitle}
                  </p>
                  <p className="font-headline text-lg text-on-surface mt-2">
                    {phaseItem.statusSummary}
                  </p>
                  <p className="text-sm text-on-surface-variant mt-3 leading-relaxed">
                    {phaseItem.interpretation}
                  </p>
                </motion.div>
              ))}
            </motion.div>

            {/* 总结面板 */}
            <motion.div
              className="relative bg-surface-container-low border border-white/5 rounded-3xl p-8 md:p-12"
              variants={itemVariants}
              transition={{ delay: 0.4 }}
            >
              {/* 装饰引号 */}
              <span className="absolute top-4 right-4 text-8xl opacity-10 font-serif leading-none select-none">
                "
              </span>

              {/* 引言文本 */}
              <p className="font-headline text-2xl md:text-3xl leading-relaxed text-on-surface">
                <HighlightedText text={quote.text} highlights={quote.highlights} />
              </p>

              {/* 分隔线 */}
              <div className="h-px bg-gradient-to-r from-transparent via-outline-variant/30 to-transparent my-6" />

              {/* 签名 */}
              <p className="font-label text-sm text-on-surface-variant">— 祭司的最终批注</p>
            </motion.div>
          </div>

          {/* 右侧列 */}
          <motion.div
            className="lg:col-span-5 lg:sticky lg:top-32 mt-8 lg:mt-0"
            variants={itemVariants}
          >
            <GlassPanel className="p-8">
              {/* 标题区 */}
              <div className="flex flex-col gap-1">
                <span className="material-symbols-outlined text-3xl text-secondary">analytics</span>
                <h2 className="font-headline text-xl font-bold text-on-surface mt-1">
                今日财运状态
                </h2>
                <p className="font-label text-xs text-on-surface-variant uppercase tracking-[0.15em]">
                  Fortune Signal Board
                </p>
              </div>

              {/* 属性进度条区 */}
              <div className="mt-6 space-y-5">
                {attributes.map((attr) => {
                  const colors = barColorMap[attr.color] || barColorMap.primary;

                  return (
                    <div key={attr.key}>
                      {/* 标签行 */}
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-base text-on-surface-variant">
                            {attr.icon}
                          </span>
                          <span className="font-label text-sm text-on-surface">{attr.label}</span>
                        </div>
                        <span className="font-label text-sm text-on-surface-variant">
                          {attr.unit === 'MAX' ? attr.unit : `${attr.value}${attr.unit}`}
                        </span>
                      </div>

                      {/* 进度条 */}
                      <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${colors.bar}`}
                          style={{ boxShadow: colors.shadow }}
                          initial={{ width: 0 }}
                          animate={{ width: attr.unit === 'MAX' ? '100%' : `${attr.value}%` }}
                          transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 统计卡区 */}
              <div className="grid grid-cols-2 gap-4 mt-6">
                {/* 业力积分卡 */}
                <div className="bg-surface-container rounded-2xl p-4 text-center">
                  <p className="font-headline text-2xl font-bold text-primary">
                    {terms.karmaPoints}
                  </p>
                  <p className="font-label text-xs text-on-surface-variant mt-1">偏财积分</p>
                </div>

                {/* 次元等级卡 */}
                <div className="bg-surface-container rounded-2xl p-4 text-center">
                  <p className="font-headline text-2xl font-bold text-tertiary">
                    {terms.dimensionRank}
                  </p>
                  <p className="font-label text-xs text-on-surface-variant mt-1">财富象限</p>
                </div>
              </div>

              {recommendedFund && (
                <div className="mt-6 border border-secondary/20 rounded-2xl p-4 space-y-2">
                  <p className="font-label text-xs text-on-surface-variant uppercase tracking-[0.15em]">
                    今日南方基金推荐
                  </p>
                  <p className="font-headline text-lg text-on-surface">
                    {recommendedFundName}
                  </p>
                  <p className="font-label text-sm text-on-surface-variant">
                    {recommendedFund.code} · {recommendedFund.manager || '南方基金'}
                  </p>
                  {recommendedFund.strategy && (
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      {recommendedFund.strategy}
                    </p>
                  )}
                  {recommendedFund.reason && (
                    <p className="text-xs text-tertiary leading-relaxed">
                      {recommendedFund.reason}
                    </p>
                  )}
                  {(recommendedFund.url || recommendedFund.market) && (
                    <a
                      href={recommendedFund.url || '#'}
                      target={recommendedFund.url ? '_blank' : undefined}
                      rel={recommendedFund.url ? 'noreferrer' : undefined}
                      className="inline-flex items-center gap-1 text-sm text-secondary hover:text-secondary/80 transition-colors font-label"
                    >
                      <span className="material-symbols-outlined text-base">open_in_new</span>
                      {recommendedFund.market ? `交易市场：${recommendedFund.market}` : '查看基金详情'}
                    </a>
                  )}
                </div>
              )}

              {/* 按钮区 */}
              <div className="mt-8 space-y-3">
                <NeonButton variant="primary" className="w-full justify-center" onClick={onRestart}>
                  再来一次
                </NeonButton>
                <NeonButton variant="outlined" className="w-full justify-center" icon="share_reviews">
                  一键生成"精美分享卡"
                </NeonButton>
              </div>
            </GlassPanel>
          </motion.div>
        </div>
      </motion.div>

      <BottomNavBar activePage={activePage} onNavigate={onNavigate} />
    </div>
  );
}
