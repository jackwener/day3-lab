export type WeightUnit = 'g' | 'liang' | 'ton';

export const UNIT_LABELS: Record<WeightUnit, string> = {
  g: '克',
  liang: '两',
  ton: '吨',
};

export const UNIT_SYMBOLS: Record<WeightUnit, string> = {
  g: 'g',
  liang: '两',
  ton: 't',
};

// 转换为克
export function toGrams(value: number, unit: WeightUnit): number {
  switch (unit) {
    case 'g': return value;
    case 'liang': return value * 50;  // 1两 = 50克
    case 'ton': return value * 1000000;  // 1吨 = 1000000克
  }
}

// 从克转换为目标单位
export function fromGrams(grams: number, unit: WeightUnit): number {
  // 安全检查：确保 grams 是有效数字
  const safeGrams = typeof grams === 'number' && !isNaN(grams) ? grams : 0;
  switch (unit) {
    case 'g': return Math.round(safeGrams * 100) / 100;
    case 'liang': return Math.round(safeGrams / 50 * 100) / 100;
    case 'ton': return Math.round(safeGrams / 1000000 * 1000000) / 1000000;  // 6位小数
  }
}

// 格式化重量显示
export function formatWeight(grams: number, unit: WeightUnit): string {
  // 安全检查：确保 grams 是有效数字
  const safeGrams = typeof grams === 'number' && !isNaN(grams) ? grams : 0;
  const val = fromGrams(safeGrams, unit);
  const decimals = unit === 'ton' ? 6 : 2;
  return `${val.toFixed(decimals)} ${UNIT_LABELS[unit]}`;
}

// 趣味提示
export function getFunMessage(grams: number, unit: WeightUnit): string {
  // 安全检查：确保 grams 是有效数字
  const safeGrams = typeof grams === 'number' && !isNaN(grams) ? grams : 0;
  if (unit === 'ton' && safeGrams > 0) return '大佬！以吨计量黄金的人物！';
  if (unit === 'liang' && safeGrams >= 500) return '十两黄金，古代富豪既视感！';
  if (safeGrams >= 1000) return '破公斤了，攒金达人！';
  if (safeGrams >= 100) return '百克大户，继续加油！';
  return '';
}
