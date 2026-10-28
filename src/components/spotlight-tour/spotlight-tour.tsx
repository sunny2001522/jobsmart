"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface SpotlightStep {
  /** 對應目標元素的 data-tour 屬性值 */
  target: string;
  title: string;
  body: string;
}

interface SpotlightTourProps {
  steps: SpotlightStep[];
  open: boolean;
  onClose: (completed: boolean) => void;
  labels?: { next: string; prev: string; skip: string; done: string };
}

type Rect = { top: number; left: number; width: number; height: number };

const PADDING = 8;
const GAP = 12;
const EDGE = 16;
const CARD_WIDTH = 340;
const CARD_SPACE = 200;

const defaultLabels = { next: "下一步", prev: "上一步", skip: "略過教學", done: "開始使用" };

function findTarget(target: string) {
  const elements = document.querySelectorAll<HTMLElement>(`[data-tour="${target}"]`);
  // 同一個 target 可能同時存在於桌機與手機版元件，取目前看得到的那個
  return Array.from(elements).find((element) => {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }) ?? null;
}

function measure(element: HTMLElement): Rect {
  const rect = element.getBoundingClientRect();
  const top = Math.max(rect.top - PADDING, 4);
  const left = Math.max(rect.left - PADDING, 4);
  return {
    top,
    left,
    width: Math.min(rect.right + PADDING, window.innerWidth - 4) - left,
    height: Math.min(rect.bottom + PADDING, window.innerHeight - 4) - top,
  };
}

export function SpotlightTour({ steps, open, onClose, labels = defaultLabels }: SpotlightTourProps) {
  const titleId = useId();
  const [activeSteps, setActiveSteps] = useState<SpotlightStep[]>([]);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const primaryRef = useRef<HTMLButtonElement>(null);

  // 開啟時只保留畫面上找得到的步驟（例如手機版沒有側邊欄）
  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => {
      setActiveSteps(steps.filter((step) => findTarget(step.target)));
      setIndex(0);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open, steps]);

  const step = activeSteps[index];
  const isLast = index === activeSteps.length - 1;

  const updateRect = useCallback(() => {
    if (!step) return;
    const element = findTarget(step.target);
    setViewport({ width: window.innerWidth, height: window.innerHeight });
    setRect(element ? measure(element) : null);
  }, [step]);

  useEffect(() => {
    if (!open || !step) return;
    const element = findTarget(step.target);
    element?.scrollIntoView({ block: "nearest", inline: "nearest" });
    const frame = window.requestAnimationFrame(updateRect);
    const observer = element ? new ResizeObserver(updateRect) : null;
    if (element) observer?.observe(element);
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [open, step, updateRect]);

  useEffect(() => {
    if (open && step) primaryRef.current?.focus();
  }, [open, step]);

  const finish = useCallback((completed: boolean) => onClose(completed), [onClose]);
  const next = useCallback(() => (isLast ? finish(true) : setIndex((value) => value + 1)), [finish, isLast]);
  const prev = useCallback(() => setIndex((value) => Math.max(0, value - 1)), []);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") finish(false);
      else if (event.key === "ArrowRight") next();
      else if (event.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [finish, next, open, prev]);

  // 沒有任何可顯示的步驟時直接結束，避免卡在空白遮罩
  useEffect(() => {
    if (open && activeSteps.length === 0 && steps.length > 0) {
      const timer = window.setTimeout(() => {
        if (!steps.some((item) => findTarget(item.target))) finish(false);
      }, 300);
      return () => window.clearTimeout(timer);
    }
  }, [activeSteps.length, finish, open, steps]);

  if (typeof document === "undefined") return null;

  const cardWidth = Math.min(CARD_WIDTH, viewport.width - EDGE * 2);
  let cardStyle: React.CSSProperties = { width: cardWidth, left: (viewport.width - cardWidth) / 2, top: viewport.height / 2 - 100 };
  if (rect) {
    const left = Math.min(Math.max(rect.left + rect.width / 2 - cardWidth / 2, EDGE), viewport.width - cardWidth - EDGE);
    const spaceBelow = viewport.height - (rect.top + rect.height);
    if (spaceBelow >= CARD_SPACE) cardStyle = { width: cardWidth, left, top: rect.top + rect.height + GAP };
    else if (rect.top >= CARD_SPACE) cardStyle = { width: cardWidth, left, bottom: viewport.height - rect.top + GAP };
    else if (viewport.width - (rect.left + rect.width) >= cardWidth + EDGE) cardStyle = { width: cardWidth, left: rect.left + rect.width + GAP, top: Math.max(EDGE, Math.min(rect.top, viewport.height - CARD_SPACE)) };
    else cardStyle = { width: cardWidth, left, bottom: EDGE };
  }

  return createPortal(
    <AnimatePresence>
      {open && step && (
        <motion.div
          key="spotlight-tour"
          className="fixed inset-0 z-[100]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          {/* 攔截點擊，避免教學期間誤觸頁面 */}
          <div className="absolute inset-0" onClick={(event) => event.stopPropagation()} />

          {rect ? (
            <motion.div
              className="pointer-events-none absolute rounded-xl ring-2 ring-primary/80"
              style={{ boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.6)" }}
              initial={false}
              animate={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
              transition={{ type: "spring", stiffness: 260, damping: 30 }}
            />
          ) : (
            <div className="pointer-events-none absolute inset-0 bg-black/60" />
          )}

          <motion.div
            key={step.target}
            className="absolute rounded-xl border bg-popover p-4 text-popover-foreground shadow-2xl"
            style={cardStyle}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-start justify-between gap-3">
              <h2 id={titleId} className="text-sm font-semibold">{step.title}</h2>
              <button
                type="button"
                className="-mr-1 -mt-1 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => finish(false)}
                aria-label={labels.skip}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{step.body}</p>
            <div className="mt-4 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1" aria-label={`${index + 1} / ${activeSteps.length}`}>
                {activeSteps.map((item, dot) => (
                  <span
                    key={item.target}
                    className={`h-1.5 rounded-full transition-all ${dot === index ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/30"}`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                {index > 0 ? (
                  <Button variant="ghost" size="sm" onClick={prev}>
                    <ChevronLeft className="mr-0.5 h-4 w-4" />
                    {labels.prev}
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" onClick={() => finish(false)}>{labels.skip}</Button>
                )}
                <Button ref={primaryRef} size="sm" onClick={next}>
                  {isLast ? labels.done : labels.next}
                  {!isLast && <ChevronRight className="ml-0.5 h-4 w-4" />}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/** 第一次進入頁面時自動開啟教學，並提供重新開啟的方法 */
export function useSpotlightTour(storageKey: string, { autoStart = true, delay = 600 } = {}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!autoStart) return;
    let seen = false;
    try { seen = window.localStorage.getItem(storageKey) === "done"; } catch { /* storage unavailable */ }
    if (seen) return;
    const timer = window.setTimeout(() => setOpen(true), delay);
    return () => window.clearTimeout(timer);
  }, [autoStart, delay, storageKey]);

  const close = useCallback(() => {
    setOpen(false);
    try { window.localStorage.setItem(storageKey, "done"); } catch { /* storage unavailable */ }
  }, [storageKey]);

  return { open, start: useCallback(() => setOpen(true), []), close };
}
