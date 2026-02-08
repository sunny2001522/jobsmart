"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useDroppable } from "@dnd-kit/core";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useJobCategoryContext } from "@/contexts/job-category-context";
import type { JobCategory } from "@/types";

// Droppable Category Tab component
function DroppableCategoryTab({
  category,
  isSelected,
  showStats,
  stats,
  onClick,
  onTouchStart,
  onTouchEnd,
  onDeleteClick,
}: {
  category: JobCategory;
  isSelected: boolean;
  showStats?: boolean;
  stats?: number;
  onClick: () => void;
  onTouchStart: () => void;
  onTouchEnd: () => void;
  onDeleteClick: () => void;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `category-${category.id}`,
  });

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button
          ref={setNodeRef}
          onClick={onClick}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          onTouchCancel={onTouchEnd}
          className={cn(
            "inline-flex h-7 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors select-none",
            isSelected
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
            isOver && "ring-2 ring-primary bg-primary/10"
          )}
        >
          {category.name}
          {showStats && stats !== undefined && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
              {stats}
            </Badge>
          )}
        </button>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem
          onClick={onDeleteClick}
          className="text-destructive"
        >
          刪除類別
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

interface JobCategoryTabsProps {
  showStats?: boolean;
  stats?: Record<string, number>;
  totalCount?: number;
  className?: string;
}

export function JobCategoryTabs({
  showStats = false,
  stats,
  totalCount,
  className,
}: JobCategoryTabsProps) {
  const {
    categories,
    isLoading,
    selectedCategoryId,
    setSelectedCategoryId,
    addCategory,
    renameCategory,
    deleteCategory,
  } = useJobCategoryContext();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressTriggeredRef = useRef(false);

  // 聚焦編輯輸入框
  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  // 開始編輯
  const startEditing = useCallback((id: string, currentName: string) => {
    setEditingId(id);
    setEditValue(currentName);
  }, []);

  // 保存編輯
  const saveEdit = async () => {
    if (!editingId || !editValue.trim()) {
      setEditingId(null);
      return;
    }

    const success = await renameCategory(editingId, editValue.trim());
    if (success) {
      setEditingId(null);
    }
  };

  // 取消編輯
  const cancelEdit = () => {
    setEditingId(null);
    setEditValue("");
  };

  // 處理鍵盤事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveEdit();
    } else if (e.key === "Escape") {
      cancelEdit();
    }
  };

  // 處理 Tab 點擊：選中時再次點擊進入編輯
  const handleTabClick = useCallback((categoryId: string, categoryName: string) => {
    // 如果長按觸發了，不處理點擊
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }

    if (selectedCategoryId === categoryId) {
      // 已選中，進入編輯模式
      startEditing(categoryId, categoryName);
    } else {
      // 選中這個 Tab
      setSelectedCategoryId(categoryId);
    }
  }, [selectedCategoryId, setSelectedCategoryId, startEditing]);

  // 長按開始（手機端刪除）
  const handleTouchStart = useCallback((categoryId: string) => {
    longPressTriggeredRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      setDeleteConfirmId(categoryId);
    }, 500); // 500ms 長按
  }, []);

  // 長按結束
  const handleTouchEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  // 確認刪除
  const confirmDelete = async () => {
    if (!deleteConfirmId) return;

    await deleteCategory(deleteConfirmId);
    setDeleteConfirmId(null);
  };

  // 快速新增類別
  const handleQuickAdd = useCallback(async () => {
    // 生成唯一名稱
    const baseName = "新職位";
    const existingNames = new Set(categories.map((c) => c.name));

    let newName = baseName;
    let counter = 2;
    while (existingNames.has(newName)) {
      newName = `${baseName} ${counter}`;
      counter++;
    }

    // 建立類別
    const newCategory = await addCategory(newName);
    if (newCategory) {
      // 選中並進入編輯模式
      setSelectedCategoryId(newCategory.id);
      startEditing(newCategory.id, newCategory.name);
    }
  }, [categories, addCategory, setSelectedCategoryId, startEditing]);

  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <div className="h-9 w-20 animate-pulse rounded-lg bg-muted" />
        <div className="h-9 w-24 animate-pulse rounded-lg bg-muted" />
        <div className="h-9 w-24 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(
          "inline-flex h-9 items-center gap-1 rounded-lg bg-muted p-1",
          className
        )}
      >
        {/* 全部 Tab */}
        <button
          onClick={() => setSelectedCategoryId(null)}
          className={cn(
            "inline-flex h-7 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors",
            selectedCategoryId === null
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          全部
          {showStats && totalCount !== undefined && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
              {totalCount}
            </Badge>
          )}
        </button>

        {/* 類別 Tabs */}
        {categories.map((category) => (
          <div key={category.id}>
            {editingId === category.id ? (
              // 編輯模式
              <Input
                ref={inputRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={saveEdit}
                onKeyDown={handleKeyDown}
                className="h-7 w-32 text-sm"
              />
            ) : (
              // 正常模式：可拖曳放置的 Tab
              <DroppableCategoryTab
                category={category}
                isSelected={selectedCategoryId === category.id}
                showStats={showStats}
                stats={stats?.[category.id]}
                onClick={() => handleTabClick(category.id, category.name)}
                onTouchStart={() => handleTouchStart(category.id)}
                onTouchEnd={handleTouchEnd}
                onDeleteClick={() => setDeleteConfirmId(category.id)}
              />
            )}
          </div>
        ))}

        {/* 新增按鈕 */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={handleQuickAdd}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* 刪除確認對話框 */}
      <AlertDialog
        open={!!deleteConfirmId}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確定要刪除此類別嗎？</AlertDialogTitle>
            <AlertDialogDescription>
              此類別下的求職申請將會變成「未分類」，可以在「全部」Tab 中查看。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>刪除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
