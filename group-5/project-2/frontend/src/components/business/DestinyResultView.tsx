"use client";

import { Card } from "@/components/ui";
import { WuxingChart } from "./WuxingChart";
import type { DestinyResult } from "@/types";

const SECTIONS = [
  { key: "personality" as const, title: "性格特征", icon: "🧠" },
  { key: "career" as const, title: "事业财运", icon: "💰" },
  { key: "relationship" as const, title: "感情婚姻", icon: "❤️" },
  { key: "health" as const, title: "健康提示", icon: "🏥" },
  { key: "advice" as const, title: "运势建议", icon: "⭐" },
];

interface DestinyResultViewProps {
  data: DestinyResult;
}

export function DestinyResultView({ data }: DestinyResultViewProps) {
  return (
    <div className="space-y-6">
      {/* 无时辰提示 */}
      {data.noBirthTime && (
        <div className="bg-primary/10 text-primary text-sm py-2 px-4 rounded-lg border border-[#F7931A]/30">
          因未提供出生时辰，以下分析基于三柱推算，精度有所降低
        </div>
      )}

      {/* 命格关键词 */}
      <div className="flex flex-wrap gap-3">
        {data.keywords.map((kw) => (
          <span
            key={kw}
            className="bg-black/40 border border-[#F7931A]/30 px-4 py-2 rounded-full font-heading text-lg bg-gradient-to-r from-[#EA580C] to-[#F7931A] bg-clip-text text-transparent"
          >
            {kw}
          </span>
        ))}
      </div>

      {/* 五行分析 */}
      <Card variant="glass">
        <h3 className="font-heading text-lg text-text-primary mb-4">五行分析</h3>
        <WuxingChart data={data.wuxing} />
        <p className="text-text-secondary leading-relaxed mt-4">{data.wuxing.analysis}</p>
      </Card>

      {/* 分段内容 */}
      {SECTIONS.map(({ key, title, icon }, index) => (
        <Card key={key} className="animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
          <h3 className="font-heading text-lg text-primary mb-3">
            <span className="mr-2">{icon}</span>
            {title}
          </h3>
          <p className="text-text-secondary leading-relaxed">{data[key]}</p>
        </Card>
      ))}
    </div>
  );
}
