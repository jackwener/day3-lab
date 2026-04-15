import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import './index.css';

interface AnimatedNumberProps {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
  className?: string;
  hidden?: boolean;
}

export default function AnimatedNumber({
  value,
  prefix = '',
  suffix = '',
  decimals = 2,
  duration = 600,
  className = '',
  hidden = false,
}: AnimatedNumberProps) {
  // 安全检查：确保 value 是有效数字
  const safeValue = typeof value === 'number' && !isNaN(value) ? value : 0;
  const [displayValue, setDisplayValue] = useState(safeValue);
  const prevValueRef = useRef(value);
  const animationRef = useRef<number | null>(null);
  
  useEffect(() => {
    // 安全检查：确保 value 是有效数字
    const safeValue = typeof value === 'number' && !isNaN(value) ? value : 0;
    const startValue = prevValueRef.current;
    const endValue = safeValue;
    const startTime = performance.now();
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // 使用 easeOutCubic 缓动函数
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + (endValue - startValue) * easeProgress;
      
      setDisplayValue(currentValue);
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        prevValueRef.current = safeValue;
      }
    };
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [safeValue, duration]);
  
  const formattedValue = displayValue.toFixed(decimals);
  
  if (hidden) {
    return (
      <span className={`animated-number ${className}`}>
        {prefix && <span className="animated-number-prefix">{prefix}</span>}
        <span className="animated-number-value hidden">****</span>
        {suffix && <span className="animated-number-suffix">{suffix}</span>}
      </span>
    );
  }
  
  return (
    <span className={`animated-number ${className}`}>
      {prefix && <span className="animated-number-prefix">{prefix}</span>}
      <motion.span 
        className="animated-number-value"
        key={formattedValue}
        initial={{ opacity: 0.5, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.1 }}
      >
        {formattedValue}
      </motion.span>
      {suffix && <span className="animated-number-suffix">{suffix}</span>}
    </span>
  );
}
