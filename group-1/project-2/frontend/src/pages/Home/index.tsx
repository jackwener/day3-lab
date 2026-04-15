import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  GoldOutlined,
  LineChartOutlined,
  ShoppingOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useGoldContext } from '../../store/GoldContext';
import { formatWeight } from '../../utils/units';
import './index.css';

export default function Home() {
  const navigate = useNavigate();
  const { goldRecords, preferredUnit } = useGoldContext();

  // 获取最近3条记录
  const recentRecords = useMemo(() => {
    return [...goldRecords]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 3);
  }, [goldRecords]);

  const hasRecords = goldRecords.length > 0;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring' as const,
        stiffness: 100,
        damping: 15,
      },
    },
  };

  return (
    <motion.div
      className="home-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* 欢迎区域 */}
      <motion.div
        className="home-hero"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="home-hero-bg">
          <div className="home-hero-glow" />
        </div>
        <div className="home-hero-content">
          <motion.div
            className="home-logo"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          >
            <div className="home-logo-icon">
              <GoldOutlined />
            </div>
            <div className="home-logo-shine" />
          </motion.div>
          <motion.h1
            className="home-title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            欢迎来到金产产
          </motion.h1>
          <motion.p
            className="home-subtitle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            记录每一份金色的积累
          </motion.p>
        </div>
      </motion.div>

      {/* 最近动态 */}
      <motion.div
        className="home-section"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div className="home-section-header" variants={itemVariants}>
          <h2 className="home-section-title">最近攒金动态</h2>
          {hasRecords && (
            <span className="home-section-count">共 {goldRecords.length} 条记录</span>
          )}
        </motion.div>

        {hasRecords ? (
          <div className="home-records">
            {recentRecords.map((record) => (
              <motion.div
                key={record.id}
                className="home-record-item"
                variants={itemVariants}
                whileHover={{ scale: 1.02, x: 4 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="home-record-icon">
                  <ShoppingOutlined />
                </div>
                <div className="home-record-info">
                  <span className="home-record-weight">
                    {formatWeight(record.weight, preferredUnit)}
                  </span>
                  <span className="home-record-channel">{record.channel}</span>
                </div>
                <div className="home-record-price">
                  ¥{record.total_price.toFixed(2)}
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div
            className="home-empty"
            variants={itemVariants}
          >
            <div className="home-empty-icon">
              <GoldOutlined />
            </div>
            <p className="home-empty-text">开始你的攒金之旅吧</p>
            <p className="home-empty-hint">记录每一笔黄金投资，见证财富积累</p>
          </motion.div>
        )}
      </motion.div>

      {/* 快捷入口 */}
      <motion.div
        className="home-actions"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Button
          type="primary"
          size="large"
          icon={<ShoppingOutlined />}
          onClick={() => navigate('/gold')}
          className="home-action-btn home-action-primary"
        >
          去攒金
          <RightOutlined className="home-action-arrow" />
        </Button>
        <Button
          size="large"
          icon={<LineChartOutlined />}
          onClick={() => navigate('/market')}
          className="home-action-btn home-action-secondary"
        >
          看金价
          <RightOutlined className="home-action-arrow" />
        </Button>
      </motion.div>

      {/* 装饰元素 */}
      <div className="home-decoration">
        <motion.div
          className="home-deco-circle"
          animate={{
            y: [0, -10, 0],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="home-deco-circle-2"
          animate={{
            y: [0, 10, 0],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 1,
          }}
        />
      </div>
    </motion.div>
  );
}
