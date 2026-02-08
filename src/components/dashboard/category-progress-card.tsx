"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, FolderKanban } from "lucide-react";
import { useCategoryStats } from "@/hooks";

export function CategoryProgressCard() {
  const { stats, totals, isLoading, error } = useCategoryStats();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            各類別進度
          </CardTitle>
          <CardDescription>按職位類別查看求職進度分布</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-3 w-48" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || stats.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            各類別進度
          </CardTitle>
          <CardDescription>按職位類別查看求職進度分布</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
            <FolderKanban className="h-8 w-8 mb-2" />
            <p className="text-sm">還沒有建立職位類別</p>
            <p className="text-xs mt-1">
              在求職追蹤頁面建立類別來分組管理職位
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          各類別進度
        </CardTitle>
        <CardDescription>
          按職位類別查看求職進度分布（共 {totals.total} 個職位）
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stats.map((stat) => {
            // 計算進度百分比（面試 + Offer 佔總數）
            const progressPercentage =
              stat.total > 0
                ? ((stat.interviews + stat.offers) / stat.total) * 100
                : 0;

            return (
              <div key={stat.category_id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: stat.category_color }}
                    />
                    <span className="font-medium text-sm">{stat.category_name}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {stat.total} 個
                  </span>
                </div>

                <Progress value={progressPercentage} className="h-2" />

                <div className="flex gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-gray-400" />
                    想投 {stat.wishlist}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                    已投 {stat.applied}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-purple-500" />
                    面試 {stat.interviews}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-green-500" />
                    Offer {stat.offers}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
