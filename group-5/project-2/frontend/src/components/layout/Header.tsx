"use client";

import Link from "next/link";
import { useAuthStore } from "@/stores/auth";

export function Header() {
  const { isAuthenticated, user, logout } = useAuthStore();

  return (
    <header className="sticky top-0 z-40 h-16 bg-bg/80 backdrop-blur-md border-b border-white/5">
      <div className="max-w-content mx-auto h-full px-4 flex items-center justify-between">
        <Link href="/" className="text-gradient font-heading text-xl font-bold">
          命理测算
        </Link>
        <div className="flex items-center gap-4 text-sm">
          {isAuthenticated ? (
            <>
              <span className="text-text-secondary">{user?.nickname || "用户"}</span>
              <button
                onClick={logout}
                className="text-text-secondary hover:text-[#F7931A] transition-colors duration-200"
              >
                退出
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-text-secondary hover:text-[#F7931A] transition-colors duration-200">
                登录
              </Link>
              <Link href="/register" className="text-primary hover:text-[#F7931A] transition-colors duration-200">
                注册
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
