import { CalendarData } from "@/types";

const suitablePool = [
  "签约合作", "出行拜访", "面试求职", "投资理财", "搬家入宅",
  "开业开市", "求医问药", "学习进修", "社交聚会", "运动健身",
];
const unsuitablePool = [
  "动土装修", "大额借贷", "远行出国", "诉讼纠纷", "激烈争论",
  "冒险投资", "手术开刀", "夜间外出",
];
const colorPool = ["红色", "黄色", "绿色", "蓝色", "紫色", "白色", "金色"];
const directionPool = ["正东", "东南", "正南", "西南", "正西", "西北", "正北", "东北"];
const ganzhiPool = [
  "甲子", "乙丑", "丙寅", "丁卯", "戊辰", "己巳", "庚午", "辛未",
  "壬申", "癸酉", "甲戌", "乙亥", "丙子", "丁丑", "戊寅",
];
const lunarDates = [
  "农历三月初一", "农历三月初二", "农历三月初三", "农历三月初四",
  "农历三月初五", "农历三月初六", "农历三月初七", "农历三月初八",
  "农历三月初九", "农历三月初十", "农历三月十一", "农历三月十二",
  "农历三月十三", "农历三月十四", "农历三月十五",
];

function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

export const mockCalendarData = {
  getByDate: (dateStr: string): CalendarData => {
    const seed = dateStr.split("-").reduce((acc, v) => acc + parseInt(v), 0);
    return {
      date: dateStr,
      lunarDate: lunarDates[seed % lunarDates.length],
      ganzhi: `丙午年 壬辰月 ${ganzhiPool[seed % ganzhiPool.length]}日`,
      suitable: pickRandom(suitablePool, 3 + (seed % 3)),
      unsuitable: pickRandom(unsuitablePool, 2 + (seed % 2)),
      luckyColor: pickRandom(colorPool, 1 + (seed % 2)),
      luckyDirection: pickRandom(directionPool, 1 + (seed % 2)),
      cached: false,
    };
  },
};
