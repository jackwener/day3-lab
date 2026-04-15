import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { getHistory } from '../api/galleryApi';

export default function GalleryPage({ onBack }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    getHistory(1, 20)
      .then((data) => {
        // 后端返回 { items: [...] } 或直接数组
        const list = Array.isArray(data) ? data : data?.items || data?.records || [];
        setRecords(list);
      })
      .catch((err) => {
        console.warn('[GalleryPage] getHistory failed:', err);
        setError('无法加载历史财运报告');
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col">
      {/* 顶栏 */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
        <button
          onClick={onBack}
          className="material-symbols-outlined text-on-surface-variant hover:text-white transition-colors cursor-pointer"
        >
          arrow_back
        </button>
        <span className="material-symbols-outlined text-primary">photo_library</span>
        <h1 className="font-headline text-xl font-bold text-on-surface">财运档案库</h1>
        <span className="ml-auto font-label text-xs text-on-surface-variant uppercase tracking-[0.15em]">
          历史投资仪式记录
        </span>
      </div>

      {/* 主体 */}
      <div className="flex-1 px-6 py-8 max-w-2xl mx-auto w-full">
        {loading && (
          <div className="flex flex-col items-center gap-4 mt-20 text-on-surface-variant">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="font-label text-sm">正在调取历史财运记录...</p>
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-col items-center gap-4 mt-20 text-on-surface-variant">
            <span className="material-symbols-outlined text-4xl text-outline-variant">error_outline</span>
            <p className="font-label text-sm">{error}</p>
          </div>
        )}

        {!loading && !error && records.length === 0 && (
          <div className="flex flex-col items-center gap-4 mt-20 text-on-surface-variant">
            <span className="material-symbols-outlined text-5xl text-outline-variant">menu_book</span>
            <p className="font-headline text-lg">档案库还是空的</p>
            <p className="font-label text-sm">完成一次投资财运仪式后，报告会保存在这里</p>
          </div>
        )}

        {!loading && !error && records.length > 0 && (
          <motion.div
            className="flex flex-col gap-4"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
          >
            {records.map((record, idx) => (
              <motion.div
                key={record.id ?? record.historyId ?? idx}
                variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
                className="bg-surface-container-low/40 border border-outline-variant/20 rounded-2xl px-5 py-4 backdrop-blur-sm hover:border-primary/30 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {record.cards?.length > 0 || record.cardNames?.length > 0 ? (
                      <p className="font-label text-sm text-on-surface font-medium">
                        曾抽到：
                        {(record.cards || record.cardNames || []).map((card, idx, arr) => {
                          const title = typeof card === "string" ? card : card?.title || card?.name || "";
                          return (
                            <span key={`${record.historyId || record.id}-${title}-${idx}`} className="ml-1">
                              {title || '未知卡牌'}
                              {idx < arr.length - 1 ? " · " : ""}
                            </span>
                          );
                        })}
                      </p>
                    ) : (
                      <p className="font-label text-sm text-on-surface font-medium">
                        财运组合待揭示
                      </p>
                    )}
                    {record.cards?.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {record.cards.map((card) => (
                          <span
                            key={card.id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container/70 border border-outline-variant/25 text-xs text-on-surface-variant"
                          >
                            <span className="font-label">{card.title}</span>
                          </span>
                        ))}
                      </div>
                    )}
                    {/* 结局 */}
                    {(record.ending || record.endingTitle) && (
                      <p className="font-body text-xs text-secondary mt-1 truncate">
                        {record.ending || record.endingTitle}
                      </p>
                    )}
                  </div>
                  {/* 时间 */}
                  <span className="font-label text-xs text-on-surface-variant whitespace-nowrap mt-0.5">
                    {record.createdAt
                      ? new Date(record.createdAt).toLocaleDateString('zh-CN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '时间未知'}
                  </span>
                </div>

                {/* 人格标签 */}
                {(record.personality || record.personalityLabel) && (
                  <div className="mt-2">
                    <span className="inline-block px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary font-label text-[11px]">
                      {record.personality || record.personalityLabel}
                    </span>
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
