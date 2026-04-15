import { FourCourses, ThreeTransmissions, JI_JIANG, XIONG_JIANG } from './calculator';

type LuckLevel = '大吉' | '吉' | '小吉' | '中' | '凶';

function countJiXiong(courses: FourCourses, trans: ThreeTransmissions): { ji: number; xiong: number } {
  const allJiang = [
    courses.course1.tianJiang, courses.course2.tianJiang,
    courses.course3.tianJiang, courses.course4.tianJiang,
    trans.initial.tianJiang, trans.middle.tianJiang, trans.final.tianJiang,
  ];

  let ji = 0, xiong = 0;
  for (const j of allJiang) {
    if (JI_JIANG.includes(j)) ji++;
    if (XIONG_JIANG.includes(j)) xiong++;
  }
  return { ji, xiong };
}

function judgeLuck(ji: number, xiong: number): LuckLevel {
  if (ji >= 4 && xiong === 0) return '大吉';
  if (ji >= 3) return '吉';
  if (ji >= 2) return '小吉';
  if (xiong >= 3) return '凶';
  return '中';
}

function calculateSuccessRate(luck: LuckLevel): number {
  switch (luck) {
    case '大吉': return 85 + Math.floor(Math.random() * 15);
    case '吉': return 70 + Math.floor(Math.random() * 15);
    case '小吉': return 55 + Math.floor(Math.random() * 15);
    case '中': return 40 + Math.floor(Math.random() * 15);
    case '凶': return 10 + Math.floor(Math.random() * 25);
  }
}

function generateAdvice(question: string, courses: FourCourses, trans: ThreeTransmissions, luck: LuckLevel, successRate: number): string {
  const luckDesc: Record<LuckLevel, string> = {
    '大吉': '极为有利',
    '吉': '比较有利',
    '小吉': '略有助力',
    '中': '吉凶参半',
    '凶': '需要谨慎',
  };

  const initialAnalysis = JI_JIANG.includes(trans.initial.tianJiang)
    ? `初传${trans.initial.zhi}得${trans.initial.tianJiang}，起始阶段顺利，事情有好的开端。`
    : `初传${trans.initial.zhi}得${trans.initial.tianJiang}，起始阶段需多加留意，注意防范潜在风险。`;

  const middleAnalysis = JI_JIANG.includes(trans.middle.tianJiang)
    ? `中传${trans.middle.zhi}得${trans.middle.tianJiang}，发展过程平稳，中间环节顺畅。`
    : `中传${trans.middle.zhi}得${trans.middle.tianJiang}，发展过程中可能遇到波折，需保持耐心。`;

  const finalAnalysis = JI_JIANG.includes(trans.final.tianJiang)
    ? `末传${trans.final.zhi}得${trans.final.tianJiang}，结果趋向圆满，终局良好。`
    : `末传${trans.final.zhi}得${trans.final.tianJiang}，最终结果尚有变数，建议做好多手准备。`;

  const generalAdvice = successRate >= 70
    ? '综合三传四课来看，所问之事较为顺遂。建议抓住当前机遇，果断行动。天时地利均在，人和则万事可成。'
    : successRate >= 40
    ? '综合三传四课来看，事情发展有起有伏。建议稳扎稳打，循序渐进。遇到困难不要气馁，坚持就能看到转机。'
    : '综合三传四课来看，当前形势对所问之事不甚有利。建议暂缓行动，静待时机。如确需推进，务必做好周全准备。';

  return `【问题分析】\n关于"${question}"的六壬推演如下：\n\n当前局势${luckDesc[luck]}，成功概率约${successRate}%。\n\n【三传分析】\n${initialAnalysis}\n${middleAnalysis}\n${finalAnalysis}\n\n【四课概要】\n第一课${courses.course1.zhi}（${courses.course1.tianJiang}），第二课${courses.course2.zhi}（${courses.course2.tianJiang}），第三课${courses.course3.zhi}（${courses.course3.tianJiang}），第四课${courses.course4.zhi}（${courses.course4.tianJiang}）。\n\n【综合建议】\n${generalAdvice}\n\n【注意事项】\n命理分析仅供参考，重要决策请结合实际情况综合判断。`;
}

export interface LiurenAnalysis {
  courses: FourCourses;
  transmissions: ThreeTransmissions;
  luck: LuckLevel;
  successRate: number;
  advice: string;
  analysis: string;
}

export function analyzeLiuren(courses: FourCourses, trans: ThreeTransmissions, question: string): LiurenAnalysis {
  const { ji, xiong } = countJiXiong(courses, trans);
  const luck = judgeLuck(ji, xiong);
  const successRate = calculateSuccessRate(luck);
  const advice = generateAdvice(question, courses, trans, luck, successRate);

  return {
    courses,
    transmissions: trans,
    luck,
    successRate,
    advice,
    analysis: `四课三传推演完毕。初传${trans.initial.zhi}（${trans.initial.tianJiang}）→中传${trans.middle.zhi}（${trans.middle.tianJiang}）→末传${trans.final.zhi}（${trans.final.tianJiang}）。吉将${ji}个，凶将${xiong}个，整体格局${luck}。`,
  };
}
