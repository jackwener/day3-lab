"use client";

import { Card } from "@/components/ui/Card";
import type { CalendarData } from "@/types";

const colorMap: Record<string, string> = {
  "红色": "bg-red-500",
  "黄色": "bg-yellow-400",
  "绿色": "bg-green-500",
  "蓝色": "bg-blue-500",
  "紫色": "bg-purple-500",
  "白色": "bg-white",
  "金色": "bg-yellow-300",
};

interface CalendarCardProps {
  data: CalendarData;
}

export function CalendarCard({ data }: CalendarCardProps) {
  return (
    <Card variant="glass" hover className="w-full max-w-lg mx-auto animate-fade-in">
      {/* 日期信息区 */}
      <div>
        <p className="font-heading text-3xl text-text-primary">{data.date}</p>
        <p className="text-text-secondary mt-1">{data.lunarDate}</p>
        <p className="font-mono text-sm text-text-secondary mt-1">{data.ganzhi}</p>
      </div>

      <div className="border-t border-white/10 my-4" />

      {/* 适宜事项 */}
      <div>
        <span className="text-success font-bold">宜</span>
        <div className="flex flex-wrap gap-2 mt-2">
          {data.suitable.map((item) => (
            <span
              key={item}
              className="bg-success/10 text-success px-3 py-1 rounded-full text-sm border border-success/20"
            >
              {item}
            </span>
          ))}
        </div>
      </div>

      <div className="border-t border-white/10 my-4" />

      {/* 不适宜事项 */}
      <div>
        <span className="text-error font-bold">忌</span>
        <div className="flex flex-wrap gap-2 mt-2">
          {data.unsuitable.map((item) => (
            <span
              key={item}
              className="bg-error/10 text-error px-3 py-1 rounded-full text-sm border border-error/20"
            >
              {item}
            </span>
          ))}
        </div>
      </div>

      <div className="border-t border-white/10 my-4" />

      {/* 底部信息区 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <span className="text-text-secondary text-sm">幸运颜色</span>
          <div className="flex items-center gap-2 mt-1">
            {data.luckyColor.map((color) => (
              <span key={color} className="flex items-center gap-1">
                <span
                  className={`inline-block w-3 h-3 rounded-full shadow-[0_0_6px_currentColor] ${colorMap[color] ?? "bg-gray-400"}`}
                />
                <span className="text-sm text-text-primary">{color}</span>
              </span>
            ))}
          </div>
        </div>
        <div>
          <span className="text-text-secondary text-sm">有利方向</span>
          <div className="flex items-center gap-2 mt-1">
            {data.luckyDirection.map((dir) => (
              <span key={dir} className="text-sm text-text-primary">
                {dir}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
