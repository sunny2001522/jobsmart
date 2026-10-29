"use client";

import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { JobCategoryProvider } from "@/contexts/job-category-context";
import { MobileNavigationProvider } from "@/contexts/mobile-navigation-context";
import { MobileTabBar } from "@/components/mobile-navigation";
import { useIsMobile } from "@/hooks/use-mobile";
import { LanguageSwitcher } from "@/components/language-switcher";
import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isMobile = useIsMobile();
  const pathname = usePathname();

  // 手機版：底部 Tab Bar + Safari 風格滑動
  if (isMobile) {
    return (
      <JobCategoryProvider>
        <MobileNavigationProvider>
          <div className="flex h-svh min-w-0 flex-col overflow-hidden">
            {/* 頂部 Header（精簡版） */}
            <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
              <BrandLogo className="h-7 max-w-[142px] flex-1 object-left" />
              <LanguageSwitcher className="h-8 w-10 shrink-0 px-2 sm:w-[130px] sm:px-3" compactOnMobile />
            </header>

            {/* 主內容區（預留底部 Tab Bar 空間） */}
            <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-4 pb-28">
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
        <SidebarInset className="min-w-0 overflow-hidden">
          {pathname !== "/applications" && (
            <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
              <SidebarTrigger className="-ml-1" />
            </header>
          )}
          <main className="min-w-0 flex-1 overflow-x-hidden p-4 md:p-6">
            {children}
          </main>
        </SidebarInset>
      </JobCategoryProvider>
    </SidebarProvider>
  );
}
