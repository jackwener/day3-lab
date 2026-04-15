import { generateUUID } from '../utils/uuid';
import type { WeightUnit } from '../utils/units';

// LocalStorage Keys
const STORAGE_KEYS = {
  LEDGERS: 'goldchan_ledgers',
  GOLD_RECORDS: 'goldchan_gold_records',
  GIFT_SELL_RECORDS: 'goldchan_gift_sell_records',
  SETTINGS: 'goldchan_settings',
} as const;

// ==================== Type Definitions ====================

export interface Ledger {
  id: string;
  name: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface GoldRecord {
  id: string;
  ledger_id: string;
  weight: number;       // 始终存储为克
  total_price: number;
  unit_price: number;
  mode: 'summary' | 'detail';
  channel: string;
  note: string;
  purchase_date: string;
  photos: string[];
  created_at: string;
  updated_at: string;
}

export interface GiftSellRecord {
  id: string;
  ledger_id: string;
  type: 'gift' | 'sell';
  weight: number;       // 始终存储为克
  amount: number;
  date: string;
  note: string;
  created_at: string;
}

export interface UserSettings {
  preferred_unit: WeightUnit;
}

// ==================== Helper Functions ====================

function getNowISOString(): string {
  return new Date().toISOString();
}

// function getTodayISOString(): string {
//   return new Date().toISOString().split('T')[0];
// }

function getItem<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? (JSON.parse(item) as T) : defaultValue;
  } catch (error) {
    console.error(`Error reading ${key} from localStorage:`, error);
    return defaultValue;
  }
}

function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error writing ${key} to localStorage:`, error);
    throw new Error(`Failed to save data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ==================== Ledger Management ====================

/**
 * 获取全部账本，若为空则自动创建默认账本"我的账本"
 */
export function getLedgers(): Ledger[] {
  const ledgers = getItem<Ledger[]>(STORAGE_KEYS.LEDGERS, []);
  
  if (ledgers.length === 0) {
    // 自动创建默认账本
    const defaultLedger: Ledger = {
      id: generateUUID(),
      name: '我的账本',
      is_default: true,
      created_at: getNowISOString(),
      updated_at: getNowISOString(),
    };
    setItem(STORAGE_KEYS.LEDGERS, [defaultLedger]);
    return [defaultLedger];
  }
  
  return ledgers;
}

/**
 * 创建新账本
 */
export function createLedger(name: string): Ledger {
  const ledgers = getLedgers();
  
  const newLedger: Ledger = {
    id: generateUUID(),
    name: name.trim(),
    is_default: false,
    created_at: getNowISOString(),
    updated_at: getNowISOString(),
  };
  
  ledgers.push(newLedger);
  setItem(STORAGE_KEYS.LEDGERS, ledgers);
  
  return newLedger;
}

/**
 * 删除账本，级联删除关联记录，默认账本不可删
 */
export function deleteLedger(id: string): void {
  const ledgers = getLedgers();
  const targetIndex = ledgers.findIndex(l => l.id === id);
  
  if (targetIndex === -1) {
    throw new Error('账本不存在');
  }
  
  if (ledgers[targetIndex].is_default) {
    throw new Error('默认账本不可删除');
  }
  
  // 级联删除关联记录
  const goldRecords = getGoldRecordsRaw().filter(r => r.ledger_id !== id);
  const giftSellRecords = getGiftSellRecordsRaw().filter(r => r.ledger_id !== id);
  
  setItem(STORAGE_KEYS.GOLD_RECORDS, goldRecords);
  setItem(STORAGE_KEYS.GIFT_SELL_RECORDS, giftSellRecords);
  
  // 删除账本
  ledgers.splice(targetIndex, 1);
  setItem(STORAGE_KEYS.LEDGERS, ledgers);
}

/**
 * 获取默认账本，如果不存在则自动创建
 */
export function getDefaultLedger(): Ledger {
  const ledgers = getLedgers();
  const defaultLedger = ledgers.find(l => l.is_default);
  
  if (defaultLedger) {
    return defaultLedger;
  }
  
  // 如果没有默认账本，将第一个设为默认
  if (ledgers.length > 0) {
    ledgers[0].is_default = true;
    ledgers[0].updated_at = getNowISOString();
    setItem(STORAGE_KEYS.LEDGERS, ledgers);
    return ledgers[0];
  }
  
  // 理论上不会走到这里，因为 getLedgers 会创建默认账本
  throw new Error('无法获取默认账本');
}

