"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { CategoryProgressCard } from "@/components/dashboard/category-progress-card";
import {
  Plus,
  FileText,
  Mic,
  Target,
  TrendingUp,
  Calendar,
  Clock,
  Send,
  Users,
  Award,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useDashboard } from "@/hooks/use-dashboard";
import { useI18n } from "@/contexts/i18n-context";

export default function DashboardPage() {
  const { stats, recentActivity, weeklyGoals, responseRate, isLoading } = useDashboard();
  const { locale, t } = useI18n();

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
        return t("dashboard.activity.applied");
      case "interview":
        return t("dashboard.activity.interview");
      case "offer":
        return t("dashboard.activity.offer");
      default:
        return t("dashboard.activity.new");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(locale, {
      month: "2-digit",
      day: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("dashboard.welcome")}</h1>
          <p className="text-muted-foreground">{t("dashboard.subtitle")}</p>
        </div>
        <Button asChild>
          <Link href="/applications">
            <Plus className="h-4 w-4 mr-2" />
            {t("dashboard.addTracking")}
          </Link>
        </Button>
      </div>

      {/* 統計卡片 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("dashboard.totalTracked")}</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.totalApplications}</div>
                <p className="text-xs text-muted-foreground">
                  {t("dashboard.wishlistApplied", { wishlist: stats.wishlist, applied: stats.applied })}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("dashboard.interviewing")}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.interviews}</div>
                <p className="text-xs text-muted-foreground">
                  {t("dashboard.activeInterviews")}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("dashboard.offers")}</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold text-green-600">{stats.offers}</div>
                <p className="text-xs text-muted-foreground">
                  {t("dashboard.offerTypes")}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("dashboard.responseRate")}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{responseRate}%</div>
                <p className="text-xs text-muted-foreground">
                  {t("dashboard.interviewApplicationRatio")}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 類別進度統計 */}
      <CategoryProgressCard />

      <div className="grid gap-6 md:grid-cols-2">
        {/* 每週目標 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              {t("dashboard.weeklyGoal")}
            </CardTitle>
            <CardDescription>{t("dashboard.weeklyGoalDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>{t("dashboard.applications")}</span>
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
                <span>{t("dashboard.interviewSessions")}</span>
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
                <span>{t("dashboard.interviewPractice")}</span>
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
              {t("dashboard.recentActivity")}
            </CardTitle>
          <CardDescription>{t("dashboard.recentActivityDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32 mb-1" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-3 w-12" />
                  </div>
                ))}
              </div>
            ) : recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.map((activity) => (
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
                    <span className="text-xs text-muted-foreground">{formatDate(activity.date)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
                <Calendar className="h-8 w-8 mb-2" />
                <p className="text-sm">{t("dashboard.noActivity")}</p>
                <p className="text-xs mt-1">{t("dashboard.startTracking")}</p>
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
              <h3 className="font-medium">{t("dashboard.jobTracking")}</h3>
              <p className="text-sm text-muted-foreground">{t("dashboard.manageProgress")}</p>
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
              <h3 className="font-medium">{t("dashboard.resumeEditing")}</h3>
              <p className="text-sm text-muted-foreground">{t("dashboard.atsResume")}</p>
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
              <h3 className="font-medium">{t("dashboard.practiceInterview")}</h3>
              <p className="text-sm text-muted-foreground">{t("dashboard.aiFeedback")}</p>
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
              <h3 className="font-semibold">{t("dashboard.aiAssistant")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("dashboard.aiAssistantDescription")}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" asChild>
              <Link href="/interview">{t("dashboard.practiceInterview")}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
