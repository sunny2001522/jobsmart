"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { VersionCard, AddVersionDialog } from "@/components/resume-version";
import { JobCategoryTabs } from "@/components/job-category-tabs";
import { useResumeVersions } from "@/hooks";
import { useJobCategoryContext } from "@/contexts/job-category-context";
import { Plus, FileText, AlertCircle } from "lucide-react";
import { toast } from "sonner";
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

export default function ResumePage() {
  const { versions, isLoading, error, removeVersion, refresh } = useResumeVersions();
  const { selectedCategoryId } = useJobCategoryContext();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [deleteVersionId, setDeleteVersionId] = useState<string | null>(null);

  // 根據選中類別過濾履歷版本
  const filteredVersions = useMemo(() => {
    if (!selectedCategoryId) return versions;
    return versions.filter((v) => v.category_id === selectedCategoryId);
  }, [versions, selectedCategoryId]);

  // 計算每個類別的版本數量
  const categoryStats = useMemo(() => {
    const stats: Record<string, number> = {};
    versions.forEach((v) => {
      if (v.category_id) {
        stats[v.category_id] = (stats[v.category_id] || 0) + 1;
      }
    });
    return stats;
  }, [versions]);

  const handleDelete = async () => {
    if (!deleteVersionId) return;

    const success = await removeVersion(deleteVersionId);
    if (success) {
      toast.success("履歷版本已刪除");
    } else {
      toast.error("刪除失敗，請稍後再試");
    }
    setDeleteVersionId(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">履歷版本</h1>
            <p className="text-muted-foreground">
              為不同類型的職位創建專屬履歷
            </p>
          </div>
          <Skeleton className="h-10 w-28" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-6 w-3/4 mb-4" />
                <Skeleton className="h-4 w-1/2 mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">履歷版本</h1>
            <p className="text-muted-foreground">
              為不同類型的職位創建專屬履歷
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-lg font-medium">載入失敗</p>
            <p className="text-sm text-muted-foreground mt-2">{error}</p>
            <Button className="mt-4" onClick={refresh}>
              重試
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">履歷版本</h1>
          <p className="text-muted-foreground">
            為不同類型的職位創建專屬履歷，並根據 JD 自動生成客製化版本
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          新增版本
        </Button>
      </div>

      {/* 職位類別 Tab */}
      <JobCategoryTabs showStats stats={categoryStats} totalCount={versions.length} />

      {filteredVersions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">開始建立你的第一個履歷版本</p>
            <p className="text-sm text-muted-foreground mt-2">
              為不同職位類型（如前端、後端、設計）創建專屬履歷版本，
              <br />
              然後將求職追蹤中的工作加入，自動生成客製化履歷
            </p>
            <Button className="mt-4" onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              新增履歷版本
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredVersions.map((version) => (
            <VersionCard
              key={version.id}
              version={version}
              onDelete={() => setDeleteVersionId(version.id)}
            />
          ))}

          {/* 新增版本卡片 */}
          <Card
            className="border-dashed cursor-pointer hover:border-primary hover:bg-muted/50 transition-colors"
            onClick={() => setIsAddDialogOpen(true)}
          >
            <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Plus className="h-10 w-10 mb-2" />
              <p className="font-medium">新增履歷版本</p>
            </CardContent>
          </Card>
        </div>
      )}

      <AddVersionDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
      />

      <AlertDialog
        open={!!deleteVersionId}
        onOpenChange={(open) => !open && setDeleteVersionId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確定要刪除這個履歷版本嗎？</AlertDialogTitle>
            <AlertDialogDescription>
              刪除後，該版本的基礎履歷和所有客製化履歷都會被刪除，此操作無法復原。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
