import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { WeightUnit } from '../utils/units';
import type { Ledger, GoldRecord, GiftSellRecord } from '../services/storageService';
import {
  getLedgers,
  getGoldRecords,
  getGiftSellRecords,
  getPreferredUnit,
  setPreferredUnit as savePreferredUnit,
  type GetGoldRecordsOptions,
} from '../services/storageService';

// ==================== Context Type Definition ====================

export interface GoldContextState {
  // 账本数据
  ledgers: Ledger[];
  currentLedger: Ledger | null;
  
  // 记录数据
  goldRecords: GoldRecord[];
  giftSellRecords: GiftSellRecord[];
  
  // 设置
  preferredUnit: WeightUnit;
  
  // 加载状态
  isLoading: boolean;
}

export interface GoldContextActions {
  // 账本操作
  switchLedger: (id: string) => void;
  refreshLedgers: () => void;
  
  // 记录操作
  refreshRecords: (options?: GetGoldRecordsOptions) => void;
  refreshGiftSellRecords: () => void;
  refreshAll: () => void;
  
  // 设置操作
  setUnit: (unit: WeightUnit) => void;
}

export type GoldContextValue = GoldContextState & GoldContextActions;

// ==================== Context Creation ====================

const GoldContext = createContext<GoldContextValue | null>(null);

// ==================== Hook ====================

export function useGoldContext(): GoldContextValue {
  const context = useContext(GoldContext);
  if (!context) {
    throw new Error('useGoldContext must be used within a GoldProvider');
  }
  return context;
}

// ==================== Provider Props ====================

export interface GoldProviderProps {
  children: ReactNode;
}

// ==================== Provider Component ====================

export function GoldProvider({ children }: GoldProviderProps): React.ReactElement {
  // ===== State =====
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [currentLedger, setCurrentLedger] = useState<Ledger | null>(null);
  const [goldRecords, setGoldRecords] = useState<GoldRecord[]>([]);
  const [giftSellRecords, setGiftSellRecords] = useState<GiftSellRecord[]>([]);
  const [preferredUnit, setPreferredUnitState] = useState<WeightUnit>('g');
  const [isLoading, setIsLoading] = useState(true);
  
  // 记录筛选/排序选项（内部状态，用于刷新时保持）
  const [recordsOptions, setRecordsOptions] = useState<GetGoldRecordsOptions | undefined>();

  // ===== Initialization =====
  useEffect(() => {
    // 初始化时从 localStorage 加载所有数据
    const initialize = () => {
      try {
        setIsLoading(true);
        
        // 加载账本列表（会自动创建默认账本）
        const loadedLedgers = getLedgers();
        setLedgers(loadedLedgers);
        
        // 设置当前账本为默认账本
        const defaultLedger = loadedLedgers.find(l => l.is_default) || loadedLedgers[0];
        setCurrentLedger(defaultLedger);
        
        // 加载该账本的记录
        if (defaultLedger) {
          const records = getGoldRecords(defaultLedger.id);
          setGoldRecords(records);
          
          const giftSell = getGiftSellRecords(defaultLedger.id);
          setGiftSellRecords(giftSell);
        }
        
        // 加载用户设置
        const unit = getPreferredUnit();
        setPreferredUnitState(unit);
      } catch (error) {
        console.error('Failed to initialize GoldContext:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    initialize();
  }, []);

  // ===== Actions =====
  
  /**
   * 切换当前账本
   */
  const switchLedger = useCallback((id: string) => {
    const target = ledgers.find(l => l.id === id);
    if (target) {
      setCurrentLedger(target);
      // 刷新该账本的记录
      const records = getGoldRecords(target.id, recordsOptions);
      setGoldRecords(records);
      const giftSell = getGiftSellRecords(target.id);
      setGiftSellRecords(giftSell);
    }
  }, [ledgers, recordsOptions]);
  
  /**
   * 刷新账本列表
   */
  const refreshLedgers = useCallback(() => {
    const loadedLedgers = getLedgers();
    setLedgers(loadedLedgers);
    
    // 如果当前账本不在列表中，切换到默认账本
    if (currentLedger && !loadedLedgers.find(l => l.id === currentLedger.id)) {
      const defaultLedger = loadedLedgers.find(l => l.is_default) || loadedLedgers[0];
      setCurrentLedger(defaultLedger);
      if (defaultLedger) {
        const records = getGoldRecords(defaultLedger.id, recordsOptions);
        setGoldRecords(records);
        const giftSell = getGiftSellRecords(defaultLedger.id);
        setGiftSellRecords(giftSell);
      }
    }
  }, [currentLedger, recordsOptions]);
  
  /**
   * 刷新黄金记录
   */
  const refreshRecords = useCallback((options?: GetGoldRecordsOptions) => {
    if (currentLedger) {
      setRecordsOptions(options);
      const records = getGoldRecords(currentLedger.id, options);
      setGoldRecords(records);
    }
  }, [currentLedger]);
  
  /**
   * 刷新赠卖记录
   */
  const refreshGiftSellRecords = useCallback(() => {
    if (currentLedger) {
      const giftSell = getGiftSellRecords(currentLedger.id);
      setGiftSellRecords(giftSell);
    }
  }, [currentLedger]);
  
  /**
   * 刷新所有数据
   */
  const refreshAll = useCallback(() => {
    refreshLedgers();
    refreshRecords(recordsOptions);
    refreshGiftSellRecords();
  }, [refreshLedgers, refreshRecords, refreshGiftSellRecords, recordsOptions]);
  
  /**
   * 设置首选单位
   */
  const setUnit = useCallback((unit: WeightUnit) => {
    setPreferredUnitState(unit);
    savePreferredUnit(unit);
  }, []);

  // ===== Context Value =====
  const value: GoldContextValue = {
    // State
    ledgers,
    currentLedger,
    goldRecords,
    giftSellRecords,
    preferredUnit,
    isLoading,
    // Actions
    switchLedger,
    refreshLedgers,
    refreshRecords,
    refreshGiftSellRecords,
    refreshAll,
    setUnit,
  };

  return (
    <GoldContext.Provider value={value}>
      {children}
    </GoldContext.Provider>
  );
}

export default GoldContext;
