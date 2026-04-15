import { prisma } from '../config/database';
import { cache } from '../config/cache';
import { getDayGanzhi, solarToLunar, WuxingResult } from '../algorithms/bazi/calculator';
import { analyzeWuxingRelation, getDominantWuxing } from '../algorithms/bazi/analyzer';
import { generateSuitableItems, generateUnsuitableItems, generateLuckyColor, generateLuckyDirection } from '../algorithms/calendar/generator';

interface CalendarContent {
  date: string;
  lunarDate: string;
  ganzhi: string;
  suitable: string[];
  unsuitable: string[];
  luckyColor: string[];
  luckyDirection: string;
  cached: boolean;
}

export async function generateCalendar(userId: number, dateStr: string): Promise<CalendarContent> {
  // 1. Check cache
  const cacheKey = `calendar:${userId}:${dateStr}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    const parsed = JSON.parse(cached) as CalendarContent;
    parsed.cached = true;
    return parsed;
  }

  // 2. Check DB
  const existing = await prisma.dailyCalendar.findUnique({
    where: { userId_date: { userId, date: dateStr } },
  });
  if (existing) {
    const content = JSON.parse(existing.content) as CalendarContent;
    content.cached = true;
    cache.set(cacheKey, existing.content, 86400); // 24h
    return content;
  }

  // 3. Get user profile for bazi
  const profile = await prisma.destinyProfile.findUnique({ where: { userId } });
  const wuxing: WuxingResult = profile?.wuxing ? JSON.parse(profile.wuxing) : { 木: 20, 火: 20, 土: 20, 金: 20, 水: 20 };
  const dominant = getDominantWuxing(wuxing);

  // 4. Calculate day ganzhi
  const [y, m, d] = dateStr.split('-').map(Number);
  const dayGanzhi = getDayGanzhi(new Date(y, m - 1, d));
  const lunar = solarToLunar(y, m, d);
  const lunarDate = `农历${lunar.isLeap ? '闰' : ''}${lunar.month}月${lunar.day < 11 ? '初' : ''}${['一','二','三','四','五','六','七','八','九','十','十一','十二','十三','十四','十五','十六','十七','十八','十九','二十','廿一','廿二','廿三','廿四','廿五','廿六','廿七','廿八','廿九','三十'][lunar.day - 1] || lunar.day}`;

  // 5. Analyze wuxing relations
  const relations = analyzeWuxingRelation(dominant, dayGanzhi[0], dayGanzhi[1]);

  // 6. Generate content
  const content: CalendarContent = {
    date: dateStr,
    lunarDate,
    ganzhi: dayGanzhi,
    suitable: generateSuitableItems(relations),
    unsuitable: generateUnsuitableItems(relations),
    luckyColor: generateLuckyColor(relations),
    luckyDirection: generateLuckyDirection(relations),
    cached: false,
  };

  // 7. Save to DB and cache
  const contentStr = JSON.stringify(content);
  await prisma.dailyCalendar.create({
    data: { userId, date: dateStr, content: contentStr, cached: false },
  });
  cache.set(cacheKey, contentStr, 86400);

  return content;
}
