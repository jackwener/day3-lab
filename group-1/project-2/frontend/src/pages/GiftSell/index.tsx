import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusOutlined, DeleteOutlined, GiftOutlined, DollarOutlined } from '@ant-design/icons';
import { Button, Modal, Input, DatePicker, message, Popconfirm } from 'antd';
import dayjs from 'dayjs';
import { useGoldContext } from '../../store/GoldContext';
import { addGiftSellRecord, deleteGiftSellRecord, type GiftSellRecord } from '../../services/storageService';
import { formatWeight } from '../../utils/units';
import './index.css';

const { TextArea } = Input;

export default function GiftSell() {
  const { giftSellRecords, currentLedger, preferredUnit, refreshGiftSellRecords } = useGoldContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [recordType, setRecordType] = useState<'gift' | 'sell'>('gift');
  const [weight, setWeight] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(dayjs());
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenModal = () => {
    setRecordType('gift');
    setWeight('');
    setAmount('');
    setDate(dayjs());
    setNote('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSubmit = async () => {
    if (!currentLedger) {
      message.error('请先选择账本');
      return;
    }

    const weightNum = parseFloat(weight);
    if (!weight || isNaN(weightNum) || weightNum <= 0) {
      message.error('请输入有效的重量');
      return;
    }

    if (recordType === 'sell') {
      const amountNum = parseFloat(amount);
      if (!amount || isNaN(amountNum) || amountNum <= 0) {
        message.error('请输入有效的金额');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await addGiftSellRecord({
        ledger_id: currentLedger.id,
        type: recordType,
        weight: weightNum,
        amount: recordType === 'sell' ? parseFloat(amount) : 0,
        date: date.format('YYYY-MM-DD'),
        note: note.trim(),
      });
      message.success('添加成功');
      refreshGiftSellRecords();
      handleCloseModal();
    } catch (error) {
      message.error('添加失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteGiftSellRecord(id);
      message.success('删除成功');
      refreshGiftSellRecords();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
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

  const renderRecordCard = (record: GiftSellRecord, _index: number) => {
    const isGift = record.type === 'gift';
    return (
      <motion.div
        key={record.id}
        variants={itemVariants}
        className="giftsell-card"
        layout
      >
        <div className="giftsell-card-content">
          <div className="giftsell-card-header">
            <span className={`giftsell-tag ${isGift ? 'giftsell-tag-gift' : 'giftsell-tag-sell'}`}>
              {isGift ? <GiftOutlined /> : <DollarOutlined />}
              {isGift ? '赠送' : '出售'}
            </span>
            <span className="giftsell-date">{record.date}</span>
          </div>
          <div className="giftsell-card-body">
            <div className="giftsell-weight">
              {formatWeight(record.weight, preferredUnit)}
            </div>
            <div className={`giftsell-amount ${isGift ? 'giftsell-amount-gift' : ''}`}>
              {isGift ? '—' : `¥${record.amount.toFixed(2)}`}
            </div>
          </div>
          {record.note && (
            <div className="giftsell-note">{record.note}</div>
          )}
        </div>
        <Popconfirm
          title="确认删除"
          description="确定要删除这条记录吗？"
          onConfirm={() => handleDelete(record.id)}
          okText="删除"
          cancelText="取消"
          okButtonProps={{ danger: true }}
        >
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            className="giftsell-delete-btn"
          />
        </Popconfirm>
      </motion.div>
    );
  };

  return (
    <motion.div
      className="giftsell-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* 顶部栏 */}
      <div className="giftsell-header">
        <h1 className="giftsell-title">赠卖记录</h1>
        <Button
          type="primary"
          shape="circle"
          icon={<PlusOutlined />}
          onClick={handleOpenModal}
          className="giftsell-add-btn"
        />
      </div>

      {/* 记录列表 */}
      <div className="giftsell-list">
        {giftSellRecords.length === 0 ? (
          <motion.div
            className="giftsell-empty"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <GiftOutlined className="giftsell-empty-icon" />
            <p>暂无赠卖记录</p>
            <span>点击右上角添加按钮开始记录</span>
          </motion.div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <AnimatePresence mode="popLayout">
              {giftSellRecords.map((record, index) => renderRecordCard(record, index))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* 添加弹窗 */}
      <Modal
        title="添加赠卖记录"
        open={isModalOpen}
        onCancel={handleCloseModal}
        footer={null}
        className="giftsell-modal"
        maskStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="giftsell-modal-content"
        >
          {/* 类型选择 */}
          <div className="giftsell-type-selector">
            <button
              className={`giftsell-type-btn ${recordType === 'gift' ? 'active' : ''}`}
              onClick={() => setRecordType('gift')}
            >
              <GiftOutlined />
              <span>赠送</span>
            </button>
            <button
              className={`giftsell-type-btn ${recordType === 'sell' ? 'active' : ''}`}
              onClick={() => setRecordType('sell')}
            >
              <DollarOutlined />
              <span>出售</span>
            </button>
          </div>

          {/* 重量输入 */}
          <div className="giftsell-form-item">
            <label>重量（克）</label>
            <Input
              type="number"
              placeholder="请输入重量"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="giftsell-input"
              size="large"
            />
          </div>

          {/* 金额输入 */}
          {recordType === 'sell' && (
            <motion.div
              className="giftsell-form-item"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <label>金额（元）</label>
              <Input
                type="number"
                placeholder="请输入出售金额"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="giftsell-input"
                size="large"
                prefix="¥"
              />
            </motion.div>
          )}

          {/* 日期选择 */}
          <div className="giftsell-form-item">
            <label>日期</label>
            <DatePicker
              value={date}
              onChange={(d) => d && setDate(d)}
              className="giftsell-datepicker"
              size="large"
              style={{ width: '100%' }}
            />
          </div>

          {/* 备注 */}
          <div className="giftsell-form-item">
            <label>备注（可选）</label>
            <TextArea
              placeholder="添加备注信息..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="giftsell-textarea"
              rows={2}
            />
          </div>

          {/* 保存按钮 */}
          <Button
            type="primary"
            size="large"
            block
            loading={isSubmitting}
            onClick={handleSubmit}
            className="giftsell-submit-btn"
          >
            保存
          </Button>
        </motion.div>
      </Modal>
    </motion.div>
  );
}
