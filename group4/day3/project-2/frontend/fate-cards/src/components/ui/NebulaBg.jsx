export default function NebulaBg({ showScanLines = false }) {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* 星云渐变背景层 */}
      <div
        className="absolute inset-0 bg-background"
        style={{
          background:
            'radial-gradient(circle at 20% 30%, rgba(223, 142, 255, 0.08) 0%, transparent 40%), ' +
            'radial-gradient(circle at 80% 70%, rgba(0, 238, 252, 0.08) 0%, transparent 40%), ' +
            'radial-gradient(circle at 50% 50%, rgba(222, 255, 171, 0.03) 0%, transparent 60%), ' +
            '#0f0d16',
        }}
      />

      {/* 发光球 */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full" />
      <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-secondary/5 blur-[150px] rounded-full" />

      {/* 扫描线 */}
      {showScanLines && (
        <div
          className="absolute inset-0 pointer-events-none z-[1] animate-scan"
          style={{
            background:
              'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(154,0,208,0.03) 1px, rgba(154,0,208,0.03) 2px)',
            backgroundSize: '100% 4px',
          }}
        />
      )}
    </div>
  );
}
