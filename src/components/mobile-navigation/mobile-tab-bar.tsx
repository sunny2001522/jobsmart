"use client";

import { motion, useMotionValue, useAnimation, type PanInfo } from "framer-motion";
import { useMobileNavigation } from "@/contexts/mobile-navigation-context";
import { NAVIGATION_PAGES } from "@/lib/navigation-config";
import { SwipeIndicator } from "./swipe-indicator";
import { cn } from "@/lib/utils";

const SWIPE_THRESHOLD = 50;
const VELOCITY_THRESHOLD = 500;

export function MobileTabBar() {
  const {
    currentIndex,
    totalPages,
    navigateToIndex,
    canSwipeLeft,
    canSwipeRight,
  } = useMobileNavigation();

  const dragX = useMotionValue(0);
  const controls = useAnimation();

  const handleDragEnd = async (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    const { offset, velocity } = info;

    // 根據滑動距離或速度判斷是否切換頁面
    const shouldSwipeLeft =
      offset.x > SWIPE_THRESHOLD || velocity.x > VELOCITY_THRESHOLD;
    const shouldSwipeRight =
      offset.x < -SWIPE_THRESHOLD || velocity.x < -VELOCITY_THRESHOLD;

    if (shouldSwipeLeft && canSwipeLeft) {
      navigateToIndex(currentIndex - 1);
    } else if (shouldSwipeRight && canSwipeRight) {
      navigateToIndex(currentIndex + 1);
    }

    // 復位動畫
    await controls.start({
      x: 0,
      transition: { type: "spring", stiffness: 400, damping: 30 },
    });
    dragX.set(0);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t safe-area-bottom">
      {/* Tab 圖標列 */}
      <nav className="flex justify-around items-center px-2 pt-2">
        {NAVIGATION_PAGES.map((page, index) => {
          const Icon = page.icon;
          const isActive = index === currentIndex;

          return (
            <motion.button
              key={page.path}
              onClick={() => navigateToIndex(index)}
              className={cn(
                "flex flex-col items-center gap-0.5 p-2 rounded-lg min-w-[50px]",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
              whileTap={{ scale: 0.95 }}
            >
              <motion.div
                animate={{
                  scale: isActive ? 1.1 : 1,
                  y: isActive ? -2 : 0,
                }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <Icon className="h-5 w-5" />
              </motion.div>
              <span className="text-[10px] font-medium">{page.label}</span>
            </motion.button>
          );
        })}
      </nav>

      {/* Safari 風格滑動區域 */}
      <motion.div
        className="h-[34px] touch-pan-x cursor-grab active:cursor-grabbing"
        style={{ x: dragX }}
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{
          left: canSwipeRight ? 0.2 : 0.05,
          right: canSwipeLeft ? 0.2 : 0.05,
        }}
        onDragEnd={handleDragEnd}
        animate={controls}
      >
        <SwipeIndicator
          currentIndex={currentIndex}
          totalPages={totalPages}
          dragX={dragX}
        />
      </motion.div>
    </div>
  );
}
