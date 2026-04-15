"use client";

import React from "react";

interface TabItem {
  key: string;
  label: string;
}

interface TabsProps {
  items: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
}

export function Tabs({ items, activeKey, onChange }: TabsProps) {
  return (
    <div className="flex border-b border-white/10">
      {items.map((item) => (
        <button
          key={item.key}
          className={`
            min-h-[44px] px-4 text-base font-body
            transition-colors duration-200 border-b-2 -mb-px
            ${
              item.key === activeKey
                ? "text-primary border-primary"
                : "text-text-secondary border-transparent hover:text-text-primary"
            }
          `}
          onClick={() => onChange(item.key)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
