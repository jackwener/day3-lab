"use client";

import React from "react";
import { Card } from "@/components/ui";
import type { GuaInfo } from "@/types";

interface GuaVisualizationProps {
  data: GuaInfo;
}

const elementColorMap: Record<string, string> = {
  金: "text-yellow-400",
  木: "text-green-500",
  水: "text-blue-500",
  火: "text-red-500",
  土: "text-amber-600",
};

// 九宫格布局顺序：[4,9,2], [3,5,7], [8,1,6]
const gridOrder = [4, 9, 2, 3, 5, 7, 8, 1, 6];

export function GuaVisualization({ data }: GuaVisualizationProps) {
  const posMap = new Map(data.positions.map((p) => [p.position, p]));

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {gridOrder.map((pos) => {
        const item = posMap.get(pos);
        if (!item) return <div key={pos} />;
        const isCenterPalace = pos === 5;
        return (
          <Card
            key={pos}
            variant="default"
            className={`p-3 sm:p-4 text-center rounded-2xl ${
              isCenterPalace ? "border-primary animate-pulse-glow" : ""
            }`}
            style={
              isCenterPalace
                ? { animation: "pulse-glow 2s ease-in-out infinite" }
                : undefined
            }
          >
            <div className="text-text-secondary text-xs mb-1">{item.label}</div>
            <div className="text-text-primary text-sm sm:text-base font-heading">
              {item.value}
            </div>
            <div className={`text-xs mt-1 ${elementColorMap[item.element] || "text-text-secondary"}`}>
              {item.element}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
