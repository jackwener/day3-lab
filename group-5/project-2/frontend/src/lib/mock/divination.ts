import { DivinationResult } from "@/types";

export const mockDivinationData = {
  qimen: (question: string): DivinationResult => ({
    id: "mock-div-" + Date.now(),
    type: "qimen",
    question,
    gua: {
      name: "天芮星值符",
      positions: [
        { position: 1, label: "值符", value: "天芮", element: "土" },
        { position: 2, label: "腾蛇", value: "天冲", element: "木" },
        { position: 3, label: "太阴", value: "天辅", element: "木" },
        { position: 4, label: "六合", value: "天英", element: "火" },
        { position: 5, label: "中宫", value: "天禽", element: "土" },
        { position: 6, label: "白虎", value: "天柱", element: "金" },
        { position: 7, label: "玄武", value: "天心", element: "金" },
        { position: 8, label: "九地", value: "天蓬", element: "水" },
        { position: 9, label: "九天", value: "天任", element: "土" },
      ],
    },
    judgment: "吉",
    successRate: 72,
    analysis:
      "根据奇门遁甲排盘分析，当前时局天芮星值符入中宫，主事顺遂。值使门为开门，利于行动。日干与时干相生，气势旺盛。综合来看，此局为吉局，适合推进计划中的事务。建议把握当前时机，主动出击，成功概率较高。需注意的是，虽然整体态势向好，但仍需谨慎行事，避免过于冒进。特别是在与人合作方面，宜诚信为本，以和为贵。",
    createdAt: new Date().toISOString(),
  }),
  liuren: (question: string): DivinationResult => ({
    id: "mock-div-" + Date.now(),
    type: "liuren",
    question,
    gua: {
      name: "青龙课",
      positions: [
        { position: 1, label: "大安", value: "青龙", element: "木" },
        { position: 2, label: "留连", value: "玄武", element: "水" },
        { position: 3, label: "速喜", value: "朱雀", element: "火" },
        { position: 4, label: "赤口", value: "白虎", element: "金" },
        { position: 5, label: "中宫", value: "勾陈", element: "土" },
        { position: 6, label: "小吉", value: "六合", element: "木" },
        { position: 7, label: "空亡", value: "太阴", element: "金" },
        { position: 8, label: "大吉", value: "太常", element: "土" },
        { position: 9, label: "天德", value: "天后", element: "水" },
      ],
    },
    judgment: "中平",
    successRate: 55,
    analysis:
      "大小六壬起卦得青龙课，青龙主喜庆、祥和之事。初传大安，事情起始平稳，有贵人相助之象。中传留连，过程中可能会有些许拖延和反复，需要耐心等待。末传速喜，最终结果趋于积极。整体来看，此事可行，但需要经历一定的波折。建议保持平常心，稳步推进，不宜操之过急。在决策时多听取身边人的意见，集思广益方为上策。",
    createdAt: new Date().toISOString(),
  }),
  remaining: { qimen: 1, liuren: 5 },
};
