"use client";

import { useState, useEffect, useCallback } from "react";
import { getApplicationStats, getRecentActivity, type RecentActivity } from "@/lib/turso/db";

interface DashboardStats {
  totalApplications: number;
  wishlist: number;
  applied: number;
  interviews: number;
  offers: number;
  rejected: number;
}

interface WeeklyGoals {
  applications: { current: number; target: number };
  interviews: { current: number; target: number };
  practice: { current: number; target: number };
}

export function useDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalApplications: 0,
    wishlist: 0,
    applied: 0,
    interviews: 0,
    offers: 0,
    rejected: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [weeklyGoals, setWeeklyGoals] = useState<WeeklyGoals>({
    applications: { current: 0, target: 10 },
    interviews: { current: 0, target: 3 },
    practice: { current: 0, target: 5 },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [statsData, activityData] = await Promise.all([
        getApplicationStats(),
        getRecentActivity(5),
      ]);

      setStats({
        totalApplications: statsData.total,
        wishlist: statsData.wishlist,
        applied: statsData.applied,
        interviews: statsData.interviews,
        offers: statsData.offers,
        rejected: statsData.rejected,
      });

      setRecentActivity(activityData);

      // Calculate weekly goals based on this week's activity
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const thisWeekActivity = activityData.filter(
        (a) => new Date(a.date) >= oneWeekAgo
      );

      setWeeklyGoals({
        applications: {
          current: thisWeekActivity.filter((a) => a.type === "applied").length,
          target: 10,
        },
        interviews: {
          current: thisWeekActivity.filter((a) => a.type === "interview").length,
          target: 3,
        },
        practice: {
          current: 0, // TODO: Implement practice tracking
          target: 5,
        },
      });
    } catch (err) {
      setError("載入失敗");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const responseRate = stats.applied > 0
    ? Math.round(((stats.interviews + stats.offers) / stats.applied) * 100)
    : 0;

  return {
    stats,
    recentActivity,
    weeklyGoals,
    responseRate,
    isLoading,
    error,
    refresh: fetchDashboardData,
  };
}
