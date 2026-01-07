import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { crawlCompanyReviews, calculateCompanyRatings } from "@/lib/crawler";
import {
  getCachedCompanyReviews,
  setCachedCompanyReviews,
} from "@/lib/redis/client";

const reviewsSchema = z.object({
  companyName: z.string().min(1, "請提供公司名稱"),
  forceRefresh: z.boolean().optional().default(false),
  limit: z.number().min(1).max(50).optional().default(10),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyName, forceRefresh, limit } = reviewsSchema.parse(body);

    // 檢查快取
    if (!forceRefresh) {
      try {
        const cached = await getCachedCompanyReviews(companyName);
        if (cached) {
          return NextResponse.json({
            success: true,
            cached: true,
            data: cached,
          });
        }
      } catch {
        // Redis 不可用時繼續爬取
        console.warn("Redis cache unavailable, proceeding with crawl");
      }
    }

    // 爬取評論
    const reviews = await crawlCompanyReviews(companyName, {
      sources: ["dcard"],
      limit,
      analyzeSentiment: true,
    });

    // 計算評分
    const ratings = calculateCompanyRatings(reviews);

    const result = {
      companyName,
      reviews,
      ratings,
      crawledAt: new Date().toISOString(),
    };

    // 存入快取
    try {
      await setCachedCompanyReviews(companyName, result);
    } catch {
      console.warn("Failed to cache reviews");
    }

    return NextResponse.json({
      success: true,
      cached: false,
      data: result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0]?.message ?? "驗證錯誤" },
        { status: 400 }
      );
    }

    console.error("Company reviews error:", error);
    return NextResponse.json(
      { success: false, error: "取得公司評論失敗，請稍後再試" },
      { status: 500 }
    );
  }
}
