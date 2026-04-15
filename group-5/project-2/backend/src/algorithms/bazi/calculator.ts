// 天干
const TIAN_GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
// 地支
const DI_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
// 五行映射
const GAN_WUXING: Record<string, string> = {
  '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
  '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水',
};
const ZHI_WUXING: Record<string, string> = {
  '子': '水', '丑': '土', '寅': '木', '卯': '木', '辰': '土', '巳': '火',
  '午': '火', '未': '土', '申': '金', '酉': '金', '戌': '土', '亥': '水',
};

// 公历转农历 (简化算法 - 基于查表法的近似实现)
const LUNAR_INFO = [
  0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,
  0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,
  0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,
  0x06566,0x0d4a0,0x0ea50,0x06e95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,
  0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,
  0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,
  0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,
  0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,
  0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,
  0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x05ac0,0x0ab60,0x096d5,0x092e0,
  0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,
  0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,
  0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,
  0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,
  0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,
  0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06aa0,0x1a6c4,0x0aae0,
  0x092e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,
  0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,
  0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160,
  0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a4d0,0x0d150,0x0f252,
  0x0d520,
];

function lunarMonthDays(year: number): number {
  return LUNAR_INFO[year - 1900] & 0x0ffff;
}

function leapMonth(year: number): number {
  return LUNAR_INFO[year - 1900] & 0xf;
}

function leapDays(year: number): number {
  if (leapMonth(year)) {
    return (LUNAR_INFO[year - 1900] & 0x10000) ? 30 : 29;
  }
  return 0;
}

function monthDays(year: number, month: number): number {
  return (LUNAR_INFO[year - 1900] & (0x10000 >> month)) ? 30 : 29;
}

function lunarYearDays(year: number): number {
  let sum = 348;
  let info = LUNAR_INFO[year - 1900] & 0x0ffff;
  for (let i = 0x8000; i > 0x8; i >>= 1) {
    sum += (info & i) ? 1 : 0;
  }
  return sum + leapDays(year);
}

export interface LunarDate {
  year: number;
  month: number;
  day: number;
  isLeap: boolean;
}

export function solarToLunar(year: number, month: number, day: number): LunarDate {
  const baseDate = new Date(1900, 0, 31); // 1900年1月31日 = 农历正月初一
  const targetDate = new Date(year, month - 1, day);
  let offset = Math.floor((targetDate.getTime() - baseDate.getTime()) / 86400000);

  let lunarYear = 1900;
  let yearDaysCount: number;
  for (lunarYear = 1900; lunarYear < 2101 && offset > 0; lunarYear++) {
    yearDaysCount = lunarYearDays(lunarYear);
    offset -= yearDaysCount;
  }
  if (offset < 0) {
    offset += lunarYearDays(--lunarYear);
  }

  const leap = leapMonth(lunarYear);
  let isLeap = false;
  let lunarMonth = 1;
  let monthDaysCount: number;

  for (lunarMonth = 1; lunarMonth < 13 && offset > 0; lunarMonth++) {
    if (leap > 0 && lunarMonth === leap + 1 && !isLeap) {
      --lunarMonth;
      isLeap = true;
      monthDaysCount = leapDays(lunarYear);
    } else {
      monthDaysCount = monthDays(lunarYear, lunarMonth);
    }
    if (isLeap && lunarMonth === leap + 1) {
      isLeap = false;
    }
    offset -= monthDaysCount;
  }

  if (offset === 0 && leap > 0 && lunarMonth === leap + 1) {
    if (isLeap) {
      isLeap = false;
    } else {
      isLeap = true;
      --lunarMonth;
    }
  }
  if (offset < 0) {
    offset += monthDaysCount!;
    --lunarMonth;
  }

  return { year: lunarYear, month: lunarMonth, day: offset + 1, isLeap };
}

