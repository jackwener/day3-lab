"use client";

import dynamic from "next/dynamic";
import type { WuxingDistribution } from "@/types";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

const WUXING_CONFIG = [
  { key: "metal" as const, label: "金", color: "bg-yellow-400" },
  { key: "wood" as const, label: "木", color: "bg-green-500" },
  { key: "water" as const, label: "水", color: "bg-blue-500" },
  { key: "fire" as const, label: "火", color: "bg-red-500" },
  { key: "earth" as const, label: "土", color: "bg-amber-600" },
];

interface WuxingChartProps {
  data: WuxingDistribution;
}

export function WuxingChart({ data }: WuxingChartProps) {
  const total = Object.values(data).reduce((a, b) => a + b, 0) || 1;

  const option = {
    backgroundColor: "transparent",
    radar: {
      indicator: [
        { name: "金", max: 100 },
        { name: "木", max: 100 },
        { name: "水", max: 100 },
        { name: "火", max: 100 },
        { name: "土", max: 100 },
      ],
      axisLine: { lineStyle: { color: "rgba(255,255,255,0.15)" } },
      splitLine: { lineStyle: { color: "rgba(255,255,255,0.1)" } },
      splitArea: { show: false },
      axisName: { color: "#94A3B8", fontSize: 14 },
    },
    series: [
      {
        type: "radar",
        data: [
          {
            value: [data.metal, data.wood, data.water, data.fire, data.earth],
            areaStyle: { color: "rgba(247,147,26,0.25)" },
            lineStyle: { color: "#F7931A", width: 2 },
            itemStyle: { color: "#F7931A" },
          },
        ],
      },
    ],
  };

  return (
    <div>
      <ReactECharts option={option} style={{ width: "100%", height: 300 }} />
      <div className="space-y-2 mt-4">
        {WUXING_CONFIG.map(({ key, label, color }) => {
          const pct = Math.round((data[key] / total) * 100);
          return (
            <div key={key} className="flex items-center gap-2">
              <span className="text-text-secondary text-sm w-6">{label}</span>
              <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${color}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-text-secondary text-sm w-10 text-right">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
