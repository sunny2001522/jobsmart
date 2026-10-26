"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getResumeVersions,
  getResumeVersionWithJobs,
  createResumeVersion,
  updateResumeVersion,
  deleteResumeVersion,
  addJobToVersion,
  removeJobFromVersion,
  getVersionJobResumes,
  updateVersionJobResume,
} from "@/lib/turso/db";
import type {
  ResumeVersion,
  ResumeVersionInsert,
  ResumeVersionUpdate,
  ResumeVersionWithJobs,
  VersionJobResume,
  VersionJobResumeUpdate,
  JobApplication,
} from "@/lib/turso/types";

// 履歷版本列表 Hook
export function useResumeVersions() {
  const [versions, setVersions] = useState<ResumeVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVersions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getResumeVersions();
      setVersions(data);
    } catch (err) {
      setError("載入履歷版本失敗");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  const addVersion = useCallback(
    async (data: Omit<ResumeVersionInsert, "user_id">) => {
      try {
        const newVersion = await createResumeVersion(data);
        if (newVersion) {
          setVersions((prev) => [...prev, newVersion]);
          return newVersion;
        }
        return null;
      } catch (err) {
        console.error(err);
        return null;
      }
    },
    []
  );

  const editVersion = useCallback(
    async (id: string, updates: Omit<ResumeVersionUpdate, "id">) => {
      try {
        const updated = await updateResumeVersion(id, updates);
        if (updated) {
          setVersions((prev) =>
            prev.map((version) => (version.id === id ? updated : version))
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

  const removeVersion = useCallback(async (id: string) => {
    try {
      const success = await deleteResumeVersion(id);
      if (success) {
        setVersions((prev) => prev.filter((version) => version.id !== id));
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  }, []);

  return {
    versions,
    isLoading,
    error,
    refresh: fetchVersions,
    addVersion,
    editVersion,
    removeVersion,
  };
}

// 單個履歷版本（包含關聯工作）Hook
export function useResumeVersion(versionId: string | null) {
  const [version, setVersion] = useState<ResumeVersionWithJobs | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVersion = useCallback(async () => {
    if (!versionId) {
      setVersion(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await getResumeVersionWithJobs(versionId);
      setVersion(data);
    } catch (err) {
      setError("載入履歷版本失敗");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [versionId]);

  useEffect(() => {
    fetchVersion();
  }, [fetchVersion]);

  // 更新版本基礎資訊
  const updateVersion = useCallback(
    async (updates: Omit<ResumeVersionUpdate, "id">) => {
      if (!versionId) return null;

      try {
        const updated = await updateResumeVersion(versionId, updates);
        if (updated && version) {
          setVersion({
            ...version,
            ...updated,
          });
          return updated;
        }
        return null;
      } catch (err) {
        console.error(err);
        return null;
      }
    },
    [versionId, version]
  );

  // 添加工作到版本
  const linkJob = useCallback(
    async (jobApplicationId: string) => {
      if (!versionId) return null;

      try {
        const result = await addJobToVersion(versionId, jobApplicationId);
        if (result) {
          // 重新獲取完整數據
          await fetchVersion();
          return result;
        }
        return null;
      } catch (err) {
        console.error(err);
        return null;
      }
    },
    [versionId, fetchVersion]
  );

  // 從版本移除工作
  const unlinkJob = useCallback(
    async (jobApplicationId: string) => {
      if (!versionId) return false;

      try {
        const success = await removeJobFromVersion(versionId, jobApplicationId);
        if (success && version) {
          setVersion({
            ...version,
            version_job_resumes: version.version_job_resumes.filter(
              (vjr) => vjr.job_application_id !== jobApplicationId
            ),
            job_count: version.job_count - 1,
          });
          return true;
        }
        return false;
      } catch (err) {
        console.error(err);
        return false;
      }
    },
    [versionId, version]
  );

  // 更新客製化履歷
  const updateJobResume = useCallback(
    async (vjrId: string, updates: Omit<VersionJobResumeUpdate, "id">) => {
      try {
        const updated = await updateVersionJobResume(vjrId, updates);
        if (updated && version) {
          setVersion({
            ...version,
            version_job_resumes: version.version_job_resumes.map((vjr) =>
              vjr.id === vjrId
                ? { ...vjr, ...updated }
                : vjr
            ),
            completed_count:
              updates.generation_status === "completed"
                ? version.completed_count + 1
                : version.completed_count,
          });
          return updated;
        }
        return null;
      } catch (err) {
        console.error(err);
        return null;
      }
    },
    [version]
  );

  return {
    version,
    isLoading,
    error,
    refresh: fetchVersion,
    updateVersion,
    linkJob,
    unlinkJob,
    updateJobResume,
  };
}

// 版本內工作列表 Hook
export function useVersionJobs(versionId: string | null) {
  const [jobs, setJobs] = useState<(VersionJobResume & { job_application: JobApplication })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    if (!versionId) {
      setJobs([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await getVersionJobResumes(versionId);
      setJobs(data);
    } catch (err) {
      setError("載入工作列表失敗");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [versionId]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  return {
    jobs,
    isLoading,
    error,
    refresh: fetchJobs,
  };
}