// 计算年柱
export function getYearGanzhi(year: number): string {
  const ganIdx = (year - 4) % 10;
  const zhiIdx = (year - 4) % 12;
  return TIAN_GAN[ganIdx >= 0 ? ganIdx : ganIdx + 10] + DI_ZHI[zhiIdx >= 0 ? zhiIdx : zhiIdx + 12];
}

// 计算月柱
export function getMonthGanzhi(year: number, month: number): string {
  // 月干 = (年干序号 * 2 + 月份) % 10
  const yearGanIdx = (year - 4) % 10;
  const monthGanIdx = (yearGanIdx * 2 + month) % 10;
  // 月支: 寅(1月)=2, 卯(2月)=3 ...
  const monthZhiIdx = (month + 1) % 12;
  return TIAN_GAN[monthGanIdx] + DI_ZHI[monthZhiIdx];
}

// 计算日柱 (蔡勒公式变体)
export function getDayGanzhi(date: Date): string {
  const baseDate = new Date(1900, 0, 1); // 1900-01-01 = 甲子日
  const offset = Math.floor((date.getTime() - baseDate.getTime()) / 86400000);
  // 1900-01-01 是 甲子日，天干=0(甲), 地支=0(子)
  // 但实际 1900-01-01 是庚子日，需要修正
  const ganIdx = (offset + 6) % 10; // 庚=6
  const zhiIdx = offset % 12;
  return TIAN_GAN[ganIdx >= 0 ? ganIdx : ganIdx + 10] + DI_ZHI[zhiIdx >= 0 ? zhiIdx : zhiIdx + 12];
}

// 时辰地支映射
function getHourZhi(hour: number): number {
  // 23-1:子, 1-3:丑, 3-5:寅 ...
  return Math.floor(((hour + 1) % 24) / 2);
}

// 计算时柱
export function getHourGanzhi(dayGanzhi: string, hour: number): string {
  const dayGanIdx = TIAN_GAN.indexOf(dayGanzhi[0]);
  const hourZhiIdx = getHourZhi(hour);
  // 时干 = (日干序号 * 2 + 时支序号) % 10
  const hourGanIdx = (dayGanIdx * 2 + hourZhiIdx) % 10;
  return TIAN_GAN[hourGanIdx] + DI_ZHI[hourZhiIdx];
}

export interface BaziResult {
  yearPillar: string;
  monthPillar: string;
  dayPillar: string;
  hourPillar: string | null;
}

export function calculatePillars(year: number, month: number, day: number, hour?: number): BaziResult {
  const lunar = solarToLunar(year, month, day);
  const yearPillar = getYearGanzhi(lunar.year);
  const monthPillar = getMonthGanzhi(lunar.year, lunar.month);
  const dayPillar = getDayGanzhi(new Date(year, month - 1, day));
  let hourPillar: string | null = null;
  if (hour !== undefined && hour !== null) {
    hourPillar = getHourGanzhi(dayPillar, hour);
  }
  return { yearPillar, monthPillar, dayPillar, hourPillar };
}

export interface WuxingResult {
  木: number;
  火: number;
  土: number;
  金: number;
  水: number;
}

export function analyzeWuxing(pillars: BaziResult): WuxingResult {
  const count: WuxingResult = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  const chars: string[] = [];

  for (const p of [pillars.yearPillar, pillars.monthPillar, pillars.dayPillar, pillars.hourPillar]) {
    if (!p) continue;
    chars.push(p[0], p[1]);
  }

  for (const c of chars) {
    const wx = GAN_WUXING[c] || ZHI_WUXING[c];
    if (wx) count[wx as keyof WuxingResult]++;
  }

  const total = chars.length || 1;
  return {
    木: Math.round((count.木 / total) * 100),
    火: Math.round((count.火 / total) * 100),
    土: Math.round((count.土 / total) * 100),
    金: Math.round((count.金 / total) * 100),
    水: Math.round((count.水 / total) * 100),
  };
}

// 导出常量供其他模块使用
export { TIAN_GAN, DI_ZHI, GAN_WUXING, ZHI_WUXING };
