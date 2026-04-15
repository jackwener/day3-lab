import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CalendarOutlined, 
  PlusOutlined, 
  SwapOutlined, 
  DownOutlined,
  SearchOutlined,
  PlusCircleOutlined,
  DeleteOutlined,
  CloseOutlined,
  FilterOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined
} from '@ant-design/icons';
import { Drawer, Input, Button, Select, Modal } from 'antd';
import { useGoldContext } from '../../store/GoldContext';
import { useMarketPrice } from '../../hooks/useMarketPrice';
import { useGoldRecords } from '../../hooks/useGoldRecords';
import { useLedger } from '../../hooks/useLedger';
// import type { GetGoldRecordsOptions } from '../../services/storageService';
import AssetOverview from '../../components/AssetOverview';
import GoldCard from '../../components/GoldCard';
import EmptyState from '../../components/EmptyState';
import './index.css';

const { Option } = Select;

type SortField = 'purchase_date' | 'weight' | 'total_price';
type SortOrder = 'asc' | 'desc';

export default function GoldHome() {
  const navigate = useNavigate();
  const { currentLedger, ledgers, goldRecords, isLoading } = useGoldContext();
  const { currentPrice } = useMarketPrice();
  const { deleteRecord } = useGoldRecords();
  const { createLedger, deleteLedger, switchLedger } = useLedger();
  
  // Drawer状态
  const [ledgerDrawerOpen, setLedgerDrawerOpen] = useState(false);
  const [newLedgerName, setNewLedgerName] = useState('');
  
  // 筛选排序状态
  const [channelFilter, setChannelFilter] = useState<string | undefined>(undefined);
  const [sortField, setSortField] = useState<SortField>('purchase_date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  
  // 获取渠道列表（去重）
  const channels = useMemo(() => {
    const channelSet = new Set(goldRecords.map(r => r.channel));
    return Array.from(channelSet);
  }, [goldRecords]);
  
  // 筛选排序后的记录
  const filteredRecords = useMemo(() => {
    let records = [...goldRecords];
    
    // 渠道筛选
    if (channelFilter) {
      records = records.filter(r => r.channel === channelFilter);
    }
    
    // 排序
    records.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'purchase_date':
          comparison = new Date(a.purchase_date).getTime() - new Date(b.purchase_date).getTime();
          break;
        case 'weight':
          comparison = a.weight - b.weight;
          break;
        case 'total_price':
          comparison = a.total_price - b.total_price;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return records;
  }, [goldRecords, channelFilter, sortField, sortOrder]);
  
  // 创建新账本
  const handleCreateLedger = () => {
    const name = newLedgerName.trim();
    if (!name) return;
    
    try {
      createLedger(name);
      setNewLedgerName('');
    } catch (error) {
      // 错误已在hook中处理
    }
  };
  
  // 删除账本
  const handleDeleteLedger = (id: string, name: string) => {
    Modal.confirm({
      title: '删除账本',
      content: `确定要删除账本"${name}"吗？该账本下的所有记录都将被删除。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        deleteLedger(id);
      },
    });
  };
  
  // 切换排序
  const handleSortToggle = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };
  
  // 获取排序图标
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? <SortAscendingOutlined /> : <SortDescendingOutlined />;
  };

  return (
    <div className="gold-home">
      <div className="gold-home-container">
        {/* 顶部栏 */}
        <motion.div 
          className="gold-home-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* 账本选择器 */}
          <motion.button
            className="gold-home-ledger-selector"
            onClick={() => setLedgerDrawerOpen(true)}
            whileTap={{ scale: 0.98 }}
          >
            <span className="gold-home-ledger-name">
              {currentLedger?.name || '选择账本'}
            </span>
            <DownOutlined className="gold-home-ledger-arrow" />
          </motion.button>
          
          {/* 搜索图标 */}
          <motion.button
            className="gold-home-search-btn"
            whileTap={{ scale: 0.9 }}
          >
            <SearchOutlined />
          </motion.button>
        </motion.div>

        {/* 资产总览卡片 */}
        <AssetOverview currentPrice={currentPrice} />

        {/* 操作按钮行 */}
        <motion.div 
          className="gold-home-actions"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          {/* 攒金日历 */}
          <motion.button
            className="gold-home-action-btn"
            onClick={() => navigate('/gold/calendar')}
            whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(212, 168, 67, 0.3)' }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="gold-home-action-icon">
              <CalendarOutlined />
            </div>
            <span className="gold-home-action-label">攒金日历</span>
          </motion.button>

          {/* 添加黄金 - 主按钮 */}
          <motion.button
            className="gold-home-action-btn gold-home-action-btn-primary"
            onClick={() => navigate('/gold/add')}
            whileHover={{ scale: 1.08, boxShadow: '0 0 30px rgba(212, 168, 67, 0.5)' }}
            whileTap={{ scale: 0.92 }}
          >
            <div className="gold-home-action-icon">
              <PlusOutlined />
            </div>
            <span className="gold-home-action-label">添加黄金</span>
          </motion.button>

          {/* 赠卖记录 */}
          <motion.button
            className="gold-home-action-btn"
            onClick={() => navigate('/gold/gift-sell')}
            whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(212, 168, 67, 0.3)' }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="gold-home-action-icon">
              <SwapOutlined />
            </div>
            <span className="gold-home-action-label">赠卖记录</span>
          </motion.button>
        </motion.div>

        {/* 筛选排序行 */}
        <motion.div 
          className="gold-home-filter-bar"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          {/* 渠道筛选 */}
          <div className="gold-home-filter">
            <FilterOutlined className="gold-home-filter-icon" />
            <Select
              className="gold-home-filter-select"
              placeholder="全部渠道"
              allowClear
              value={channelFilter}
              onChange={setChannelFilter}
              bordered={false}
              dropdownStyle={{ 
                background: 'rgba(30, 30, 45, 0.95)',
                border: '1px solid rgba(212, 168, 67, 0.3)',
                borderRadius: '8px'
              }}
            >
              {channels.map(channel => (
                <Option key={channel} value={channel}>{channel}</Option>
              ))}
            </Select>
          </div>

          {/* 排序按钮组 */}
          <div className="gold-home-sort-group">
            <button 
              className={`gold-home-sort-btn ${sortField === 'purchase_date' ? 'active' : ''}`}
              onClick={() => handleSortToggle('purchase_date')}
            >
              日期 {getSortIcon('purchase_date')}
            </button>
            <button 
              className={`gold-home-sort-btn ${sortField === 'weight' ? 'active' : ''}`}
              onClick={() => handleSortToggle('weight')}
            >
              重量 {getSortIcon('weight')}
            </button>
            <button 
              className={`gold-home-sort-btn ${sortField === 'total_price' ? 'active' : ''}`}
              onClick={() => handleSortToggle('total_price')}
            >
              价格 {getSortIcon('total_price')}
            </button>
          </div>
        </motion.div>

        {/* 记录列表 */}
        <motion.div 
          className="gold-home-list"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <AnimatePresence mode="wait">
            {isLoading ? (
              // 加载状态
              <motion.div
                key="loading"
                className="gold-home-loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="gold-home-loading-spinner" />
                <span>加载中...</span>
              </motion.div>
            ) : filteredRecords.length === 0 ? (
              // 空状态
              <EmptyState key="empty" />
            ) : (
              // 记录列表
              <motion.div
                key="list"
                className="gold-home-records"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {filteredRecords.map((record, index) => (
                  <GoldCard
                    key={record.id}
                    record={record}
                    index={index}
                    onDelete={deleteRecord}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* 账本管理Drawer */}
        <Drawer
          title="选择账本"
          placement="left"
          onClose={() => setLedgerDrawerOpen(false)}
          open={ledgerDrawerOpen}
          className="gold-home-drawer"
          styles={{
            header: {
              background: 'rgba(15, 15, 26, 0.95)',
              borderBottom: '1px solid rgba(212, 168, 67, 0.2)',
              color: '#fff'
            },
            body: {
              background: 'rgba(15, 15, 26, 0.95)',
              padding: '16px'
            },
            mask: {
              background: 'rgba(0, 0, 0, 0.6)'
            }
          }}
          closeIcon={<CloseOutlined style={{ color: '#fff' }} />}
        >
          <div className="gold-home-ledger-list">
            <AnimatePresence>
              {ledgers.map((ledger, index) => (
                <motion.div
                  key={ledger.id}
                  className={`gold-home-ledger-item ${currentLedger?.id === ledger.id ? 'active' : ''}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => {
                    switchLedger(ledger.id);
                    setLedgerDrawerOpen(false);
                  }}
                >
                  <span className="gold-home-ledger-item-name">{ledger.name}</span>
                  {ledger.is_default && (
                    <span className="gold-home-ledger-item-badge">默认</span>
                  )}
                  {!ledger.is_default && (
                    <button
                      className="gold-home-ledger-item-delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteLedger(ledger.id, ledger.name);
                      }}
                    >
                      <DeleteOutlined />
                    </button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* 新建账本 */}
          <div className="gold-home-new-ledger">
            <Input
              placeholder="新账本名称"
              value={newLedgerName}
              onChange={(e) => setNewLedgerName(e.target.value)}
              onPressEnter={handleCreateLedger}
              className="gold-home-new-ledger-input"
              maxLength={20}
            />
            <Button
              type="primary"
              icon={<PlusCircleOutlined />}
              onClick={handleCreateLedger}
              disabled={!newLedgerName.trim()}
              className="gold-home-new-ledger-btn"
            >
              新建
            </Button>
          </div>
        </Drawer>
      </div>
    </div>
  );
}
