"use client";

import React, { useState, useEffect } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { Tabs, Button, Input, Card } from "@/components/ui";
import { GuaVisualization } from "@/components/business/GuaVisualization";
import { SuccessRateCircle } from "@/components/business/SuccessRateCircle";
import { useDivinationStore } from "@/stores/divination";
import type { DivinationResult } from "@/types";

const tabItems = [
  { key: "qimen", label: "奇门遁甲" },
  { key: "liuren", label: "大小六壬" },
];

function JudgmentBadge({ judgment }: { judgment: "吉" | "凶" | "中平" }) {
  const cls =
    judgment === "吉"
      ? "bg-success/10 text-success"
      : judgment === "凶"
      ? "bg-error/10 text-error"
      : "bg-primary/10 text-primary";
  return (
    <span className={`inline-block px-3 py-1 rounded-full text-sm border ${cls} ${
      judgment === "吉" ? "border-success/30" : judgment === "凶" ? "border-error/30" : "border-primary/30"
    }`}>
      {judgment}
    </span>
  );
}

function ResultDisplay({ result }: { result: DivinationResult }) {
  return (
    <Card variant="glass" className="mt-6 space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <h3 className="font-heading text-xl text-primary">{result.gua.name}</h3>
        <JudgmentBadge judgment={result.judgment} />
      </div>
      <GuaVisualization data={result.gua} />
      <div className="flex justify-center">
        <SuccessRateCircle rate={result.successRate} />
      </div>
      <p className="text-text-secondary leading-relaxed">{result.analysis}</p>
    </Card>
  );
}

function QimenTab() {
  const { remainingQimen, loading, submitQimen, qimenResult } = useDivinationStore();
  const [question, setQuestion] = useState("");
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationFallback, setLocationFallback] = useState(false);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => {
        setLocation({ latitude: 39.9042, longitude: 116.4074 });
        setLocationFallback(true);
      }
    );
  }, []);

  const charCount = question.length;
  const charValid = charCount >= 10 && charCount <= 200;

  const handleSubmit = () => {
    if (!charValid || !location || remainingQimen <= 0) return;
    submitQimen(question, location);
  };

  return (
    <div className="space-y-4 mt-4">
      <p className="text-text-secondary text-sm">今日剩余 {remainingQimen} 次</p>
      <div className="relative">
        <textarea
          className="w-full bg-black/50 border-0 border-b-2 border-white/20 focus:border-primary focus:shadow-[0_10px_20px_-10px_rgba(247,147,26,0.3)] text-text-primary placeholder:text-white/30 py-2 outline-none transition-all duration-200 font-body text-base resize-none min-h-[100px]"
          placeholder="请描述您想要问询的事项..."
          aria-label="问询内容"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={200}
        />
        <span className={`absolute right-0 bottom-3 text-xs ${charValid ? "text-text-secondary" : "text-error"}`}>
          {charCount}/200
        </span>
      </div>
      {locationFallback && (
        <p className="text-text-secondary text-xs">已使用默认位置（北京）</p>
      )}
      <Button
        onClick={handleSubmit}
        disabled={!charValid || !location || remainingQimen <= 0}
        loading={loading}
      >
        {remainingQimen <= 0 ? "今日次数已用完" : "开始问询"}
      </Button>
      {qimenResult && <ResultDisplay result={qimenResult} />}
    </div>
  );
}

function LiurenTab() {
  const { remainingLiuren, loading, submitLiuren, liurenResult } = useDivinationStore();
  const [question, setQuestion] = useState("");
  const [numbers, setNumbers] = useState<[string, string, string]>(["", "", ""]);

  const charCount = question.length;
  const charValid = charCount >= 10 && charCount <= 200;

  const parsedNumbers = numbers.map((n) => parseInt(n, 10)) as [number, number, number];
  const numbersValid = parsedNumbers.every((n) => !isNaN(n) && n >= 1 && n <= 12);

  const handleSubmit = () => {
    if (!charValid || !numbersValid || remainingLiuren <= 0) return;
    submitLiuren(question, parsedNumbers);
  };

  const updateNumber = (index: number, value: string) => {
    const next = [...numbers] as [string, string, string];
    next[index] = value;
    setNumbers(next);
  };

  return (
    <div className="space-y-4 mt-4">
      <p className="text-text-secondary text-sm">今日剩余 {remainingLiuren} 次</p>
      <div className="relative">
        <textarea
          className="w-full bg-black/50 border-0 border-b-2 border-white/20 focus:border-primary focus:shadow-[0_10px_20px_-10px_rgba(247,147,26,0.3)] text-text-primary placeholder:text-white/30 py-2 outline-none transition-all duration-200 font-body text-base resize-none min-h-[100px]"
          placeholder="请描述您想要问询的事项..."
          aria-label="问询内容"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={200}
        />
        <span className={`absolute right-0 bottom-3 text-xs ${charValid ? "text-text-secondary" : "text-error"}`}>
          {charCount}/200
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Input
          type="number"
          min={1}
          max={12}
          placeholder="第一数(1-12)"
          aria-label="第一数"
          value={numbers[0]}
          onChange={(e) => updateNumber(0, e.target.value)}
        />
        <Input
          type="number"
          min={1}
          max={12}
          placeholder="第二数(1-12)"
          aria-label="第二数"
          value={numbers[1]}
          onChange={(e) => updateNumber(1, e.target.value)}
        />
        <Input
          type="number"
          min={1}
          max={12}
          placeholder="第三数(1-12)"
          aria-label="第三数"
          value={numbers[2]}
          onChange={(e) => updateNumber(2, e.target.value)}
        />
      </div>
      <Button
        onClick={handleSubmit}
        disabled={!charValid || !numbersValid || remainingLiuren <= 0}
        loading={loading}
      >
        {remainingLiuren <= 0 ? "今日次数已用完" : "开始问询"}
      </Button>
      {liurenResult && <ResultDisplay result={liurenResult} />}
    </div>
  );
}

export default function DivinationPage() {
  const { activeTab, setActiveTab, fetchRemaining } = useDivinationStore();

  useEffect(() => {
    fetchRemaining();
  }, [fetchRemaining]);

  return (
    <PageLayout requireAuth>
      <h1 className="text-gradient font-heading text-2xl font-bold mb-6">运势问询</h1>
      <Tabs
        items={tabItems}
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as "qimen" | "liuren")}
      />
      {activeTab === "qimen" ? <QimenTab /> : <LiurenTab />}
    </PageLayout>
  );
}
