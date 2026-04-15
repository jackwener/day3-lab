import { BaziResult, GAN_WUXING, ZHI_WUXING, TIAN_GAN } from '../bazi/calculator';

// 月令五行强度
const MONTH_STRENGTH: Record<string, string> = {
  '寅': '木', '卯': '木', '巳': '火', '午': '火',
  '辰': '土', '未': '土', '戌': '土', '丑': '土',
  '申': '金', '酉': '金', '亥': '水', '子': '水',
};

// 日主强弱分析
type Strength = '旺' | '相' | '休' | '囚' | '死';

export function analyzeDayMaster(bazi: BaziResult): { dayMaster: string; wuxing: string; strength: Strength } {
  const dayGan = bazi.dayPillar[0];
  const dayWuxing = GAN_WUXING[dayGan];
  const monthZhi = bazi.monthPillar[1];
  const monthWuxing = MONTH_STRENGTH[monthZhi] || '土';

  // 五行生克顺序: 木火土金水
  const ORDER = ['木', '火', '土', '金', '水'];
  const dayIdx = ORDER.indexOf(dayWuxing);
  const monthIdx = ORDER.indexOf(monthWuxing);

  // 计算同类异类力量
  const allChars: string[] = [];
  for (const p of [bazi.yearPillar, bazi.monthPillar, bazi.dayPillar, bazi.hourPillar]) {
    if (!p) continue;
    allChars.push(GAN_WUXING[p[0]], ZHI_WUXING[p[1]]);
  }

  const sameCount = allChars.filter((w) => w === dayWuxing).length;
  const shengWoWuxing = ORDER[(dayIdx - 1 + 5) % 5]; // 生我的五行
  const helpCount = allChars.filter((w) => w === shengWoWuxing).length;
  const totalHelp = sameCount + helpCount;
  const totalHarm = allChars.length - totalHelp;

  let strength: Strength;
  if (totalHelp >= totalHarm + 2) strength = '旺';
  else if (totalHelp > totalHarm) strength = '相';
  else if (totalHelp === totalHarm) strength = '休';
  else if (totalHelp < totalHarm - 1) strength = '死';
  else strength = '囚';

  return { dayMaster: dayGan, wuxing: dayWuxing, strength };
}

// 十神分析
export interface ShishenResult {
  正官: number; 偏官: number; 正印: number; 偏印: number;
  比肩: number; 劫财: number; 食神: number; 伤官: number;
  正财: number; 偏财: number;
}

export function analyzeShishen(bazi: BaziResult): ShishenResult {
  const dayGan = bazi.dayPillar[0];
  const dayGanIdx = TIAN_GAN.indexOf(dayGan);

  const result: ShishenResult = {
    正官: 0, 偏官: 0, 正印: 0, 偏印: 0,
    比肩: 0, 劫财: 0, 食神: 0, 伤官: 0,
    正财: 0, 偏财: 0,
  };

  const otherGans: string[] = [
    bazi.yearPillar[0], bazi.monthPillar[0],
  ];
  if (bazi.hourPillar) otherGans.push(bazi.hourPillar[0]);

  for (const gan of otherGans) {
    const ganIdx = TIAN_GAN.indexOf(gan);
    const diff = (ganIdx - dayGanIdx + 10) % 10;
    const isYinYangSame = (dayGanIdx % 2) === (ganIdx % 2);

    // 基于五行关系判断十神
    const dayWx = GAN_WUXING[dayGan];
    const otherWx = GAN_WUXING[gan];
    const ORDER = ['木', '火', '土', '金', '水'];
    const dayI = ORDER.indexOf(dayWx);
    const otherI = ORDER.indexOf(otherWx);
    const wxDiff = (otherI - dayI + 5) % 5;

    switch (wxDiff) {
      case 0: isYinYangSame ? result.比肩++ : result.劫财++; break;
      case 1: isYinYangSame ? result.食神++ : result.伤官++; break;
      case 2: isYinYangSame ? result.偏财++ : result.正财++; break;
      case 3: isYinYangSame ? result.偏官++ : result.正官++; break;
      case 4: isYinYangSame ? result.偏印++ : result.正印++; break;
    }
  }

  return result;
}
