"use client";

import { motion, type MotionValue, useTransform, useMotionValue } from "framer-motion";
import { cn } from "@/lib/utils";

interface SwipeIndicatorProps {
  currentIndex: number;
  totalPages: number;
  dragX?: MotionValue<number>;
}

export function SwipeIndicator({
  currentIndex,
  totalPages,
  dragX,
}: SwipeIndicatorProps) {
  // 建立一個預設的 MotionValue 作為 fallback
  const defaultX = useMotionValue(0);
  const activeX = dragX ?? defaultX;

  // 計算指示條的位移（基於拖曳距離）
  const indicatorX = useTransform(activeX, (value) => {
    // 將拖曳距離轉換為微小的指示條位移（視覺回饋）
    return value * -0.1;
  });

  return (
    <div className="flex flex-col items-center justify-center h-full gap-2">
      {/* 頁面指示點 */}
      <div className="flex gap-1.5">
        {Array.from({ length: totalPages }).map((_, index) => (
          <motion.div
            key={index}
            className={cn(
              "h-1.5 rounded-full transition-all duration-200",
              index === currentIndex
                ? "w-4 bg-foreground"
                : "w-1.5 bg-foreground/30"
            )}
            animate={{
              scale: index === currentIndex ? 1 : 0.9,
            }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          />
        ))}
      </div>

      {/* Safari 風格滑動指示條 */}
      <motion.div
        className="w-[134px] h-[5px] rounded-full bg-foreground/30"
        style={{ x: indicatorX }}
      />
    </div>
  );
}
