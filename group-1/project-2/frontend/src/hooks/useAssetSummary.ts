import { useMemo } from 'react';
import { useGoldContext } from '../store/GoldContext';
import { calculateAssetSummary, type AssetSummary as AssetSummaryData } from '../services/storageService';

export interface UseAssetSummaryReturn extends AssetSummaryData {
  // 额外计算字段
  avgUnitPrice: number;  // 平均单价（元/克）
  profitRate: number;    // 收益率（%）
}

/**
 * 资产总览计算 Hook
 * 封装资产总览计算（与spec的计算逻辑完全一致）
 * 
 * 计算逻辑：
 * - totalWeight = Σ黄金记录重量 - Σ赠卖记录重量
 * - totalCost = Σ黄金记录总价 - 出售记录按比例扣除的成本
 * - estimatedValue = totalWeight × currentPrice
 * - estimatedProfit = estimatedValue - totalCost
 */
export function useAssetSummary(currentPrice: number | null): UseAssetSummaryReturn {
  const { currentLedger, goldRecords, giftSellRecords } = useGoldContext();
  
  const summary = useMemo<UseAssetSummaryReturn>(() => {
    // 如果没有当前账本或金价数据，返回默认值
    if (!currentLedger || currentPrice === null) {
      return {
        totalWeight: 0,
        totalCost: 0,
        estimatedValue: 0,
        estimatedProfit: 0,
        recordCount: 0,
        avgUnitPrice: 0,
        profitRate: 0,
      };
    }
    
    // 使用 storageService 中的计算函数（与spec一致）
    const baseSummary = calculateAssetSummary(currentLedger.id, currentPrice);
    
    // 计算额外字段
    const avgUnitPrice = baseSummary.totalWeight > 0
      ? Math.round((baseSummary.totalCost / baseSummary.totalWeight) * 100) / 100
      : 0;
    
    const profitRate = baseSummary.totalCost > 0
      ? Math.round((baseSummary.estimatedProfit / baseSummary.totalCost) * 10000) / 100
      : 0;
    
    return {
      ...baseSummary,
      avgUnitPrice,
      profitRate,
    };
  }, [currentLedger, currentPrice, goldRecords, giftSellRecords]);
  
  return summary;
}

export default useAssetSummary;
