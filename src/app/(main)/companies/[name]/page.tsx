"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  RefreshCw,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Loader2,
  MessageSquare,
} from "lucide-react";

interface CompanyReview {
  id: string;
  source: string;
  sourceUrl: string;
  title: string;
  content: string;
  excerpt: string;
  sentiment: "positive" | "neutral" | "negative" | null;
  sentimentScore: number | null;
  author: string;
  publishedAt: string;
}

interface CompanyData {
  companyName: string;
  reviews: CompanyReview[];
  ratings: {
    avgSentiment: number;
    positiveCount: number;
    neutralCount: number;
    negativeCount: number;
    totalCount: number;
  };
  crawledAt: string;
}

interface CompanyDetailPageProps {
  params: Promise<{ name: string }>;
}

export default function CompanyDetailPage({ params }: CompanyDetailPageProps) {
  const { name } = use(params);
  const companyName = decodeURIComponent(name);
  const router = useRouter();

  const [data, setData] = useState<CompanyData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCached, setIsCached] = useState(false);

  const fetchReviews = async (forceRefresh = false) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/companies/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          forceRefresh,
          limit: 20,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error);
      }

      setData(result.data);
      setIsCached(result.cached);
    } catch (err) {
      setError(err instanceof Error ? err.message : "載入失敗");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [companyName]);

  const getSentimentIcon = (sentiment: string | null) => {
    switch (sentiment) {
      case "positive":
        return <ThumbsUp className="h-4 w-4 text-green-500" />;
      case "negative":
        return <ThumbsDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSentimentColor = (score: number) => {
    if (score >= 70) return "text-green-500";
    if (score >= 40) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push("/companies")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{companyName}</h1>
            <p className="text-muted-foreground">
              {isCached && data && (
                <span className="text-xs">
                  快取資料 · 更新於 {new Date(data.crawledAt).toLocaleDateString("zh-TW")}
                </span>
              )}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => fetchReviews(true)}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          重新爬取
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">正在搜尋 {companyName} 的評論...</p>
            <p className="text-xs text-muted-foreground mt-2">
              這可能需要幾秒鐘，我們正在從 Dcard 收集資料
            </p>
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={() => fetchReviews()}>重試</Button>
          </CardContent>
        </Card>
      ) : data ? (
        <>
          {/* 評分概覽 */}
          <Card>
            <CardHeader>
              <CardTitle>評論分析</CardTitle>
              <CardDescription>
                共 {data.ratings.totalCount} 則評論
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                {/* 情緒分數 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">整體評價</span>
                    <span className={`text-2xl font-bold ${getSentimentColor(data.ratings.avgSentiment)}`}>
                      {data.ratings.avgSentiment}
                    </span>
                  </div>
                  <Progress value={data.ratings.avgSentiment} />
                  <p className="text-xs text-muted-foreground">
                    {data.ratings.avgSentiment >= 70
                      ? "大多數評論為正面"
                      : data.ratings.avgSentiment >= 40
                      ? "評價褒貶不一"
                      : "需要注意負面評論"}
                  </p>
                </div>

                {/* 評論分佈 */}
                <div className="space-y-2">
                  <span className="text-sm font-medium">評論分佈</span>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <ThumbsUp className="h-4 w-4 text-green-500" />
                      <span className="text-sm">{data.ratings.positiveCount} 正面</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Minus className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{data.ratings.neutralCount} 中性</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ThumbsDown className="h-4 w-4 text-red-500" />
                      <span className="text-sm">{data.ratings.negativeCount} 負面</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 評論列表 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                評論列表
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.reviews.length > 0 ? (
                <div className="space-y-4">
                  {data.reviews.map((review) => (
                    <div
                      key={review.id}
                      className="border rounded-lg p-4 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {getSentimentIcon(review.sentiment)}
                            <h4 className="font-medium line-clamp-1">
                              {review.title}
                            </h4>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {review.author} ·{" "}
                            {new Date(review.publishedAt).toLocaleDateString("zh-TW")}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {review.source}
                          </Badge>
                          <a
                            href={review.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {review.excerpt}
                      </p>
                      {review.sentimentScore !== null && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            情緒分數:
                          </span>
                          <span
                            className={`text-xs font-medium ${getSentimentColor(
                              review.sentimentScore
                            )}`}
                          >
                            {review.sentimentScore}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mb-4" />
                  <p>找不到 {companyName} 的相關評論</p>
                  <p className="text-sm mt-1">
                    試試其他公司名稱或等待更多資料
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
