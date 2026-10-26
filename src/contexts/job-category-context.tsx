"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { JobCategory } from "@/lib/turso/types";
import {
  getJobCategories,
  createJobCategory as dbCreateCategory,
  updateJobCategory as dbUpdateCategory,
  deleteJobCategory as dbDeleteCategory,
  reorderJobCategories as dbReorderCategories,
} from "@/lib/turso/db";

interface JobCategoryContextValue {
  // 數據
  categories: JobCategory[];
  isLoading: boolean;
  error: string | null;

  // 當前選中（跨頁面同步）
  selectedCategoryId: string | null; // null = 全部
  setSelectedCategoryId: (id: string | null) => void;

  // 操作
  addCategory: (name: string, color?: string) => Promise<JobCategory | null>;
  renameCategory: (id: string, newName: string) => Promise<boolean>;
  deleteCategory: (id: string) => Promise<boolean>;
  reorderCategories: (orderedIds: string[]) => Promise<boolean>;

  // 刷新
  refresh: () => Promise<void>;
}

const JobCategoryContext = createContext<JobCategoryContextValue | null>(null);

interface JobCategoryProviderProps {
  children: ReactNode;
}

export function JobCategoryProvider({ children }: JobCategoryProviderProps) {
  const [categories, setCategories] = useState<JobCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );

  // 加載類別
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

  // 初始加載
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // 新增類別
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

  // 重命名類別
  const renameCategory = useCallback(
    async (id: string, newName: string): Promise<boolean> => {
      try {
        const updated = await dbUpdateCategory(id, { name: newName });

        if (updated) {
          setCategories((prev) =>
            prev.map((cat) =>
              cat.id === id ? { ...cat, name: newName } : cat
            )
          );
          return true;
        }

        return false;
      } catch (err) {
        console.error("Error renaming category:", err);
        return false;
      }
    },
    []
  );

  // 刪除類別
  const deleteCategory = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const success = await dbDeleteCategory(id);

        if (success) {
          setCategories((prev) => prev.filter((cat) => cat.id !== id));

          // 如果刪除的是當前選中的類別，重置為「全部」
          if (selectedCategoryId === id) {
            setSelectedCategoryId(null);
          }

          return true;
        }

        return false;
      } catch (err) {
        console.error("Error deleting category:", err);
        return false;
      }
    },
    [selectedCategoryId]
  );

  // 重新排序類別
  const reorderCategories = useCallback(
    async (orderedIds: string[]): Promise<boolean> => {
      // 樂觀更新
      const newOrder = orderedIds
        .map((id) => categories.find((cat) => cat.id === id))
        .filter((cat): cat is JobCategory => cat !== undefined);

      setCategories(newOrder);

      try {
        const success = await dbReorderCategories(orderedIds);

        if (!success) {
          // 回滾
          await fetchCategories();
          return false;
        }

        return true;
      } catch (err) {
        console.error("Error reordering categories:", err);
        // 回滾
        await fetchCategories();
        return false;
      }
    },
    [categories, fetchCategories]
  );

  const value: JobCategoryContextValue = {
    categories,
    isLoading,
    error,
    selectedCategoryId,
    setSelectedCategoryId,
    addCategory,
    renameCategory,
    deleteCategory,
    reorderCategories,
    refresh: fetchCategories,
  };

  return (
    <JobCategoryContext.Provider value={value}>
      {children}
    </JobCategoryContext.Provider>
  );
}

export function useJobCategoryContext() {
  const context = useContext(JobCategoryContext);

  if (!context) {
    throw new Error(
      "useJobCategoryContext must be used within JobCategoryProvider"
    );
  }

  return context;
}
