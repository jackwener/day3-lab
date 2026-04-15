"use client";

import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { TabNavigation } from "./TabNavigation";
import { MockBanner } from "./MockBanner";
import { AuthGuard } from "./AuthGuard";

interface PageLayoutProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

export function PageLayout({ children, requireAuth = true }: PageLayoutProps) {
  const content = (
    <div className="max-w-content mx-auto px-4 py-6">
      {children}
    </div>
  );

  return (
    <>
      <MockBanner />
      <Header />
      <div className="flex">
        <Sidebar />
        <main role="main" className="flex-1 lg:ml-[280px] pb-20 md:pb-0">
          {requireAuth ? <AuthGuard>{content}</AuthGuard> : content}
        </main>
      </div>
      <TabNavigation />
    </>
  );
}
