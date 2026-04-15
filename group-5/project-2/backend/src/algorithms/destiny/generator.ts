import { BaziResult, analyzeWuxing, WuxingResult } from '../bazi/calculator';
import { analyzeDayMaster, analyzeShishen, ShishenResult } from './calculator';

// 命格关键词库 (≥20个)
const KEYWORD_DB: { keyword: string; desc: string; condition: (s: string, sh: ShishenResult) => boolean }[] = [
  { keyword: '高楼望月', desc: '志向远大，才华出众，事业有成', condition: (s) => s === '旺' },
  { keyword: '龙腾四海', desc: '气势恢宏，适合开拓大事业', condition: (s) => s === '旺' },
  { keyword: '桃花运旺', desc: '人缘极佳，感情生活丰富', condition: (_, sh) => (sh.正财 + sh.偏财) >= 2 },
  { keyword: '财源广进', desc: '财运亨通，适合投资理财', condition: (_, sh) => sh.正财 >= 1 || sh.偏财 >= 1 },
  { keyword: '贵人相助', desc: '事业中常遇贵人扶持', condition: (_, sh) => sh.正印 >= 1 || sh.偏印 >= 1 },
  { keyword: '文昌高照', desc: '学业优秀，适合从事文化教育', condition: (_, sh) => sh.食神 >= 1 },
  { keyword: '将星入命', desc: '领导力强，适合管理岗位', condition: (_, sh) => sh.正官 >= 1 || sh.偏官 >= 1 },
  { keyword: '伤官配印', desc: '聪明伶俐但需要修炼内心', condition: (_, sh) => sh.伤官 >= 1 && sh.正印 >= 1 },
  { keyword: '食神生财', desc: '以才华换取财富的好命格', condition: (_, sh) => sh.食神 >= 1 && sh.正财 >= 1 },
  { keyword: '比肩争财', desc: '竞争意识强，需防同行竞争', condition: (_, sh) => sh.比肩 >= 1 },
  { keyword: '独立自主', desc: '性格坚强，凡事靠自己', condition: (s) => s === '相' },
  { keyword: '厚德载物', desc: '品行端正，福泽深厚', condition: (s) => s === '休' },
  { keyword: '逆水行舟', desc: '面对挑战不退缩，越挫越勇', condition: (s) => s === '囚' },
  { keyword: '潜龙勿用', desc: '当前蛰伏期，蓄力待发', condition: (s) => s === '死' },
  { keyword: '金玉满堂', desc: '物质生活富裕，精神世界丰盈', condition: (_, sh) => sh.正财 >= 1 && sh.正印 >= 1 },
  { keyword: '官印相生', desc: '仕途顺遂，适合公职', condition: (_, sh) => sh.正官 >= 1 && sh.正印 >= 1 },
  { keyword: '身强财旺', desc: '有能力驾驭财富', condition: (s, sh) => (s === '旺' || s === '相') && (sh.正财 + sh.偏财) >= 1 },
  { keyword: '才华横溢', desc: '多才多艺，创造力强', condition: (_, sh) => sh.伤官 >= 1 || sh.食神 >= 1 },
  { keyword: '七杀制化', desc: '性格刚烈但有贵人化解', condition: (_, sh) => sh.偏官 >= 1 },
  { keyword: '劫财逐利', desc: '行动力强，善于把握机会', condition: (_, sh) => sh.劫财 >= 1 },
  { keyword: '印绶护身', desc: '有长辈庇护，学业事业皆顺', condition: (_, sh) => (sh.正印 + sh.偏印) >= 2 },
];

// 匹配关键词 (1-3个)
export function matchDestinyKeywords(bazi: BaziResult): { keyword: string; desc: string }[] {
  const { strength } = analyzeDayMaster(bazi);
  const shishen = analyzeShishen(bazi);

  const matched = KEYWORD_DB.filter((k) => k.condition(strength, shishen));
  return matched.slice(0, 3).map(({ keyword, desc }) => ({ keyword, desc }));
}

// 五行文字描述
const WUXING_DESC: Record<string, string> = {
  '木': '木主仁，性格温和，富有同情心，善于成长和发展',
  '火': '火主礼，性格热情，充满活力，善于表达和社交',
  '土': '土主信，性格稳重，踏实可靠，善于积累和守护',
  '金': '金主义，性格果断，公正严明，善于决策和执行',
  '水': '水主智，性格灵活，聪明伶俐，善于思考和变通',
};

// 性格特征
function generatePersonality(strength: string, dayWuxing: string, shishen: ShishenResult): { pros: string[]; cons: string[]; suggestion: string } {
  const pros = [
    WUXING_DESC[dayWuxing] || '性格独特',
    strength === '旺' || strength === '相' ? '意志坚定，执行力强' : '谦虚谨慎，善于合作',
  ];
  if (shishen.食神 >= 1) pros.push('富有创造力和艺术天赋');
  if (shishen.正官 >= 1) pros.push('责任心强，有领导才能');

  const cons: string[] = [];
  if (strength === '旺') cons.push('性格较为固执，不易听取他人意见');
  else if (strength === '死' || strength === '囚') cons.push('容易自我怀疑，需要更多自信');
  else cons.push('有时优柔寡断，需要培养决断力');
  if (shishen.伤官 >= 1) cons.push('口才好但容易伤人');

  return {
    pros,
    cons,
    suggestion: `建议多发挥${dayWuxing}行特质的优势，注意控制情绪，保持内心平和。`,
  };
}

