"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { JobCategory, CategoryStats } from "@/lib/turso/types";
import {
  getJobCategories,
  createJobCategory as dbCreateCategory,
  updateJobCategory as dbUpdateCategory,
  deleteJobCategory as dbDeleteCategory,
  reorderJobCategories as dbReorderCategories,
  getCategoryStats as dbGetCategoryStats,
} from "@/lib/turso/db";

// 直接使用的 hook（適用於非 Context 場景）
export function useJobCategories() {
  const [categories, setCategories] = useState<JobCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getJobCategories();
      setCategories(data);
    } catch (err) {
      console.error("Error fetching categories:", err);
      setError("無法載入職位類別");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const addCategory = useCallback(
    async (name: string, color?: string): Promise<JobCategory | null> => {
      try {
        const newCategory = await dbCreateCategory({
          name,
          color: color || "#6366f1",
          is_active: true,
          display_order: categories.length,
        });

        if (newCategory) {
          setCategories((prev) => [...prev, newCategory]);
        }

        return newCategory;
      } catch (err) {
        console.error("Error adding category:", err);
        return null;
      }
    },
    [categories.length]
  );

  const editCategory = useCallback(
    async (id: string, updates: { name?: string; color?: string }): Promise<JobCategory | null> => {
      try {
        const updated = await dbUpdateCategory(id, updates);

        if (updated) {
          setCategories((prev) =>
            prev.map((cat) =>
              cat.id === id ? { ...cat, ...updates } : cat
            )
          );
        }

        return updated;
      } catch (err) {
        console.error("Error updating category:", err);
        return null;
      }
    },
    []
  );

  const removeCategory = useCallback(async (id: string): Promise<boolean> => {
    try {
      const success = await dbDeleteCategory(id);

      if (success) {
        setCategories((prev) => prev.filter((cat) => cat.id !== id));
      }

      return success;
    } catch (err) {
      console.error("Error deleting category:", err);
      return false;
    }
  }, []);

  const reorderCategories = useCallback(
    async (orderedIds: string[]): Promise<boolean> => {
      // 樂觀更新
      const oldCategories = [...categories];
      const newOrder = orderedIds
        .map((id) => categories.find((cat) => cat.id === id))
        .filter((cat): cat is JobCategory => cat !== undefined);

      setCategories(newOrder);

      try {
        const success = await dbReorderCategories(orderedIds);

        if (!success) {
          setCategories(oldCategories); // 回滾
          return false;
        }

        return true;
      } catch (err) {
        console.error("Error reordering categories:", err);
        setCategories(oldCategories); // 回滾
        return false;
      }
    },
    [categories]
  );

  return {
    categories,
    isLoading,
    error,
    refresh: fetchCategories,
    addCategory,
    editCategory,
    removeCategory,
    reorderCategories,
  };
}

// 類別統計 hook（用於 Dashboard）
export function useCategoryStats() {
  const [stats, setStats] = useState<CategoryStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await dbGetCategoryStats();
      setStats(data);
    } catch (err) {
      console.error("Error fetching category stats:", err);
      setError("無法載入類別統計");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // 計算總計
  const totals = useMemo(() => {
    return stats.reduce(
      (acc, stat) => ({
        total: acc.total + stat.total,
        wishlist: acc.wishlist + stat.wishlist,
        applied: acc.applied + stat.applied,
        interviews: acc.interviews + stat.interviews,
        offers: acc.offers + stat.offers,
      }),
      { total: 0, wishlist: 0, applied: 0, interviews: 0, offers: 0 }
    );
  }, [stats]);

  return {
    stats,
    totals,
    isLoading,
    error,
    refresh: fetchStats,
  };
}

// Re-export context hook
export { useJobCategoryContext } from "@/contexts/job-category-context";
