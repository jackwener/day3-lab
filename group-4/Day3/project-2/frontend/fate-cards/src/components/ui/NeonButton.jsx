export default function NeonButton({
  children,
  variant = 'primary',
  onClick,
  disabled = false,
  className = '',
  icon,
}) {
  const baseClass = 'cursor-pointer transition-all duration-300 ';

  let variantClass = '';

  if (disabled) {
    variantClass =
      'bg-slate-800 text-slate-500 cursor-not-allowed rounded-full py-4 px-8 font-headline font-bold text-lg';
  } else if (variant === 'primary') {
    variantClass =
      'bg-gradient-to-r from-primary to-primary-container text-on-primary font-headline font-bold text-xl rounded-full py-5 px-10 ' +
      'shadow-[0_0_30px_rgba(223,142,255,0.4)] hover:shadow-[0_0_50px_rgba(223,142,255,0.6)] hover:scale-105 active:scale-95';
  } else if (variant === 'secondary') {
    variantClass =
      'border-2 border-secondary text-secondary bg-transparent hover:bg-secondary hover:text-background ' +
      'font-headline font-bold text-lg rounded-full py-4 px-8 shadow-[0_0_20px_rgba(0,238,252,0.2)]';
  } else if (variant === 'outlined') {
    variantClass =
      'border border-outline-variant/30 text-on-surface-variant bg-transparent hover:bg-white/5 hover:text-on-surface rounded-full py-4 px-8';
  }

  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={
        baseClass +
        variantClass +
        (icon ? ' flex items-center gap-3' : '') +
        (className ? ' ' + className : '')
      }
    >
      {icon && (
        <span className="material-symbols-outlined">{icon}</span>
      )}
      {children}
    </button>
  );
}
