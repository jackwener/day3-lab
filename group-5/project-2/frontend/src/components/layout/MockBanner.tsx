"use client";

import { useState } from "react";
import { useAuthStore } from "@/stores/auth";

export function MockBanner() {
  const isMockMode = useAuthStore((s) => s.isMockMode);
  const [dismissed, setDismissed] = useState(false);

  if (!isMockMode || dismissed) return null;

  return (
    <div className="sticky top-0 z-50 bg-primary/10 text-primary py-2 px-4 text-sm text-center relative">
      当前为演示模式，数据仅供参考
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-primary/60 hover:text-primary transition-colors"
        aria-label="关闭提示"
      >
        ✕
      </button>
    </div>
  );
}
