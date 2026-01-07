import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Kanban,
  Building2,
  Mic,
  Linkedin,
  Heart,
  Sparkles,
  ArrowRight,
} from "lucide-react";

const features = [
  {
    icon: Kanban,
    title: "求職追蹤看板",
    description: "Kanban 風格的追蹤系統，從想投到收到 Offer 一目了然",
  },
  {
    icon: FileText,
    title: "AI 履歷優化",
    description: "根據 JD 關鍵字自動優化履歷，生成 ATS 友善格式",
  },
  {
    icon: Building2,
    title: "公司評價爬蟲",
    description: "自動爬取 Dcard、職場天眼通等平台的公司評論",
  },
  {
    icon: Mic,
    title: "面試練習",
    description: "錄音練習面試，AI 即時評分並給出改進建議",
  },
  {
    icon: Linkedin,
    title: "LinkedIn 生成",
    description: "統計熱門技能關鍵字，生成專業的 LinkedIn 經歷描述",
  },
  {
    icon: Heart,
    title: "價值觀探索",
    description: "透過卡牌排序，了解自己最重視的工作價值",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
              J
            </div>
            <span className="font-semibold text-lg">JobSmart</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="/login">登入</Link>
            </Button>
            <Button asChild>
              <Link href="/register">免費註冊</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-24 text-center">
        <Badge className="mb-4" variant="secondary">
          <Sparkles className="h-3 w-3 mr-1" />
          AI 驅動的求職助手
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          讓求職變得更聰明
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          從履歷優化到面試準備，JobSmart 幫助你在求職路上更有效率。
          追蹤申請進度、分析公司評價、AI 練習面試，一站搞定。
        </p>
        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Button size="lg" asChild>
            <Link href="/register">
              免費開始使用
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/login">已有帳號？登入</Link>
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold">功能特色</h2>
          <p className="mt-4 text-muted-foreground">
            全方位的求職輔助工具
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title}>
              <CardHeader>
                <feature.icon className="h-10 w-10 text-primary mb-2" />
                <CardTitle>{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t bg-muted/50">
        <div className="container mx-auto px-4 py-24 text-center">
          <h2 className="text-3xl font-bold">準備好開始了嗎？</h2>
          <p className="mt-4 text-muted-foreground">
            免費註冊，立即開始使用 JobSmart
          </p>
          <Button size="lg" className="mt-8" asChild>
            <Link href="/register">
              免費開始使用
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2024 JobSmart. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
