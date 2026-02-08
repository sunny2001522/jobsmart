"use client";

import {
  createContext,
  useContext,
  useCallback,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { NAVIGATION_PAGES } from "@/lib/navigation-config";

interface MobileNavigationContextValue {
  currentIndex: number;
  totalPages: number;
  navigateToIndex: (index: number) => void;
  navigateToPath: (path: string) => void;
  canSwipeLeft: boolean;
  canSwipeRight: boolean;
}

const MobileNavigationContext = createContext<MobileNavigationContextValue | null>(null);

export function MobileNavigationProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  // 根據當前路徑計算索引（支援子路由）
  const currentIndex = NAVIGATION_PAGES.findIndex(
    (p) => pathname === p.path || pathname.startsWith(p.path + "/")
  );

  const navigateToIndex = useCallback(
    (index: number) => {
      if (index >= 0 && index < NAVIGATION_PAGES.length) {
        router.push(NAVIGATION_PAGES[index].path);
      }
    },
    [router]
  );

  const navigateToPath = useCallback(
    (path: string) => {
      router.push(path);
    },
    [router]
  );

  const value: MobileNavigationContextValue = {
    currentIndex: Math.max(0, currentIndex),
    totalPages: NAVIGATION_PAGES.length,
    navigateToIndex,
    navigateToPath,
    canSwipeLeft: currentIndex > 0,
    canSwipeRight: currentIndex < NAVIGATION_PAGES.length - 1,
  };

  return (
    <MobileNavigationContext.Provider value={value}>
      {children}
    </MobileNavigationContext.Provider>
  );
}

export function useMobileNavigation() {
  const context = useContext(MobileNavigationContext);
  if (!context) {
    throw new Error(
      "useMobileNavigation must be used within MobileNavigationProvider"
    );
  }
  return context;
}