// 生成完整解析内容
export interface DestinyAnalysis {
  wuxing: { distribution: WuxingResult; description: string };
  personality: { pros: string[]; cons: string[]; suggestion: string };
  career: string;
  relationship: string;
  health: string;
  advice: string;
  keywords: { keyword: string; desc: string }[];
  precision: 'full' | 'reduced';
}

export function generateDestinyAnalysis(bazi: BaziResult, noBirthTime: boolean = false): DestinyAnalysis {
  const wuxing = analyzeWuxing(bazi);
  const { dayMaster, wuxing: dayWuxing, strength } = analyzeDayMaster(bazi);
  const shishen = analyzeShishen(bazi);
  const keywords = matchDestinyKeywords(bazi);
  const personality = generatePersonality(strength, dayWuxing, shishen);

  // 事业财运
  const careerTexts: string[] = [
    `日主${dayMaster}属${dayWuxing}，${strength === '旺' || strength === '相' ? '身强有力，适合自主创业或担当重任' : '身弱需要团队支持，适合稳健发展'}。`,
  ];
  if (shishen.正官 >= 1 || shishen.偏官 >= 1) careerTexts.push('八字中官杀出现，适合从事管理类、公务员或权威性工作。');
  if (shishen.食神 >= 1 || shishen.伤官 >= 1) careerTexts.push('食伤星见，适合从事创意类、技术类或自由职业。');
  if (shishen.正财 >= 1 || shishen.偏财 >= 1) careerTexts.push('财星显现，有不错的财运，善于把握赚钱机会。');
  careerTexts.push(`建议在${dayWuxing === '木' ? '教育、环保' : dayWuxing === '火' ? '科技、餐饮' : dayWuxing === '土' ? '房产、农业' : dayWuxing === '金' ? '金融、制造' : '贸易、物流'}等行业发展。`);

  // 感情婚姻
  const relTexts: string[] = [
    `${dayWuxing}行人在感情中${dayWuxing === '火' ? '热情奔放' : dayWuxing === '水' ? '温柔多情' : dayWuxing === '木' ? '专一执着' : dayWuxing === '金' ? '忠贞不渝' : '踏实稳重'}。`,
  ];
  if ((shishen.正财 + shishen.偏财) >= 2) relTexts.push('财星旺盛，异性缘较好，但需注意感情中的取舍。');
  else relTexts.push('感情运势平稳，适合通过朋友介绍结识良缘。');

  // 健康提示
  const healthWeak = Object.entries(wuxing).sort((a, b) => a[1] - b[1])[0];
  const healthTexts = [
    `五行中${healthWeak[0]}行偏弱（${healthWeak[1]}%），需特别注意相关健康问题。`,
    dayWuxing === '木' ? '注意肝胆和眼睛的保养。' :
    dayWuxing === '火' ? '注意心脏和血液循环。' :
    dayWuxing === '土' ? '注意脾胃消化系统。' :
    dayWuxing === '金' ? '注意肺部和呼吸系统。' : '注意肾脏和泌尿系统。',
    '建议保持规律作息，适当运动，饮食均衡。',
  ];

  // 运势建议
  const adviceText = `总体而言，您的八字格局${strength === '旺' ? '身旺有力' : strength === '相' ? '中偏强' : strength === '休' ? '平衡适中' : '偏弱需扶'}。${keywords.map((k) => k.keyword).join('、')}是您命格的主要特征。建议在事业上${strength === '旺' || strength === '相' ? '大胆开拓' : '稳扎稳打'}，在生活中注意${dayWuxing === '火' ? '控制脾气' : dayWuxing === '水' ? '增强自信' : '保持平衡'}。命理分析仅供参考，人生的精彩由自己创造。`;

  const precision = noBirthTime ? 'reduced' : 'full';

  return {
    wuxing: {
      distribution: wuxing,
      description: `五行分布：木${wuxing.木}%、火${wuxing.火}%、土${wuxing.土}%、金${wuxing.金}%、水${wuxing.水}%。${Object.entries(wuxing).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}(${v}%)`).join(' > ')}。`,
    },
    personality,
    career: careerTexts.join(''),
    relationship: relTexts.join(''),
    health: healthTexts.join(''),
    advice: adviceText + (noBirthTime ? '\n\n注意：由于未提供出生时辰，以上分析基于年月日三柱计算，精度有所降低。部分时柱相关分析以通用建议替代。' : ''),
    keywords,
    precision,
  };
}
