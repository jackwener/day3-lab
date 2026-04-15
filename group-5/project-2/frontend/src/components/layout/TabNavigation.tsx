"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "首页", icon: "📅" },
  { href: "/divination", label: "问询", icon: "🔮" },
  { href: "/destiny", label: "解析", icon: "⭐" },
  { href: "/profile", label: "我的", icon: "👤" },
];

export function TabNavigation() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-white/5">
      <div className="flex">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 flex flex-col items-center justify-center min-h-[44px] py-2 text-xs transition-colors ${
                isActive ? "text-primary" : "text-text-secondary"
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
