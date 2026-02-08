"use client";

import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { JobCategoryProvider } from "@/contexts/job-category-context";
import { MobileNavigationProvider } from "@/contexts/mobile-navigation-context";
import { MobileTabBar } from "@/components/mobile-navigation";
import { useIsMobile } from "@/hooks/use-mobile";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isMobile = useIsMobile();

  // 手機版：底部 Tab Bar + Safari 風格滑動
  if (isMobile) {
    return (
      <JobCategoryProvider>
        <MobileNavigationProvider>
          <div className="flex flex-col h-svh">
            {/* 頂部 Header（精簡版） */}
            <header className="flex h-12 shrink-0 items-center border-b px-4">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
                J
              </div>
              <span className="ml-2 font-semibold">JobSmart</span>
            </header>

            {/* 主內容區（預留底部 Tab Bar 空間） */}
            <main className="flex-1 overflow-auto p-4 pb-28">
              {children}
            </main>

            {/* 底部 Tab Bar + 滑動區域 */}
            <MobileTabBar />
          </div>
        </MobileNavigationProvider>
      </JobCategoryProvider>
    );
  }

  // 電腦版：保留現有側邊欄
  return (
    <SidebarProvider>
      <JobCategoryProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="flex-1" />
          </header>
          <main className="flex-1 p-4 md:p-6">
            {children}
          </main>
        </SidebarInset>
      </JobCategoryProvider>
    </SidebarProvider>
  );
}
