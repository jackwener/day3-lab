import { useCallback, useState } from 'react';
import { useGoldContext } from '../store/GoldContext';
import {
  createLedger as createLedgerService,
  deleteLedger as deleteLedgerService,
  type Ledger,
} from '../services/storageService';

export interface UseLedgerReturn {
  // 数据
  ledgers: Ledger[];
  currentLedger: Ledger | null;
  
  // 操作
  createLedger: (name: string) => Ledger;
  deleteLedger: (id: string) => void;
  switchLedger: (id: string) => void;
  
  // 状态
  isCreating: boolean;
  isDeleting: boolean;
  error: string | null;
  clearError: () => void;
}

/**
 * 账本操作 Hook
 * 封装账本相关操作，使用 GoldContext 管理状态
 */
export function useLedger(): UseLedgerReturn {
  const {
    ledgers,
    currentLedger,
    switchLedger: switchLedgerContext,
    refreshLedgers,
  } = useGoldContext();
  
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  /**
   * 创建新账本
   */
  const createLedger = useCallback((name: string): Ledger => {
    setIsCreating(true);
    setError(null);
    
    try {
      // 校验名称
      const trimmedName = name.trim();
      if (!trimmedName) {
        throw new Error('账本名称不能为空');
      }
      if (trimmedName.length > 20) {
        throw new Error('账本名称不能超过20个字符');
      }
      if (ledgers.some(l => l.name === trimmedName)) {
        throw new Error('账本名称已存在');
      }
      
      const newLedger = createLedgerService(trimmedName);
      refreshLedgers();
      
      // 自动切换到新创建的账本
      switchLedgerContext(newLedger.id);
      
      return newLedger;
    } catch (err) {
      const message = err instanceof Error ? err.message : '创建账本失败';
      setError(message);
      throw err;
    } finally {
      setIsCreating(false);
    }
  }, [ledgers, refreshLedgers, switchLedgerContext]);
  
  /**
   * 删除账本
   */
  const deleteLedger = useCallback((id: string): void => {
    setIsDeleting(true);
    setError(null);
    
    try {
      deleteLedgerService(id);
      refreshLedgers();
    } catch (err) {
      const message = err instanceof Error ? err.message : '删除账本失败';
      setError(message);
      throw err;
    } finally {
      setIsDeleting(false);
    }
  }, [refreshLedgers]);
  
  /**
   * 切换账本
   */
  const switchLedger = useCallback((id: string): void => {
    setError(null);
    switchLedgerContext(id);
  }, [switchLedgerContext]);
  
  return {
    ledgers,
    currentLedger,
    createLedger,
    deleteLedger,
    switchLedger,
    isCreating,
    isDeleting,
    error,
    clearError,
  };
}

export default useLedger;
