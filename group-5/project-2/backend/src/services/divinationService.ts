import { prisma } from '../config/database';
import { TIAN_GAN, DI_ZHI, getDayGanzhi } from '../algorithms/bazi/calculator';
import { determineYinYang, calculateJuNumber, arrangePalace } from '../algorithms/qimen/calculator';
import { analyzeQimen } from '../algorithms/qimen/interpreter';
import { calculateMonthGeneral, calculateFourCourses, calculateThreeTransmissions } from '../algorithms/liuren/calculator';
import { analyzeLiuren } from '../algorithms/liuren/interpreter';
import { incrementUsage, getRemainingCount } from '../middleware/rateLimiter';

export async function qimenDivination(userId: number, question: string, location: { latitude: number; longitude: number }) {
  const now = new Date();
  const hour = now.getHours();

  const yinyang = determineYinYang(now);
  const ju = calculateJuNumber(now);
  const qimenResult = arrangePalace(ju, yinyang, hour);
  const analysis = analyzeQimen(question, qimenResult);

  // Save to DB
  const record = await prisma.divinationRecord.create({
    data: {
      userId,
      type: 'qimen',
      question,
      result: JSON.stringify(analysis),
    },
  });

  // Increment usage
  incrementUsage(userId, 'qimen');

  return {
    id: record.id,
    type: 'qimen',
    question,
    result: analysis,
    createdAt: record.createdAt,
    meta: { remainingToday: getRemainingCount(userId, 'qimen') },
  };
}

export async function liurenDivination(userId: number, question: string, numbers: number[]) {
  const now = new Date();
  const month = now.getMonth() + 1;
  const hour = now.getHours();
  const dayGanzhi = getDayGanzhi(now);
  const dayGanIdx = TIAN_GAN.indexOf(dayGanzhi[0]);
  const dayZhiIdx = DI_ZHI.indexOf(dayGanzhi[1]);

  // 用用户提供的数字参与计算
  const adjustedGanIdx = (dayGanIdx + numbers[0]) % 10;
  const adjustedZhiIdx = (dayZhiIdx + numbers[1]) % 12;

  const courses = calculateFourCourses(adjustedGanIdx, adjustedZhiIdx);
  const trans = calculateThreeTransmissions(courses);
  const analysis = analyzeLiuren(courses, trans, question);

  // Save to DB
  const record = await prisma.divinationRecord.create({
    data: {
      userId,
      type: 'liuren',
      question,
      result: JSON.stringify({ ...analysis, numbers }),
    },
  });

  // Increment usage
  incrementUsage(userId, 'liuren');

  return {
    id: record.id,
    type: 'liuren',
    question,
    result: { ...analysis, numbers },
    createdAt: record.createdAt,
    meta: { remainingToday: getRemainingCount(userId, 'liuren') },
  };
}
