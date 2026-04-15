"use client";

// TODO: 临时绕过登录验证，恢复时取消注释下方原始逻辑
export function AuthGuard({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
