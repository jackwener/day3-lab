import { useCallback, useState } from 'react';
import { useGoldContext } from '../store/GoldContext';
import {
  addGoldRecord as addGoldRecordService,
  updateGoldRecord as updateGoldRecordService,
  deleteGoldRecord as deleteGoldRecordService,
  type GoldRecord,
  type GetGoldRecordsOptions,
} from '../services/storageService';

export interface UseGoldRecordsReturn {
  // 数据
  records: GoldRecord[];
  recordCount: number;
  
  // 操作
  addRecord: (data: Omit<GoldRecord, 'id' | 'created_at' | 'updated_at' | 'ledger_id'>) => GoldRecord;
  updateRecord: (id: string, data: Partial<Omit<GoldRecord, 'id' | 'created_at'>>) => GoldRecord;
  deleteRecord: (id: string) => void;
  refresh: (options?: GetGoldRecordsOptions) => void;
  
  // 筛选/排序状态
  currentOptions: GetGoldRecordsOptions;
  setFilter: (channel?: string) => void;
  setSort: (sortBy: GetGoldRecordsOptions['sortBy'], sortOrder?: 'asc' | 'desc') => void;
  clearFilters: () => void;
  
  // 操作状态
  isAdding: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  error: string | null;
  clearError: () => void;
}

const DEFAULT_OPTIONS: GetGoldRecordsOptions = {
  sortBy: 'purchase_date',
  sortOrder: 'desc',
};

/**
 * 黄金记录操作 Hook
 * 封装黄金记录的增删改查和筛选排序
 */
export function useGoldRecords(): UseGoldRecordsReturn {
  const {
    goldRecords: records,
    currentLedger,
    refreshRecords,
  } = useGoldContext();
  
  const [options, setOptions] = useState<GetGoldRecordsOptions>(DEFAULT_OPTIONS);
  const [isAdding, setIsAdding] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  /**
   * 添加记录
   */
  const addRecord = useCallback((
    data: Omit<GoldRecord, 'id' | 'created_at' | 'updated_at' | 'ledger_id'>
  ): GoldRecord => {
    setIsAdding(true);
    setError(null);
    
    try {
      // 校验
      if (!currentLedger) {
        throw new Error('未选择账本');
      }
      if (data.weight <= 0) {
        throw new Error('重量必须大于0');
      }
      if (data.total_price <= 0 && data.unit_price <= 0) {
        throw new Error('价格必须大于0');
      }
      
      const newRecord = addGoldRecordService({
        ...data,
        ledger_id: currentLedger.id,
      });
      
      refreshRecords(options);
      return newRecord;
    } catch (err) {
      const message = err instanceof Error ? err.message : '添加记录失败';
      setError(message);
      throw err;
    } finally {
      setIsAdding(false);
    }
  }, [currentLedger, options, refreshRecords]);
  
  /**
   * 更新记录
   */
  const updateRecord = useCallback((
    id: string,
    data: Partial<Omit<GoldRecord, 'id' | 'created_at'>>
  ): GoldRecord => {
    setIsUpdating(true);
    setError(null);
    
    try {
      const updatedRecord = updateGoldRecordService(id, data);
      refreshRecords(options);
      return updatedRecord;
    } catch (err) {
      const message = err instanceof Error ? err.message : '更新记录失败';
      setError(message);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }, [options, refreshRecords]);
  
  /**
   * 删除记录
   */
  const deleteRecord = useCallback((id: string): void => {
    setIsDeleting(true);
    setError(null);
    
    try {
      deleteGoldRecordService(id);
      refreshRecords(options);
    } catch (err) {
      const message = err instanceof Error ? err.message : '删除记录失败';
      setError(message);
      throw err;
    } finally {
      setIsDeleting(false);
    }
  }, [options, refreshRecords]);
  
  /**
   * 刷新记录
   */
  const refresh = useCallback((newOptions?: GetGoldRecordsOptions) => {
    const mergedOptions = { ...options, ...newOptions };
    setOptions(mergedOptions);
    refreshRecords(mergedOptions);
  }, [options, refreshRecords]);
  
  /**
   * 设置渠道筛选
   */
  const setFilter = useCallback((channel?: string) => {
    const newOptions = { ...options, channel };
    setOptions(newOptions);
    refreshRecords(newOptions);
  }, [options, refreshRecords]);
  
  /**
   * 设置排序
   */
  const setSort = useCallback((
    sortBy: GetGoldRecordsOptions['sortBy'],
    sortOrder: 'asc' | 'desc' = 'desc'
  ) => {
    const newOptions = { ...options, sortBy, sortOrder };
    setOptions(newOptions);
    refreshRecords(newOptions);
  }, [options, refreshRecords]);
  
  /**
   * 清除筛选
   */
  const clearFilters = useCallback(() => {
    setOptions(DEFAULT_OPTIONS);
    refreshRecords(DEFAULT_OPTIONS);
  }, [refreshRecords]);
  
  return {
    records,
    recordCount: records.length,
    addRecord,
    updateRecord,
    deleteRecord,
    refresh,
    currentOptions: options,
    setFilter,
    setSort,
    clearFilters,
    isAdding,
    isUpdating,
    isDeleting,
    error,
    clearError,
  };
}

export default useGoldRecords;
