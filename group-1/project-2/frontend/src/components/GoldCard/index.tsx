import { motion } from 'framer-motion';
import { PictureOutlined, DeleteOutlined } from '@ant-design/icons';
import { Modal } from 'antd';
import type { GoldRecord } from '../../services/storageService';
import { useGoldContext } from '../../store/GoldContext';
import { fromGrams, UNIT_LABELS } from '../../utils/units';
import dayjs from 'dayjs';
import './index.css';

interface GoldCardProps {
  record: GoldRecord;
  index: number;
  onClick?: (record: GoldRecord) => void;
  onDelete?: (id: string) => void;
}

export default function GoldCard({ record, index, onClick, onDelete }: GoldCardProps) {
  const { preferredUnit } = useGoldContext();
  
  // 计算显示重量
  const displayWeight = fromGrams(record.weight, preferredUnit);
  const decimals = preferredUnit === 'ton' ? 6 : 2;
  
  // 格式化日期
  const formattedDate = dayjs(record.purchase_date).format('YYYY-MM-DD');
  
  // 处理删除
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除这条 ${displayWeight.toFixed(decimals)}${UNIT_LABELS[preferredUnit]} 的黄金记录吗？`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => onDelete?.(record.id),
    });
  };
  
  return (
    <motion.div
      className="gold-card"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ 
        duration: 0.4, 
        delay: index * 0.08,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      whileHover={{ 
        y: -4,
        boxShadow: '0 12px 40px rgba(212, 168, 67, 0.25)',
        transition: { duration: 0.2 }
      }}
      onClick={() => onClick?.(record)}
    >
      {/* 左侧金色装饰条 */}
      <div className="gold-card-accent" />
      
      {/* 删除按钮 */}
      {onDelete && (
        <motion.button
          className="gold-card-delete"
          onClick={handleDelete}
          initial={{ opacity: 0, scale: 0.8 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <DeleteOutlined />
        </motion.button>
      )}
      
      {/* 主内容 */}
      <div className="gold-card-content">
        {/* 重量和价格 */}
        <div className="gold-card-main">
          <div className="gold-card-weight">
            <span className="gold-card-weight-value">
              {displayWeight.toFixed(decimals)}
            </span>
            <span className="gold-card-weight-unit">
              {UNIT_LABELS[preferredUnit]}
            </span>
          </div>
          <div className="gold-card-price">
            <span className="gold-card-price-label">总价</span>
            <span className="gold-card-price-value">¥{record.total_price.toFixed(2)}</span>
          </div>
        </div>
        
        {/* 底部信息 */}
        <div className="gold-card-footer">
          {/* 渠道标签 */}
          <span className="gold-card-channel">
            {record.channel}
          </span>
          
          {/* 日期和照片标记 */}
          <div className="gold-card-meta">
            <span className="gold-card-date">{formattedDate}</span>
            {record.photos && record.photos.length > 0 && (
              <span className="gold-card-photo-badge">
                <PictureOutlined />
                {record.photos.length > 1 && (
                  <span className="gold-card-photo-count">{record.photos.length}</span>
                )}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