// ==================== Gold Record Management ====================

function getGoldRecordsRaw(): GoldRecord[] {
  return getItem<GoldRecord[]>(STORAGE_KEYS.GOLD_RECORDS, []);
}

export interface GetGoldRecordsOptions {
  channel?: string;
  sortBy?: 'purchase_date' | 'weight' | 'total_price' | 'created_at';
  sortOrder?: 'asc' | 'desc';
}

/**
 * 获取指定账本的黄金记录
 */
export function getGoldRecords(
  ledgerId: string,
  options?: GetGoldRecordsOptions
): GoldRecord[] {
  let records = getGoldRecordsRaw().filter(r => r.ledger_id === ledgerId);
  
  // 渠道筛选
  if (options?.channel) {
    records = records.filter(r => r.channel === options.channel);
  }
  
  // 排序
  const sortBy = options?.sortBy || 'purchase_date';
  const sortOrder = options?.sortOrder || 'desc';
  
  records.sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'purchase_date':
        comparison = new Date(a.purchase_date).getTime() - new Date(b.purchase_date).getTime();
        break;
      case 'weight':
        comparison = a.weight - b.weight;
        break;
      case 'total_price':
        comparison = a.total_price - b.total_price;
        break;
      case 'created_at':
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        break;
      default:
        comparison = 0;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });
  
  return records;
}

/**
 * 添加黄金记录
 * 自动计算：汇总模式 unit_price = total_price / weight；明细模式 total_price = unit_price * weight
 */
export function addGoldRecord(
  data: Omit<GoldRecord, 'id' | 'created_at' | 'updated_at'>
): GoldRecord {
  const now = getNowISOString();
  
  // 自动计算价格
  let totalPrice = data.total_price;
  let unitPrice = data.unit_price;
  
  if (data.mode === 'summary') {
    // 汇总模式：输入总价，计算单价
    unitPrice = data.weight > 0 ? data.total_price / data.weight : 0;
  } else {
    // 明细模式：输入单价，计算总价
    totalPrice = data.unit_price * data.weight;
  }
  
  const newRecord: GoldRecord = {
    ...data,
    total_price: Math.round(totalPrice * 100) / 100,
    unit_price: Math.round(unitPrice * 100) / 100,
    id: generateUUID(),
    created_at: now,
    updated_at: now,
  };
  
  const records = getGoldRecordsRaw();
  records.push(newRecord);
  setItem(STORAGE_KEYS.GOLD_RECORDS, records);
  
  return newRecord;
}

/**
 * 更新黄金记录
 */
export function updateGoldRecord(
  id: string,
  data: Partial<Omit<GoldRecord, 'id' | 'created_at'>>
): GoldRecord {
  const records = getGoldRecordsRaw();
  const index = records.findIndex(r => r.id === id);
  
  if (index === -1) {
    throw new Error('记录不存在');
  }
  
  const existingRecord = records[index];
  
  // 如果更新了重量、总价或单价，需要重新计算
  let totalPrice = data.total_price ?? existingRecord.total_price;
  let unitPrice = data.unit_price ?? existingRecord.unit_price;
  const weight = data.weight ?? existingRecord.weight;
  const mode = data.mode ?? existingRecord.mode;
  
  if (data.mode || data.weight !== undefined || data.total_price !== undefined || data.unit_price !== undefined) {
    if (mode === 'summary') {
      // 汇总模式：总价为准，计算单价
      unitPrice = weight > 0 ? totalPrice / weight : 0;
    } else {
      // 明细模式：单价为准，计算总价
      totalPrice = unitPrice * weight;
    }
  }
  
  const updatedRecord: GoldRecord = {
    ...existingRecord,
    ...data,
    weight,
    total_price: Math.round(totalPrice * 100) / 100,
    unit_price: Math.round(unitPrice * 100) / 100,
    mode,
    updated_at: getNowISOString(),
  };
  
  records[index] = updatedRecord;
  setItem(STORAGE_KEYS.GOLD_RECORDS, records);
  
  return updatedRecord;
}

