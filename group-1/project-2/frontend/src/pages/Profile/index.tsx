import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  UserOutlined,
  RightOutlined,
  ColumnHeightOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  FileTextOutlined,
  BookOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import { Modal, message } from 'antd';
import dayjs from 'dayjs';
import { useGoldContext } from '../../store/GoldContext';
import { setPreferredUnit } from '../../services/storageService';
import type { WeightUnit } from '../../utils/units';
import { UNIT_LABELS } from '../../utils/units';
import './index.css';

export default function Profile() {
  const { preferredUnit, goldRecords, ledgers, setUnit } = useGoldContext();
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);

  // 计算统计数据
  const stats = useMemo(() => {
    const uniqueDays = new Set(goldRecords.map(r => r.purchase_date)).size;
    return {
      totalRecords: goldRecords.length,
      totalLedgers: ledgers.length,
      savingDays: uniqueDays,
    };
  }, [goldRecords, ledgers]);

  // 计算加入天数
  const joinDays = useMemo(() => {
    if (goldRecords.length === 0) {
      // 如果没有记录，使用账本创建时间
      const earliestLedger = [...ledgers].sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )[0];
      if (earliestLedger) {
        return dayjs().diff(dayjs(earliestLedger.created_at), 'day') + 1;
      }
      return 1;
    }
    const earliestRecord = [...goldRecords].sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )[0];
    return dayjs().diff(dayjs(earliestRecord.created_at), 'day') + 1;
  }, [goldRecords, ledgers]);

  const handleUnitChange = (unit: WeightUnit) => {
    setUnit(unit);
    setPreferredUnit(unit);
    setIsUnitModalOpen(false);
    message.success(`已切换为${UNIT_LABELS[unit]}`);
  };

  const handleClearData = () => {
    Modal.confirm({
      title: '确认清除所有数据',
      content: '此操作将删除所有账本、黄金记录和赠卖记录，且无法恢复。确定要继续吗？',
      okText: '确认清除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => {
        localStorage.removeItem('goldchan_ledgers');
        localStorage.removeItem('goldchan_gold_records');
        localStorage.removeItem('goldchan_gift_sell_records');
        localStorage.removeItem('goldchan_settings');
        message.success('数据已清除，页面即将刷新');
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      },
    });
  };

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

  const unitOptions: { value: WeightUnit; label: string }[] = [
    { value: 'g', label: '克 (g)' },
    { value: 'liang', label: '两 (50g)' },
    { value: 'ton', label: '吨 (t)' },
  ];

  return (
    <motion.div
      className="profile-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* 顶部用户信息区 */}
      <motion.div
        className="profile-header"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="profile-header-bg">
          <div className="profile-header-glow" />
          <div className="profile-header-glow-2" />
        </div>
        <div className="profile-user">
          <motion.div
            className="profile-avatar"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          >
            <UserOutlined className="profile-avatar-icon" />
          </motion.div>
          <motion.h1
            className="profile-username"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            金产产用户
          </motion.h1>
          <motion.p
            className="profile-join-days"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            已加入 <span>{joinDays}</span> 天
          </motion.p>
        </div>
      </motion.div>

      {/* 数据概览卡片 */}
      <motion.div
        className="profile-stats"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div className="profile-stat-card" variants={itemVariants}>
          <FileTextOutlined className="profile-stat-icon" />
          <span className="profile-stat-value">{stats.totalRecords}</span>
          <span className="profile-stat-label">总记录</span>
        </motion.div>
        <motion.div className="profile-stat-card" variants={itemVariants}>
          <BookOutlined className="profile-stat-icon" />
          <span className="profile-stat-value">{stats.totalLedgers}</span>
          <span className="profile-stat-label">账本数</span>
        </motion.div>
        <motion.div className="profile-stat-card" variants={itemVariants}>
          <CalendarOutlined className="profile-stat-icon" />
          <span className="profile-stat-value">{stats.savingDays}</span>
          <span className="profile-stat-label">攒金天</span>
        </motion.div>
      </motion.div>

      {/* 设置列表 */}
      <motion.div
        className="profile-settings"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="profile-settings-title">设置</div>

        {/* 单位设置 */}
        <div
          className="profile-setting-item"
          onClick={() => setIsUnitModalOpen(true)}
        >
          <div className="profile-setting-left">
            <div className="profile-setting-icon">
              <ColumnHeightOutlined />
            </div>
            <span className="profile-setting-label">单位设置</span>
          </div>
          <div className="profile-setting-right">
            <span className="profile-setting-value">
              {UNIT_LABELS[preferredUnit]}
            </span>
            <RightOutlined className="profile-setting-arrow" />
          </div>
        </div>

        {/* 清除数据 */}
        <div className="profile-setting-item danger" onClick={handleClearData}>
          <div className="profile-setting-left">
            <div className="profile-setting-icon danger">
              <DeleteOutlined />
            </div>
            <span className="profile-setting-label">清除本地数据</span>
          </div>
          <div className="profile-setting-right">
            <RightOutlined className="profile-setting-arrow" />
          </div>
        </div>

        {/* 关于 */}
        <div className="profile-setting-item">
          <div className="profile-setting-left">
            <div className="profile-setting-icon">
              <InfoCircleOutlined />
            </div>
            <span className="profile-setting-label">关于金产产</span>
          </div>
          <div className="profile-setting-right">
            <span className="profile-setting-value">v1.0.0</span>
            <RightOutlined className="profile-setting-arrow" />
          </div>
        </div>
      </motion.div>

      {/* 底部 */}
      <motion.div
        className="profile-footer"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        <p className="profile-version">金产产 v1.0.0</p>
        <p className="profile-slogan">用心攒金，闪耀人生</p>
      </motion.div>

      {/* 单位选择弹窗 */}
      <Modal
        title="选择重量单位"
        open={isUnitModalOpen}
        onCancel={() => setIsUnitModalOpen(false)}
        footer={null}
        className="profile-unit-modal"
        maskStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      >
        <div className="profile-unit-options">
          {unitOptions.map((option) => (
            <button
              key={option.value}
              className={`profile-unit-option ${preferredUnit === option.value ? 'active' : ''}`}
              onClick={() => handleUnitChange(option.value)}
            >
              <span className="profile-unit-label">{option.label}</span>
              {preferredUnit === option.value && (
                <motion.div
                  className="profile-unit-check"
                  layoutId="unitCheck"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                >
                  ✓
                </motion.div>
              )}
            </button>
          ))}
        </div>
      </Modal>
    </motion.div>
  );
}
