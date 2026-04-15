"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navItems = [
  { href: "/", label: "首页(黄历)", icon: "📅" },
  { href: "/divination", label: "运势问询", icon: "🔮" },
  { href: "/destiny", label: "命格解析", icon: "⭐" },
  { href: "/profile", label: "个人档案", icon: "👤" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* 平板端折叠按钮 */}
      <button
        onClick={() => setOpen(!open)}
        className="hidden md:flex lg:hidden fixed top-20 left-4 z-30 items-center justify-center w-10 h-10 rounded-lg bg-card border border-white/5 text-text-secondary hover:text-white transition-colors"
        aria-label="Toggle sidebar"
      >
        {open ? "✕" : "☰"}
      </button>

      {/* Overlay（平板端） */}
      {open && (
        <div
          className="hidden md:block lg:hidden fixed inset-0 z-30 bg-black/50"
          onClick={() => setOpen(false)}
        />
      )}

      {/* 侧边栏 */}
      <aside
        className={`
          fixed left-0 top-16 bottom-0 z-30 w-[280px] bg-card border-r border-white/5 py-6
          hidden
          ${open ? "md:block" : "md:hidden"}
          lg:block
        `}
      >
        <nav className="flex flex-col gap-1 px-3">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "text-primary bg-primary/10 border-l-[3px] border-primary"
                    : "text-text-secondary hover:text-white hover:bg-white/5"
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
