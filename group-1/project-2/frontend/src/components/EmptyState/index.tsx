import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import './index.css';

export default function EmptyState() {
  const navigate = useNavigate();

  return (
    <motion.div
      className="empty-state"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ 
        duration: 0.5, 
        type: 'spring',
        stiffness: 200,
        damping: 15
      }}
    >
      {/* 金条SVG图标 */}
      <motion.div
        className="empty-state-icon-wrapper"
        animate={{ y: [0, -10, 0] }}
        transition={{ 
          duration: 3, 
          repeat: Infinity, 
          ease: 'easeInOut' 
        }}
      >
        <svg
          className="empty-state-icon"
          viewBox="0 0 120 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* 金条主体 */}
          <defs>
            <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#D4A843" />
              <stop offset="50%" stopColor="#F0D78C" />
              <stop offset="100%" stopColor="#B8860B" />
            </linearGradient>
            <linearGradient id="goldGradientDark" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#B8860B" />
              <stop offset="50%" stopColor="#D4A843" />
              <stop offset="100%" stopColor="#B8860B" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {/* 金条顶面 */}
          <path
            d="M20 30 L60 10 L100 30 L60 50 Z"
            fill="url(#goldGradient)"
            filter="url(#glow)"
          />
          
          {/* 金条正面 */}
          <path
            d="M20 30 L60 50 L60 85 L20 65 Z"
            fill="#D4A843"
          />
          
          {/* 金条右面 */}
          <path
            d="M60 50 L100 30 L100 65 L60 85 Z"
            fill="#B8860B"
          />
          
          {/* 金条高光 */}
          <path
            d="M25 35 L55 50 L55 55 L25 40 Z"
            fill="rgba(255,255,255,0.3)"
          />
          
          {/* 金条上的印记 */}
          <rect x="45" y="25" width="30" height="15" rx="2" fill="rgba(0,0,0,0.2)" />
          <text x="60" y="36" textAnchor="middle" fill="rgba(0,0,0,0.4)" fontSize="8" fontWeight="bold">Au</text>
          
          {/* 闪光效果 */}
          <motion.circle
            cx="30"
            cy="25"
            r="3"
            fill="#fff"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
          />
          <motion.circle
            cx="85"
            cy="35"
            r="2"
            fill="#fff"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 2, repeat: Infinity, delay: 1.2 }}
          />
        </svg>
      </motion.div>

      {/* 文案 */}
      <motion.p
        className="empty-state-text"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        还没有黄金记录，快去攒金吧！
      </motion.p>

      {/* CTA按钮 */}
      <motion.button
        className="empty-state-btn"
        onClick={() => navigate('/gold/add')}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        whileHover={{ 
          scale: 1.05,
          boxShadow: '0 8px 30px rgba(212, 168, 67, 0.4)'
        }}
        whileTap={{ scale: 0.95 }}
      >
        添加第一笔黄金
      </motion.button>
    </motion.div>
  );
}
