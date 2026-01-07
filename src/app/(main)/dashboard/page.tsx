import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Building2, Mic } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  // TODO: 從資料庫取得真實數據
  const stats = {
    totalApplications: 0,
    inProgress: 0,
    interviews: 0,
    offers: 0,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">歡迎使用 JobSmart</h1>
        <p className="text-muted-foreground">
          開始追蹤你的求職旅程
        </p>
      </div>

      {/* 統計卡片 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">總申請數</CardTitle>
            <Badge variant="secondary">{stats.totalApplications}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalApplications}</div>
            <p className="text-xs text-muted-foreground">所有追蹤中的職位</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">進行中</CardTitle>
            <Badge variant="secondary">{stats.inProgress}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgress}</div>
            <p className="text-xs text-muted-foreground">等待回覆或面試中</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">面試</CardTitle>
            <Badge variant="secondary">{stats.interviews}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.interviews}</div>
            <p className="text-xs text-muted-foreground">已安排或進行中的面試</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Offer</CardTitle>
            <Badge variant="secondary">{stats.offers}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.offers}</div>
            <p className="text-xs text-muted-foreground">已收到的 Offer</p>
          </CardContent>
        </Card>
      </div>

      {/* 快速操作 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              新增求職追蹤
            </CardTitle>
            <CardDescription>
              開始追蹤一個新的工作機會
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/applications">
                前往追蹤看板
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              管理履歷
            </CardTitle>
            <CardDescription>
              建立或編輯你的 ATS 履歷
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/resume">
                管理履歷
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5" />
              面試練習
            </CardTitle>
            <CardDescription>
              練習面試題目，獲得 AI 評分
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/interview">
                開始練習
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* 最近活動 */}
      <Card>
        <CardHeader>
          <CardTitle>最近活動</CardTitle>
          <CardDescription>你最近的求職活動記錄</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <Building2 className="h-12 w-12 mb-4" />
            <p>還沒有任何活動記錄</p>
            <p className="text-sm">開始追蹤你的第一個求職機會吧！</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
