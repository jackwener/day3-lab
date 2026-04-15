import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EyeOutlined, EyeInvisibleOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { useAssetSummary } from '../../hooks/useAssetSummary';
import { useGoldContext } from '../../store/GoldContext';
import { fromGrams, getFunMessage, UNIT_LABELS, type WeightUnit } from '../../utils/units';
import AnimatedNumber from '../AnimatedNumber';
import './index.css';

const UNIT_CYCLE: WeightUnit[] = ['g', 'liang', 'ton'];

interface AssetOverviewProps {
  currentPrice: number | null;
}

export default function AssetOverview({ currentPrice }: AssetOverviewProps) {
  const { preferredUnit, setUnit } = useGoldContext();
  const summary = useAssetSummary(currentPrice);
  const [hidden, setHidden] = useState(false);
  const [funMessage, setFunMessage] = useState('');

  // 切换单位
  const handleUnitToggle = () => {
    const currentIndex = UNIT_CYCLE.indexOf(preferredUnit);
    const nextIndex = (currentIndex + 1) % UNIT_CYCLE.length;
    const nextUnit = UNIT_CYCLE[nextIndex];
    setUnit(nextUnit);
    
    // 显示趣味文案
    const message = getFunMessage(summary.totalWeight, nextUnit);
    setFunMessage(message);
    setTimeout(() => setFunMessage(''), 3000);
  };

  // 计算当前单位下的重量值
  const displayWeight = fromGrams(summary.totalWeight, preferredUnit);
  const decimals = preferredUnit === 'ton' ? 6 : 2;

  // 收益正负
  const isProfitPositive = summary.estimatedProfit >= 0;

  return (
    <motion.div
      className="asset-overview"
      initial={{ opacity: 0, y: -30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      {/* 玻璃态背景光晕 */}
      <div className="asset-overview-glow" />
      
      {/* 头部：标题和隐显按钮 */}
      <div className="asset-overview-header">
        <span className="asset-overview-title">资产总览</span>
        <motion.button
          className="asset-overview-eye-btn"
          onClick={() => setHidden(!hidden)}
          whileTap={{ scale: 0.9 }}
        >
          {hidden ? <EyeInvisibleOutlined /> : <EyeOutlined />}
        </motion.button>
      </div>

      {/* 主内容区 */}
      <div className="asset-overview-content">
        {/* 总重量 - 可点击切换单位 */}
        <motion.div
          className="asset-overview-weight-section"
          onClick={handleUnitToggle}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="asset-overview-label">
            总重量
            <span className="asset-overview-unit-hint">(点击切换)</span>
          </div>
          <motion.div
            className="asset-overview-weight"
            key={preferredUnit}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <AnimatedNumber
              value={displayWeight}
              suffix={` ${UNIT_LABELS[preferredUnit]}`}
              decimals={decimals}
              duration={800}
              hidden={hidden}
              className="asset-overview-weight-number"
            />
          </motion.div>
          
          {/* 趣味文案 */}
          <AnimatePresence>
            {funMessage && (
              <motion.div
                className="asset-overview-fun-message"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {funMessage}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* 数据网格 */}
        <div className="asset-overview-grid">
          {/* 购入总价 */}
          <div className="asset-overview-item">
            <div className="asset-overview-item-label">购入总价</div>
            <div className="asset-overview-item-value">
              <AnimatedNumber
                value={summary.totalCost}
                prefix="¥"
                decimals={2}
                hidden={hidden}
              />
            </div>
          </div>

          {/* 预估价值 */}
          <div className="asset-overview-item">
            <div className="asset-overview-item-label">预估价值</div>
            <div className="asset-overview-item-value">
              <AnimatedNumber
                value={summary.estimatedValue}
                prefix="¥"
                decimals={2}
                hidden={hidden}
              />
            </div>
          </div>

          {/* 预估收益 */}
          <div className="asset-overview-item">
            <div className="asset-overview-item-label">预估收益</div>
            <div className={`asset-overview-item-value ${isProfitPositive ? 'profit-positive' : 'profit-negative'}`}>
              {isProfitPositive ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
              <AnimatedNumber
                value={Math.abs(summary.estimatedProfit)}
                prefix="¥"
                decimals={2}
                hidden={hidden}
              />
            </div>
          </div>

          {/* 记录数 */}
          <div className="asset-overview-item">
            <div className="asset-overview-item-label">记录数</div>
            <div className="asset-overview-item-value record-count">
              {hidden ? '****' : summary.recordCount}
              <span className="record-count-unit">笔</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
