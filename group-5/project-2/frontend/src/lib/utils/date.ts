/**
 * 格式化日期为 YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * 获取前后 N 天的日期
 */
export function getOffsetDate(date: Date, offset: number): Date {
  const newDate = new Date(date);
  newDate.setDate(newDate.getDate() + offset);
  return newDate;
}

/**
 * 十二时辰映射
 */
export const SHICHEN_MAP: { value: number; label: string; range: string }[] = [
  { value: 0, label: "子时", range: "23:00-01:00" },
  { value: 1, label: "丑时", range: "01:00-03:00" },
  { value: 2, label: "寅时", range: "03:00-05:00" },
  { value: 3, label: "卯时", range: "05:00-07:00" },
  { value: 4, label: "辰时", range: "07:00-09:00" },
  { value: 5, label: "巳时", range: "09:00-11:00" },
  { value: 6, label: "午时", range: "11:00-13:00" },
  { value: 7, label: "未时", range: "13:00-15:00" },
  { value: 8, label: "申时", range: "15:00-17:00" },
  { value: 9, label: "酉时", range: "17:00-19:00" },
  { value: 10, label: "戌时", range: "19:00-21:00" },
  { value: 11, label: "亥时", range: "21:00-23:00" },
];
