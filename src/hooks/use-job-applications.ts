"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getJobApplications,
  createJobApplication,
  updateJobApplication,
  deleteJobApplication,
  getApplicationStats,
} from "@/lib/supabase/db";
import type { JobApplication, JobApplicationInsert, JobApplicationUpdate, ApplicationStatus } from "@/lib/supabase/types";

interface ApplicationStats {
  total: number;
  wishlist: number;
  applied: number;
  interviews: number;
  offers: number;
  rejected: number;
}

export function useJobApplications() {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [stats, setStats] = useState<ApplicationStats>({
    total: 0,
    wishlist: 0,
    applied: 0,
    interviews: 0,
    offers: 0,
    rejected: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [apps, appStats] = await Promise.all([
        getJobApplications(),
        getApplicationStats(),
      ]);
      setApplications(apps);
      setStats(appStats);
    } catch (err) {
      setError("載入失敗");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const addApplication = useCallback(
    async (data: Omit<JobApplicationInsert, "user_id">) => {
      try {
        const newApp = await createJobApplication(data);
        if (newApp) {
          setApplications((prev) => [...prev, newApp]);
          // Update stats
          setStats((prev) => ({
            ...prev,
            total: prev.total + 1,
            [data.status === "wishlist" ? "wishlist" : "applied"]:
              prev[data.status === "wishlist" ? "wishlist" : "applied"] + 1,
          }));
          return newApp;
        }
        return null;
      } catch (err) {
        console.error(err);
        return null;
      }
    },
    []
  );

  const editApplication = useCallback(
    async (id: string, updates: Omit<JobApplicationUpdate, "id">) => {
      try {
        const updated = await updateJobApplication(id, updates);
        if (updated) {
          setApplications((prev) =>
            prev.map((app) => (app.id === id ? updated : app))
          );
          // Refetch stats if status changed
          if (updates.status) {
            const newStats = await getApplicationStats();
            setStats(newStats);
          }
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

  const removeApplication = useCallback(async (id: string) => {
    try {
      const success = await deleteJobApplication(id);
      if (success) {
        setApplications((prev) => prev.filter((app) => app.id !== id));
        // Refetch stats
        const newStats = await getApplicationStats();
        setStats(newStats);
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  }, []);

  const moveApplication = useCallback(
    async (id: string, newStatus: ApplicationStatus) => {
      return editApplication(id, { status: newStatus });
    },
    [editApplication]
  );

  const getApplicationsByStatus = useCallback(
    (status: ApplicationStatus) => {
      return applications.filter((app) => app.status === status);
    },
    [applications]
  );

  return {
    applications,
    stats,
    isLoading,
    error,
    refresh: fetchApplications,
    addApplication,
    editApplication,
    removeApplication,
    moveApplication,
    getApplicationsByStatus,
  };
}
