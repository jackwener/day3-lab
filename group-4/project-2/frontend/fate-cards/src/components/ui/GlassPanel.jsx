export default function GlassPanel({ children, className = '', showGlowOrbs = true }) {
  return (
    <div
      className={
        'relative bg-[rgba(27,24,35,0.6)] backdrop-blur-[20px] rounded-[2rem] border border-white/5 shadow-2xl overflow-hidden ' +
        className
      }
    >
      {showGlowOrbs && (
        <>
          <div className="absolute -top-20 -left-20 w-40 h-40 bg-secondary/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
        </>
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
