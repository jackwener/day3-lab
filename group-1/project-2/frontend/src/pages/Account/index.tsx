import { motion } from 'framer-motion'
import './index.css'

export default function Account() {
  return (
    <motion.div
      className="page-container"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h1 className="page-title">记账</h1>
      <p className="page-subtitle">记录您的日常收支（预留）</p>
    </motion.div>
  )
}
