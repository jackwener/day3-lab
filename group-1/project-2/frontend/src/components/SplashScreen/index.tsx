import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import './index.css'

interface SplashScreenProps {
  onComplete?: () => void
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [visible, setVisible] = useState(true)
  const [showGlow, setShowGlow] = useState(false)

  useEffect(() => {
    // 文字出现后触发光晕
    const glowTimer = setTimeout(() => {
      setShowGlow(true)
    }, 800)

    // 2秒后隐藏 splash
    const hideTimer = setTimeout(() => {
      setVisible(false)
      onComplete?.()
    }, 2000)

    return () => {
      clearTimeout(glowTimer)
      clearTimeout(hideTimer)
    }
  }, [onComplete])

  const titleChars = ['金', '产', '产']

  const containerVariants = {
    hidden: { opacity: 1 },
    exit: {
      opacity: 0,
      y: -50,
      transition: {
        duration: 0.5,
        ease: 'easeInOut' as const
      }
    }
  }

  const charVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.2,
        duration: 0.4,
        ease: 'easeOut' as const
      }
    })
  }

  const sloganVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        delay: 0.8,
        duration: 0.5,
        ease: 'easeOut' as const
      }
    }
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="splash-screen"
          variants={containerVariants}
          initial="hidden"
          exit="exit"
        >
          <div className="splash-content">
            <motion.div
              className={`splash-title ${showGlow ? 'glow' : ''}`}
              initial="hidden"
              animate="visible"
            >
              {titleChars.map((char, i) => (
                <motion.span
                  key={i}
                  custom={i}
                  variants={charVariants}
                  className="splash-char"
                >
                  {char}
                </motion.span>
              ))}
            </motion.div>

            <motion.p
              className="splash-slogan"
              variants={sloganVariants}
              initial="hidden"
              animate="visible"
            >
              用心攒金，闪耀人生
            </motion.p>
          </div>

          {/* 光晕扩散效果 */}
          <AnimatePresence>
            {showGlow && (
              <motion.div
                className="glow-ring"
                initial={{ scale: 0.5, opacity: 0.8 }}
                animate={{ scale: 3, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
              />
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
