"use client";

import React from "react";

interface SuccessRateCircleProps {
  rate: number;
  size?: number;
}

export function SuccessRateCircle({ rate, size = 120 }: SuccessRateCircleProps) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (rate / 100) * circumference;

  const color =
    rate >= 60 ? "#22C55E" : rate >= 30 ? "#F7931A" : "#EF4444";

  return (
    <svg width={size} height={size} className="block" style={{ filter: `drop-shadow(0 0 8px ${color}40)` }}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="transition-all duration-700"
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={size * 0.24}
        fontFamily="ui-monospace, monospace"
        fontWeight="bold"
      >
        <tspan fill="url(#rateGradient)">{rate}%</tspan>
      </text>
      <defs>
        <linearGradient id="rateGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#EA580C" />
          <stop offset="100%" stopColor="#F7931A" />
        </linearGradient>
      </defs>
    </svg>
  );
}
