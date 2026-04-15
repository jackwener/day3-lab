import { WuxingRelation, getWuxingLuck } from '../bazi/analyzer';

// 五行事项库
const SUITABLE_ITEMS: Record<string, string[]> = {
  '木': ['种植花草', '阅读学习', '拜访长辈', '签订合同', '开展新项目'],
  '火': ['社交聚会', '发表演讲', '营销推广', '参加面试', '创意活动'],
  '土': ['整理收纳', '理财投资', '房产事务', '修缮装修', '稳固关系'],
  '金': ['谈判交涉', '决策定论', '健身运动', '手术就医', '裁剪取舍'],
  '水': ['冥想放松', '旅行出行', '艺术创作', '情感交流', '灵感思考'],
};

const UNSUITABLE_ITEMS: Record<string, string[]> = {
  '木': ['砍伐破坏', '过度劳累', '激烈争吵'],
  '火': ['冲动消费', '冒险行为', '夜间外出'],
  '土': ['搬迁迁徙', '频繁变动', '高风险投资'],
  '金': ['感情冲突', '过度固执', '独断专行'],
  '水': ['重大决策', '签订长约', '过度消耗'],
};

// 五行→颜色映射
const WUXING_COLORS: Record<string, string[]> = {
  '木': ['绿色', '青色'],
  '火': ['红色', '紫色'],
  '土': ['黄色', '棕色'],
  '金': ['白色', '金色'],
  '水': ['黑色', '蓝色'],
};

// 五行→方向映射
const WUXING_DIRECTIONS: Record<string, string[]> = {
  '木': ['正东'],
  '火': ['正南'],
  '土': ['中央', '东北', '西南'],
  '金': ['正西', '西北'],
  '水': ['正北'],
};

// 获取最有利五行
function getFavorableWuxing(relations: Record<string, WuxingRelation>): string {
  // 优先选吉的五行
  for (const [wx, rel] of Object.entries(relations)) {
    if (getWuxingLuck(rel) === '吉') return wx;
  }
  // 没有吉的选中的
  for (const [wx, rel] of Object.entries(relations)) {
    if (getWuxingLuck(rel) === '中') return wx;
  }
  return Object.keys(relations)[0];
}

// 获取不利五行
function getUnfavorableWuxing(relations: Record<string, WuxingRelation>): string {
  for (const [wx, rel] of Object.entries(relations)) {
    if (getWuxingLuck(rel) === '凶') return wx;
  }
  return Object.keys(relations)[1] || Object.keys(relations)[0];
}

// 生成适宜事项 (3-5条)
export function generateSuitableItems(relations: Record<string, WuxingRelation>): string[] {
  const favorable = getFavorableWuxing(relations);
  const items = SUITABLE_ITEMS[favorable] || SUITABLE_ITEMS['木'];
  const count = 3 + Math.floor(Math.random() * 3); // 3-5
  return items.slice(0, count);
}

// 生成不适宜事项 (2-3条)
export function generateUnsuitableItems(relations: Record<string, WuxingRelation>): string[] {
  const unfavorable = getUnfavorableWuxing(relations);
  const items = UNSUITABLE_ITEMS[unfavorable] || UNSUITABLE_ITEMS['木'];
  const count = 2 + Math.floor(Math.random() * 2); // 2-3
  return items.slice(0, count);
}

// 生成幸运颜色 (1-2种)
export function generateLuckyColor(relations: Record<string, WuxingRelation>): string[] {
  const favorable = getFavorableWuxing(relations);
  const colors = WUXING_COLORS[favorable] || WUXING_COLORS['木'];
  return colors.slice(0, 1 + Math.floor(Math.random() * 2));
}

// 生成有利方向
export function generateLuckyDirection(relations: Record<string, WuxingRelation>): string {
  const favorable = getFavorableWuxing(relations);
  const directions = WUXING_DIRECTIONS[favorable] || WUXING_DIRECTIONS['木'];
  return directions[0];
}
