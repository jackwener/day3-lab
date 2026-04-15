import { prisma } from '../config/database';
import { calculatePillars } from '../algorithms/bazi/calculator';
import { generateDestinyAnalysis } from '../algorithms/destiny/generator';

export async function analyzeDestiny(
  userId: number,
  name: string,
  gender: string,
  birthDate: string,
  birthTime?: string,
  noBirthTime: boolean = false,
) {
  const [y, m, d] = birthDate.split('-').map(Number);
  let hour: number | undefined;
  if (birthTime && !noBirthTime) {
    hour = parseInt(birthTime.split(':')[0], 10);
  }

  const bazi = calculatePillars(y, m, d, hour);
  const analysis = generateDestinyAnalysis(bazi, noBirthTime);

  // Save to DB
  const record = await prisma.destinyHistory.create({
    data: {
      userId,
      name,
      gender,
      birthDate,
      birthTime: birthTime || null,
      keywords: JSON.stringify(analysis.keywords),
      result: JSON.stringify(analysis),
    },
  });

  return {
    id: record.id,
    name,
    gender,
    birthDate,
    bazi,
    ...analysis,
    createdAt: record.createdAt,
  };
}
