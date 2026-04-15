"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth";

export function AppInitializer({ children }: { children: React.ReactNode }) {
  const hydrate = useAuthStore((s) => s.hydrate);
  useEffect(() => {
    hydrate();
  }, [hydrate]);
  return <>{children}</>;
}
