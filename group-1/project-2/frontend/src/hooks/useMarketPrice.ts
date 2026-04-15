import { useCallback, useEffect, useRef, useState } from 'react';
import { marketApi, type PriceHistoryResponse } from '../services/apiService';

export type HistoryRange = 'realtime' | '1month' | '3month';

export interface UseMarketPriceReturn {
  // 当前金价
  currentPrice: number | null;
  priceUpdatedAt: string | null;
  
  // 历史数据
  priceHistory: PriceHistoryResponse['data'] | null;
  historyRange: HistoryRange;
  
  // 状态
  loading: boolean;
  historyLoading: boolean;
  error: string | null;
  
  // 操作
  fetchPrice: () => Promise<void>;
  fetchHistory: (range: HistoryRange) => Promise<void>;
  clearError: () => void;
}

// 5分钟刷新间隔（毫秒）
const REFRESH_INTERVAL = 5 * 60 * 1000;

/**
 * 金价数据 Hook
 * 封装金价获取、历史数据查询和自动刷新
 */
export function useMarketPrice(): UseMarketPriceReturn {
  // ===== State =====
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceUpdatedAt, setPriceUpdatedAt] = useState<string | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryResponse['data'] | null>(null);
  const [historyRange, setHistoryRange] = useState<HistoryRange>('realtime');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 使用 ref 存储 interval ID，避免闭包问题
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ===== Actions =====
  
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  /**
   * 获取当前金价
   */
  const fetchPrice = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await marketApi.getCurrentPrice();
      setCurrentPrice(response.price);
      setPriceUpdatedAt(response.updated_at);
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取金价失败';
      setError(message);
      console.error('Failed to fetch market price:', err);
    } finally {
      setLoading(false);
    }
  }, []);
  
  /**
   * 获取历史数据
   */
  const fetchHistory = useCallback(async (range: HistoryRange): Promise<void> => {
    setHistoryLoading(true);
    setError(null);
    
    try {
      const response = await marketApi.getPriceHistory(range);
      setPriceHistory(response.data);
      setHistoryRange(range);
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取历史数据失败';
      setError(message);
      console.error('Failed to fetch price history:', err);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  // ===== Effects =====
  
  // 初始加载
  useEffect(() => {
    fetchPrice();
    fetchHistory('realtime');
  }, [fetchPrice, fetchHistory]);
  
  // 自动刷新（5分钟）
  useEffect(() => {
    // 清除旧的 interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    // 设置新的 interval
    intervalRef.current = setInterval(() => {
      fetchPrice();
    }, REFRESH_INTERVAL);
    
    // 清理函数
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchPrice]);

  return {
    currentPrice,
    priceUpdatedAt,
    priceHistory,
    historyRange,
    loading,
    historyLoading,
    error,
    fetchPrice,
    fetchHistory,
    clearError,
  };
}

export default useMarketPrice;
