"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getResumes,
  getResume,
  createResume,
  updateResume,
  deleteResume,
} from "@/lib/supabase/db";
import type { Resume, ResumeInsert, ResumeUpdate } from "@/lib/supabase/types";

export function useResumes() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchResumes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getResumes();
      setResumes(data);
    } catch (err) {
      setError("載入失敗");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResumes();
  }, [fetchResumes]);

  const addResume = useCallback(
    async (data: Omit<ResumeInsert, "user_id">) => {
      try {
        const newResume = await createResume(data);
        if (newResume) {
          setResumes((prev) => [newResume, ...prev]);
          return newResume;
        }
        return null;
      } catch (err) {
        console.error(err);
        return null;
      }
    },
    []
  );

  const editResume = useCallback(
    async (id: string, updates: Omit<ResumeUpdate, "id">) => {
      try {
        const updated = await updateResume(id, updates);
        if (updated) {
          setResumes((prev) =>
            prev.map((resume) => (resume.id === id ? updated : resume))
          );
          return updated;
        }
        return null;
      } catch (err) {
        console.error(err);
        return null;
      }
    },
    []
  );

  const removeResume = useCallback(async (id: string) => {
    try {
      const success = await deleteResume(id);
      if (success) {
        setResumes((prev) => prev.filter((resume) => resume.id !== id));
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  }, []);

  const setPrimaryResume = useCallback(
    async (id: string) => {
      // First, unset all other primaries
      const updates = resumes
        .filter((r) => r.is_primary && r.id !== id)
        .map((r) => updateResume(r.id, { is_primary: false }));

      await Promise.all(updates);

      // Then set the new primary
      return editResume(id, { is_primary: true });
    },
    [resumes, editResume]
  );

  return {
    resumes,
    isLoading,
    error,
    refresh: fetchResumes,
    addResume,
    editResume,
    removeResume,
    setPrimaryResume,
    getPrimaryResume: () => resumes.find((r) => r.is_primary),
  };
}

export function useResume(id: string | null) {
  const [resume, setResume] = useState<Resume | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchResume = useCallback(async () => {
    if (!id || id === "new") {
      setResume(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await getResume(id);
      setResume(data);
    } catch (err) {
      setError("載入失敗");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchResume();
  }, [fetchResume]);

  const save = useCallback(
    async (updates: Omit<ResumeUpdate, "id">) => {
      if (!id) return null;

      try {
        const updated = await updateResume(id, updates);
        if (updated) {
          setResume(updated);
          return updated;
        }
        return null;
      } catch (err) {
        console.error(err);
        return null;
      }
    },
    [id]
  );

  return {
    resume,
    isLoading,
    error,
    refresh: fetchResume,
    save,
  };
}
