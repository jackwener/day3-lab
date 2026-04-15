import { QimenResult, QimenPalace } from './calculator';

// 吉门: 开、休、生
const JI_MEN = ['开门', '休门', '生门'];
// 吉星: 天心、天任、天辅
const JI_XING = ['天心', '天任', '天辅'];
// 吉神: 值符、太阴、六合、九天
const JI_SHEN = ['值符', '太阴', '六合', '九天'];

type LuckLevel = '大吉' | '吉' | '小吉' | '中' | '凶';

function judgePalaceLuck(palace: QimenPalace): LuckLevel {
  const isMenJi = JI_MEN.includes(palace.men);
  const isXingJi = JI_XING.includes(palace.tianPan);
  const isShenJi = JI_SHEN.includes(palace.shen);

  if (isMenJi && isXingJi && isShenJi) return '大吉';
  if (isMenJi && isXingJi) return '吉';
  if (isMenJi) return '小吉';
  if (!isMenJi && !isXingJi) return '凶';
  return '中';
}

// 计算成功率 (0-100%)
function calculateSuccessRate(luck: LuckLevel): number {
  switch (luck) {
    case '大吉': return 85 + Math.floor(Math.random() * 15);
    case '吉': return 70 + Math.floor(Math.random() * 15);
    case '小吉': return 55 + Math.floor(Math.random() * 15);
    case '中': return 40 + Math.floor(Math.random() * 15);
    case '凶': return 10 + Math.floor(Math.random() * 25);
  }
}

// 生成建议文本 (200-500字)
function generateAdvice(question: string, palace: QimenPalace, luck: LuckLevel, successRate: number): string {
  const luckDesc: Record<LuckLevel, string> = {
    '大吉': '极为有利',
    '吉': '比较有利',
    '小吉': '略有助力',
    '中': '吉凶参半',
    '凶': '需要谨慎',
  };

  const menAnalysis: Record<string, string> = {
    '开门': '开门主开创、开拓，利于事业发展和新的开始。此门为八门之首，象征万事开通。',
    '休门': '休门主休养、平安，利于求财、会友、养生。此门安宁祥和，万事可期。',
    '生门': '生门主生发、利润，利于求财、投资、创业。此门生机勃勃，财运亨通。',
    '伤门': '伤门主伤害、变动，出行和谈判需要谨慎。建议避免冲突，以和为贵。',
    '杜门': '杜门主阻塞、隐藏，利于潜伏、修炼、内部事务。不宜高调行事。',
    '景门': '景门主光明、文化，利于考试、学习、文书事务。但需注意口舌之争。',
    '死门': '死门主消极、终结，不利于开始新事物。建议等待更好的时机再行动。',
    '惊门': '惊门主惊恐、变动，需注意突发事件。建议保持冷静，不做冲动决定。',
  };

  const xingAnalysis = palace.tianPan.includes('天心') ? '天心星临事，主智慧、决断，利于深思熟虑后行动。' :
    palace.tianPan.includes('天任') ? '天任星临事，主仁慈、稳重，利于脚踏实地推进。' :
    palace.tianPan.includes('天辅') ? '天辅星临事，主文昌、学业，利于求知和文化活动。' :
    palace.tianPan.includes('天冲') ? '天冲星临事，主果敢、冲劲，行动力强但需控制节奏。' :
    palace.tianPan.includes('天英') ? '天英星临事，主光明、热情，利于社交但需防急躁。' :
    `${palace.tianPan}临事，需结合整体格局判断。`;

  const generalAdvice = successRate >= 70
    ? '综合来看，当前时机对您所问之事较为有利。建议把握机会，积极行动。注意保持良好心态，顺势而为。同时也要做好充分准备，不可掉以轻心。'
    : successRate >= 40
    ? '综合来看，当前时机吉凶参半。建议您谨慎行事，做好两手准备。如果条件允许，可以稍作等待，寻找更好的时机。同时注意防范风险，保持警觉。'
    : '综合来看，当前时机对所问之事不太有利。建议暂时观望，不宜贸然行动。如非必要，可以推迟计划。若必须行动，请做好充分的风险预案和退路准备。';

  return `【问题分析】\n关于"${question}"的卦象分析如下：\n\n当前局势${luckDesc[luck]}，成功概率约${successRate}%。\n\n【门象分析】\n${menAnalysis[palace.men] || '当前门象需综合判断。'}\n\n【星象分析】\n${xingAnalysis}\n\n【综合建议】\n${generalAdvice}\n\n【注意事项】\n命理分析仅供参考，重要决策请结合实际情况综合判断。`;
}

export interface QimenAnalysis {
  ju: number;
  yinyang: string;
  zhifu: string;
  zhishi: string;
  palace: QimenPalace;
  luck: LuckLevel;
  successRate: number;
  advice: string;
  analysis: string;
}

export function analyzeQimen(question: string, qimenResult: QimenResult): QimenAnalysis {
  // 取值符所在宫位进行分析
  const palace = qimenResult.palaces[0];
  const luck = judgePalaceLuck(palace);
  const successRate = calculateSuccessRate(luck);
  const advice = generateAdvice(question, palace, luck, successRate);

  return {
    ju: qimenResult.ju,
    yinyang: qimenResult.yinyang,
    zhifu: qimenResult.zhifu,
    zhishi: qimenResult.zhishi,
    palace,
    luck,
    successRate,
    advice,
    analysis: `${qimenResult.yinyang}${qimenResult.ju}局，值符${qimenResult.zhifu}，值使${qimenResult.zhishi}。用神落${palace.position}宫，天盘${palace.tianPan}，地盘${palace.diPan}，门为${palace.men}，神为${palace.shen}。整体格局${luck}。`,
  };
}
