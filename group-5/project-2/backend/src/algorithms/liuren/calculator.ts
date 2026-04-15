import { DI_ZHI } from '../bazi/calculator';

// 十二月将
const YUE_JIANG = ['神后', '大吉', '功曹', '太冲', '天罡', '太乙', '胜光', '小吉', '传送', '从魁', '河魁', '登明'];

// 十二天将
const TIAN_JIANG = ['贵人', '腾蛇', '朱雀', '六合', '勾陈', '青龙', '天空', '白虎', '太常', '玄武', '太阴', '天后'];

// 吉将
const JI_JIANG = ['青龙', '太常', '天后', '贵人'];
// 凶将
const XIONG_JIANG = ['白虎', '玄武', '腾蛇'];

// 确定月将
export function calculateMonthGeneral(month: number): string {
  // 月份1-12对应月将
  return YUE_JIANG[(month - 1) % 12];
}

// 月将加时起天盘
export function addHour(monthGeneralIdx: number, hourIdx: number): number[] {
  const tianPan: number[] = [];
  for (let i = 0; i < 12; i++) {
    tianPan.push((monthGeneralIdx + hourIdx + i) % 12);
  }
  return tianPan;
}

// 四课
export interface FourCourses {
  course1: { gan: string; zhi: string; tianJiang: string };
  course2: { gan: string; zhi: string; tianJiang: string };
  course3: { gan: string; zhi: string; tianJiang: string };
  course4: { gan: string; zhi: string; tianJiang: string };
}

// 三传
export interface ThreeTransmissions {
  initial: { zhi: string; tianJiang: string };
  middle: { zhi: string; tianJiang: string };
  final: { zhi: string; tianJiang: string };
}

export function calculateFourCourses(dayGanIdx: number, dayZhiIdx: number): FourCourses {
  // 简化实现：基于日干日支起四课
  const c1Zhi = (dayGanIdx * 2) % 12;
  const c2Zhi = (dayZhiIdx) % 12;
  const c3Zhi = (c1Zhi + 6) % 12; // 阴神
  const c4Zhi = (c2Zhi + 6) % 12;

  return {
    course1: { gan: '上神', zhi: DI_ZHI[c1Zhi], tianJiang: TIAN_JIANG[c1Zhi] },
    course2: { gan: '下神', zhi: DI_ZHI[c2Zhi], tianJiang: TIAN_JIANG[c2Zhi] },
    course3: { gan: '阴神', zhi: DI_ZHI[c3Zhi], tianJiang: TIAN_JIANG[c3Zhi] },
    course4: { gan: '阳神', zhi: DI_ZHI[c4Zhi], tianJiang: TIAN_JIANG[c4Zhi] },
  };
}

export function calculateThreeTransmissions(courses: FourCourses): ThreeTransmissions {
  // 简化：初传取第一课，中传取初传上神，末传取中传上神
  const initialIdx = DI_ZHI.indexOf(courses.course1.zhi);
  const middleIdx = (initialIdx + 4) % 12;
  const finalIdx = (middleIdx + 4) % 12;

  return {
    initial: { zhi: DI_ZHI[initialIdx], tianJiang: TIAN_JIANG[initialIdx] },
    middle: { zhi: DI_ZHI[middleIdx], tianJiang: TIAN_JIANG[middleIdx] },
    final: { zhi: DI_ZHI[finalIdx], tianJiang: TIAN_JIANG[finalIdx] },
  };
}

export { JI_JIANG, XIONG_JIANG, TIAN_JIANG, YUE_JIANG };