/**
 * 删除黄金记录
 */
export function deleteGoldRecord(id: string): void {
  const records = getGoldRecordsRaw();
  const index = records.findIndex(r => r.id === id);
  
  if (index === -1) {
    throw new Error('记录不存在');
  }
  
  records.splice(index, 1);
  setItem(STORAGE_KEYS.GOLD_RECORDS, records);
}

// ==================== Gift/Sell Record Management ====================

function getGiftSellRecordsRaw(): GiftSellRecord[] {
  return getItem<GiftSellRecord[]>(STORAGE_KEYS.GIFT_SELL_RECORDS, []);
}

/**
 * 获取指定账本的赠卖记录
 */
export function getGiftSellRecords(ledgerId: string): GiftSellRecord[] {
  return getGiftSellRecordsRaw()
    .filter(r => r.ledger_id === ledgerId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/**
 * 添加赠卖记录
 */
export function addGiftSellRecord(
  data: Omit<GiftSellRecord, 'id' | 'created_at'>
): GiftSellRecord {
  const newRecord: GiftSellRecord = {
    ...data,
    id: generateUUID(),
    created_at: getNowISOString(),
  };
  
  const records = getGiftSellRecordsRaw();
  records.push(newRecord);
  setItem(STORAGE_KEYS.GIFT_SELL_RECORDS, records);
  
  return newRecord;
}

/**
 * 删除赠卖记录
 */
export function deleteGiftSellRecord(id: string): void {
  const records = getGiftSellRecordsRaw();
  const index = records.findIndex(r => r.id === id);
  
  if (index === -1) {
    throw new Error('记录不存在');
  }
  
  records.splice(index, 1);
  setItem(STORAGE_KEYS.GIFT_SELL_RECORDS, records);
}

// ==================== Settings ====================

/**
 * 获取首选重量单位
 */
export function getPreferredUnit(): WeightUnit {
  const settings = getItem<UserSettings>(STORAGE_KEYS.SETTINGS, { preferred_unit: 'g' });
  return settings.preferred_unit;
}

/**
 * 设置首选重量单位
 */
export function setPreferredUnit(unit: WeightUnit): void {
  const settings: UserSettings = { preferred_unit: unit };
  setItem(STORAGE_KEYS.SETTINGS, settings);
}

// ==================== Summary Calculation ====================

export interface AssetSummary {
  totalWeight: number;      // 克
  totalCost: number;        // 元
  estimatedValue: number;   // 元
  estimatedProfit: number;  // 元
  recordCount: number;
}

/**
 * 计算资产总览
 * 扣除赠卖记录的重量和出售收入
 */
export function calculateAssetSummary(
  ledgerId: string,
  currentPrice: number
): AssetSummary {
  // 安全检查：确保 currentPrice 是有效数字
  const safePrice = typeof currentPrice === 'number' && !isNaN(currentPrice) ? currentPrice : 0;
  
  const goldRecords = getGoldRecords(ledgerId);
  const giftSellRecords = getGiftSellRecords(ledgerId);
  
  // 计算黄金记录总重量和总成本
  let totalWeight = 0;
  let totalCost = 0;
  
  for (const record of goldRecords) {
    totalWeight += record.weight;
    totalCost += record.total_price;
  }
  
  // 扣除赠卖记录
  for (const record of giftSellRecords) {
    totalWeight -= record.weight;
    if (record.type === 'sell') {
      // 出售记录：扣除成本（按平均成本比例扣除）
      const costRatio = totalWeight > 0 ? record.weight / (totalWeight + record.weight) : 0;
      totalCost -= totalCost * costRatio;
    }
  }
  
  // 确保不为负数
  totalWeight = Math.max(0, totalWeight);
  totalCost = Math.max(0, Math.round(totalCost * 100) / 100);
  
  // 计算预估价值和收益
  const estimatedValue = Math.round(totalWeight * safePrice * 100) / 100;
  const estimatedProfit = Math.round((estimatedValue - totalCost) * 100) / 100;
  
  return {
    totalWeight,
    totalCost,
    estimatedValue,
    estimatedProfit,
    recordCount: goldRecords.length,
  };
}
