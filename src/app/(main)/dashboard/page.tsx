"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Plus,
  FileText,
  Building2,
  Mic,
  Target,
  TrendingUp,
  Calendar,
  CheckCircle,
  Clock,
  Send,
  Users,
  Award,
  ArrowRight,
  Sparkles,
  Search,
} from "lucide-react";

// 模擬數據 - 之後會從 Supabase 取得
const mockStats = {
  totalApplications: 12,
  wishlist: 3,
  applied: 5,
  interviews: 3,
  offers: 1,
  rejected: 0,
};

const mockRecentActivity = [
  { id: 1, type: "applied", company: "Google", position: "Frontend Engineer", date: "2025-01-07" },
  { id: 2, type: "interview", company: "Meta", position: "Software Engineer", date: "2025-01-06" },
  { id: 3, type: "added", company: "Apple", position: "iOS Developer", date: "2025-01-05" },
  { id: 4, type: "offer", company: "Microsoft", position: "Full Stack Developer", date: "2025-01-04" },
];

const weeklyGoals = {
  applications: { current: 5, target: 10 },
  interviews: { current: 2, target: 3 },
  practice: { current: 3, target: 5 },
};

export default function DashboardPage() {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case "applied":
        return <Send className="h-4 w-4 text-blue-500" />;
      case "interview":
        return <Users className="h-4 w-4 text-purple-500" />;
      case "offer":
        return <Award className="h-4 w-4 text-green-500" />;
      default:
        return <Plus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActivityText = (type: string) => {
    switch (type) {
      case "applied":
        return "投遞了";
      case "interview":
        return "安排了面試";
      case "offer":
        return "收到 Offer";
      default:
        return "新增追蹤";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">歡迎使用 JobSmart</h1>
          <p className="text-muted-foreground">追蹤你的求職旅程，讓求職更有效率</p>
        </div>
        <Button asChild>
          <Link href="/applications">
            <Plus className="h-4 w-4 mr-2" />
            新增追蹤
          </Link>
        </Button>
      </div>

      {/* 統計卡片 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">總追蹤數</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.totalApplications}</div>
            <p className="text-xs text-muted-foreground">
              {mockStats.wishlist} 想投 · {mockStats.applied} 已投
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">面試中</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.interviews}</div>
            <p className="text-xs text-muted-foreground">
              等待或進行中的面試
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">收到 Offer</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{mockStats.offers}</div>
            <p className="text-xs text-muted-foreground">
              口頭或書面 Offer
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">回覆率</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mockStats.applied > 0
                ? Math.round(((mockStats.interviews + mockStats.offers) / mockStats.applied) * 100)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              面試/申請比例
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 每週目標 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              本週目標
            </CardTitle>
            <CardDescription>追蹤你的每週求職進度</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>投遞申請</span>
                <span className="text-muted-foreground">
                  {weeklyGoals.applications.current} / {weeklyGoals.applications.target}
                </span>
              </div>
              <Progress
                value={(weeklyGoals.applications.current / weeklyGoals.applications.target) * 100}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>面試場次</span>
                <span className="text-muted-foreground">
                  {weeklyGoals.interviews.current} / {weeklyGoals.interviews.target}
                </span>
              </div>
              <Progress
                value={(weeklyGoals.interviews.current / weeklyGoals.interviews.target) * 100}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>面試練習</span>
                <span className="text-muted-foreground">
                  {weeklyGoals.practice.current} / {weeklyGoals.practice.target}
                </span>
              </div>
              <Progress
                value={(weeklyGoals.practice.current / weeklyGoals.practice.target) * 100}
              />
            </div>
          </CardContent>
        </Card>

        {/* 最近活動 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              最近活動
            </CardTitle>
            <CardDescription>你最近的求職記錄</CardDescription>
          </CardHeader>
          <CardContent>
            {mockRecentActivity.length > 0 ? (
              <div className="space-y-4">
                {mockRecentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {getActivityText(activity.type)} {activity.company}
                      </p>
                      <p className="text-xs text-muted-foreground">{activity.position}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{activity.date}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
                <Calendar className="h-8 w-8 mb-2" />
                <p className="text-sm">還沒有任何活動</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 快速操作 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <Link href="/applications">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                  <Target className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <h3 className="font-medium">求職追蹤</h3>
              <p className="text-sm text-muted-foreground">管理你的求職進度</p>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <Link href="/resume">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600">
                  <FileText className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <h3 className="font-medium">履歷編輯</h3>
              <p className="text-sm text-muted-foreground">建立 ATS 友善履歷</p>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <Link href="/jd-analyzer">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                  <Search className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <h3 className="font-medium">JD 分析</h3>
              <p className="text-sm text-muted-foreground">分析職缺關鍵字</p>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <Link href="/interview">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                  <Mic className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <h3 className="font-medium">面試練習</h3>
              <p className="text-sm text-muted-foreground">AI 評分與建議</p>
            </CardContent>
          </Link>
        </Card>
      </div>

      {/* AI 功能提示 */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="flex items-center justify-between p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">AI 助手功能</h3>
              <p className="text-sm text-muted-foreground">
                使用 AI 優化履歷、分析 JD、練習面試
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/linkedin">LinkedIn 生成</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/jd-analyzer">開始分析</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
