import { TIAN_GAN, DI_ZHI, getDayGanzhi } from '../bazi/calculator';

// 九星
const JIU_XING = ['天蓬', '天芮', '天冲', '天辅', '天禽', '天心', '天柱', '天任', '天英'];
// 八门
const BA_MEN = ['休门', '生门', '伤门', '杜门', '景门', '死门', '惊门', '开门'];
// 八神
const BA_SHEN = ['值符', '腾蛇', '太阴', '六合', '白虎', '玄武', '九地', '九天'];
// 三奇六仪
const SAN_QI_LIU_YI = ['戊', '己', '庚', '辛', '壬', '癸', '丁', '丙', '乙'];

// 二十四节气近似日期 (简化)
const JIE_QI_MONTHS: Record<number, string> = {
  1: '小寒', 2: '立春', 3: '惊蛰', 4: '清明', 5: '立夏', 6: '芒种',
  7: '小暑', 8: '立秋', 9: '白露', 10: '寒露', 11: '立冬', 12: '大雪',
};

// 判断阴阳遁: 冬至后至夏至前为阳遁，夏至后至冬至前为阴遁
export function determineYinYang(date: Date): '阳遁' | '阴遁' {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  // 冬至约12月22日, 夏至约6月21日
  if (month === 12 && day >= 22) return '阳遁';
  if (month >= 1 && month <= 6) {
    if (month === 6 && day >= 21) return '阴遁';
    return '阳遁';
  }
  return '阴遁';
}

// 计算局数 (1-9)
export function calculateJuNumber(date: Date): number {
  const yinyang = determineYinYang(date);
  const dayGanzhi = getDayGanzhi(date);
  const ganIdx = TIAN_GAN.indexOf(dayGanzhi[0]);
  const zhiIdx = DI_ZHI.indexOf(dayGanzhi[1]);

  // 基于日干支简化计算局数
  const base = (ganIdx + zhiIdx) % 9;
  if (yinyang === '阳遁') {
    return base + 1; // 1-9
  } else {
    return 9 - base; // 9-1
  }
}

// 九宫排盘
export interface QimenPalace {
  position: number;   // 1-9 宫位
  diPan: string;      // 地盘奇仪
  tianPan: string;     // 天盘星
  men: string;         // 门
  shen: string;        // 神
}

export interface QimenResult {
  yinyang: '阳遁' | '阴遁';
  ju: number;
  zhifu: string;       // 值符
  zhishi: string;      // 值使
  palaces: QimenPalace[];
}

export function arrangePalace(juNumber: number, yinyang: '阳遁' | '阴遁', hour: number): QimenResult {
  const palaces: QimenPalace[] = [];
  const hourIdx = Math.floor(((hour + 1) % 24) / 2); // 时辰索引 0-11

  for (let i = 0; i < 9; i++) {
    let diPanIdx: number;
    if (yinyang === '阳遁') {
      diPanIdx = (juNumber - 1 + i) % 9;
    } else {
      diPanIdx = (juNumber - 1 - i + 18) % 9;
    }

    const xingIdx = (i + hourIdx) % 9;
    const menIdx = (i + hourIdx) % 8;
    const shenIdx = (i + hourIdx) % 8;

    palaces.push({
      position: i + 1,
      diPan: SAN_QI_LIU_YI[diPanIdx],
      tianPan: JIU_XING[xingIdx],
      men: BA_MEN[menIdx],
      shen: BA_SHEN[shenIdx],
    });
  }

  // 值符 = 第一宫的天盘星, 值使 = 第一宫的门
  const zhifu = palaces[0].tianPan;
  const zhishi = palaces[0].men;

  return { yinyang, ju: juNumber, zhifu, zhishi, palaces };
}
