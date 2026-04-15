"use client";

import React, { forwardRef, useMemo } from "react";
import { SHICHEN_MAP } from "@/lib/utils/date";

const selectClasses = `
  bg-black/50 border-0 border-b-2 border-white/20
  focus:border-primary focus:shadow-glow-input text-text-primary
  py-2 outline-none transition-all duration-200
  font-body text-base appearance-none
  bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%2394A3B8%22%20d%3D%22M6%208L1%203h10z%22%2F%3E%3C%2Fsvg%3E')]
  bg-no-repeat bg-[right_4px_center]
  pr-6
`;

const selectErrorClasses = `
  bg-black/50 border-0 border-b-2 border-error
  text-text-primary
  py-2 outline-none transition-all duration-200
  font-body text-base appearance-none
  bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%2394A3B8%22%20d%3D%22M6%208L1%203h10z%22%2F%3E%3C%2Fsvg%3E')]
  bg-no-repeat bg-[right_4px_center]
  pr-6
`;

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

const currentYear = new Date().getFullYear();
const years = Array.from({ length: currentYear - 1940 + 1 }, (_, i) => 1940 + i);
const months = Array.from({ length: 12 }, (_, i) => i + 1);

// --- DatePicker ---

interface DatePickerProps {
  value?: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  label?: string;
  error?: string;
}

export const DatePicker = forwardRef<HTMLDivElement, DatePickerProps>(
  ({ value, onChange, label, error }, ref) => {
    const parsed = useMemo(() => {
      if (!value) return { year: "", month: "", day: "" };
      const [y, m, d] = value.split("-");
      return { year: y || "", month: m ? String(Number(m)) : "", day: d ? String(Number(d)) : "" };
    }, [value]);

    const days = useMemo(() => {
      if (!parsed.year || !parsed.month) return Array.from({ length: 31 }, (_, i) => i + 1);
      return Array.from(
        { length: getDaysInMonth(Number(parsed.year), Number(parsed.month)) },
        (_, i) => i + 1
      );
    }, [parsed.year, parsed.month]);

    const handleChange = (field: "year" | "month" | "day", val: string) => {
      const next = { ...parsed, [field]: val };
      if (!next.year || !next.month || !next.day) {
        // 部分选择时也触发，传空字符串
        onChange("");
        return;
      }
      const y = next.year.padStart(4, "0");
      const m = next.month.padStart(2, "0");
      let d = next.day;
      // 校正日期
      const maxDay = getDaysInMonth(Number(y), Number(next.month));
      if (Number(d) > maxDay) d = String(maxDay);
      onChange(`${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`);
    };

    const cls = error ? selectErrorClasses : selectClasses;

    return (
      <div ref={ref} className="w-full">
        {label && (
          <label className="block text-text-secondary text-sm mb-1">{label}</label>
        )}
        <div className="flex gap-3">
          <select
            className={`flex-1 ${cls}`}
            value={parsed.year}
            onChange={(e) => handleChange("year", e.target.value)}
          >
            <option value="" disabled>年</option>
            {years.map((y) => (
              <option key={y} value={String(y)} className="bg-card">{y}</option>
            ))}
          </select>
          <select
            className={`w-20 ${cls}`}
            value={parsed.month}
            onChange={(e) => handleChange("month", e.target.value)}
          >
            <option value="" disabled>月</option>
            {months.map((m) => (
              <option key={m} value={String(m)} className="bg-card">{m}</option>
            ))}
          </select>
          <select
            className={`w-20 ${cls}`}
            value={parsed.day}
            onChange={(e) => handleChange("day", e.target.value)}
          >
            <option value="" disabled>日</option>
            {days.map((d) => (
              <option key={d} value={String(d)} className="bg-card">{d}</option>
            ))}
          </select>
        </div>
        {error && <p className="text-error text-sm mt-1">{error}</p>}
      </div>
    );
  }
);

DatePicker.displayName = "DatePicker";

// --- ShichenPicker ---

interface ShichenPickerProps {
  value?: number; // 0-11 or -1
  onChange: (value: number) => void;
  label?: string;
  error?: string;
}

export const ShichenPicker = forwardRef<HTMLSelectElement, ShichenPickerProps>(
  ({ value, onChange, label, error }, ref) => {
    const cls = error ? selectErrorClasses : selectClasses;

    return (
      <div className="w-full">
        {label && (
          <label className="block text-text-secondary text-sm mb-1">{label}</label>
        )}
        <select
          ref={ref}
          className={`w-full ${cls}`}
          value={value !== undefined ? String(value) : ""}
          onChange={(e) => onChange(Number(e.target.value))}
        >
          <option value="" disabled>请选择时辰</option>
          {SHICHEN_MAP.map((s) => (
            <option key={s.value} value={String(s.value)} className="bg-card">
              {s.label}（{s.range}）
            </option>
          ))}
          <option value="-1" className="bg-card">不清楚</option>
        </select>
        {error && <p className="text-error text-sm mt-1">{error}</p>}
      </div>
    );
  }
);

ShichenPicker.displayName = "ShichenPicker";
