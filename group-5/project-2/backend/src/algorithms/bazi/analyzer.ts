import { WuxingResult, GAN_WUXING, ZHI_WUXING } from './calculator';

// 五行生克关系
type WuxingRelation = '生我' | '我生' | '克我' | '我克' | '同我';

const SHENG_MAP: Record<string, string> = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };
const KE_MAP: Record<string, string> = { '木': '土', '火': '金', '土': '水', '金': '木', '水': '火' };

// 分析用户八字五行与当日干支的生克关系
export function analyzeWuxingRelation(userDominant: string, dayGan: string, dayZhi: string): Record<string, WuxingRelation> {
  const dayGanWuxing = GAN_WUXING[dayGan];
  const dayZhiWuxing = ZHI_WUXING[dayZhi];

  function getRelation(targetWx: string): WuxingRelation {
    if (targetWx === userDominant) return '同我';
    if (SHENG_MAP[targetWx] === userDominant) return '生我';
    if (SHENG_MAP[userDominant] === targetWx) return '我生';
    if (KE_MAP[targetWx] === userDominant) return '克我';
    return '我克';
  }

  return {
    [dayGanWuxing]: getRelation(dayGanWuxing),
    [dayZhiWuxing]: getRelation(dayZhiWuxing),
  };
}

// 判断五行吉凶
export function getWuxingLuck(relation: WuxingRelation): '吉' | '凶' | '中' {
  switch (relation) {
    case '生我': return '吉';
    case '同我': return '吉';
    case '我生': return '中';
    case '我克': return '中';
    case '克我': return '凶';
  }
}

// 获取用户主导五行
export function getDominantWuxing(wuxing: WuxingResult): string {
  let max = 0;
  let dominant = '木';
  for (const [key, val] of Object.entries(wuxing)) {
    if (val > max) {
      max = val;
      dominant = key;
    }
  }
  return dominant;
}

export { WuxingRelation };
