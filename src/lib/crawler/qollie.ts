import * as cheerio from "cheerio";
import { proxyFetch } from "./proxy-fetch";

export interface QollieReview {
  id: string;
  companyName: string;
  companySlug: string;
  title: string;
  content: string;
  rating: number | null;
  position: string | null;
  pros: string[];
  cons: string[];
  createdAt: string;
  url: string;
}

export interface QollieCompany {
  id: string;
  name: string;
  slug: string;
  url: string;
  reviewCount: number;
}

const QOLLIE_BASE = "https://www.qollie.com";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7",
};

// 搜尋 Qollie 公司
export async function searchQollieCompanies(
  companyName: string,
  options?: { limit?: number }
): Promise<QollieCompany[]> {
  const { limit = 5 } = options ?? {};

  try {
    const searchUrl = `${QOLLIE_BASE}/search?keyword=${encodeURIComponent(companyName)}`;

    const response = await proxyFetch(searchUrl, {
      headers: HEADERS,
    });

    if (!response.ok) {
      console.error(`Qollie search error: ${response.status}`);
      return [];
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const companies: QollieCompany[] = [];

    // 嘗試解析搜尋結果
    // Qollie 的公司連結通常是 /company/[slug] 格式
    $('a[href^="/company/"]').each((_, el) => {
      if (companies.length >= limit) return false;

      const $el = $(el);
      const href = $el.attr("href") || "";
      const slug = href.replace("/company/", "").split("/")[0];
      const name = $el.text().trim() || slug;

      if (slug && !companies.find((c) => c.slug === slug)) {
        companies.push({
          id: `qollie-${slug}`,
          name,
          slug,
          url: `${QOLLIE_BASE}${href}`,
          reviewCount: 0,
        });
      }
    });

    return companies;
  } catch (error) {
    console.error("Qollie search error:", error);
    return [];
  }
}

// 取得公司評論
export async function getQollieReviews(
  companySlug: string,
  options?: { limit?: number }
): Promise<QollieReview[]> {
  const { limit = 10 } = options ?? {};

  try {
    // Qollie 公司評論頁面
    const companyUrl = `${QOLLIE_BASE}/company/${companySlug}`;

    const response = await proxyFetch(companyUrl, {
      headers: HEADERS,
    });

    if (!response.ok) {
      console.error(`Qollie company page error: ${response.status}`);
      return [];
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const reviews: QollieReview[] = [];

    // 嘗試解析評論區塊
    // 根據常見的評論卡片結構進行解析
    $('[class*="review"], [class*="comment"], article').each((index, el) => {
      if (reviews.length >= limit) return false;

      const $el = $(el);
      const content = $el.find('[class*="content"], p').first().text().trim();
      const title = $el.find('[class*="title"], h3, h4').first().text().trim();
      const position = $el.find('[class*="position"], [class*="job"]').first().text().trim();

      // 嘗試取得評分
      const ratingText = $el.find('[class*="rating"], [class*="star"]').first().text();
      const rating = parseFloat(ratingText) || null;

      // 提取優缺點
      const pros: string[] = [];
      const cons: string[] = [];

      $el.find('[class*="pro"], [class*="good"]').each((_, proEl) => {
        const proText = $(proEl).text().trim();
        if (proText) pros.push(proText);
      });

      $el.find('[class*="con"], [class*="bad"]').each((_, conEl) => {
        const conText = $(conEl).text().trim();
        if (conText) cons.push(conText);
      });

      // 只添加有內容的評論
      if (content || title) {
        reviews.push({
          id: `qollie-${companySlug}-${index}`,
          companyName: companySlug,
          companySlug,
          title: title || "工作經驗分享",
          content: content || title,
          rating,
          position: position || null,
          pros,
          cons,
          createdAt: new Date().toISOString(),
          url: companyUrl,
        });
      }
    });

    return reviews;
  } catch (error) {
    console.error("Qollie reviews error:", error);
    return [];
  }
}

// 搜尋公司並取得評論
export async function searchQollie(
  companyName: string,
  options?: { limit?: number }
): Promise<QollieReview[]> {
  const { limit = 10 } = options ?? {};

  try {
    // 先搜尋公司
    const companies = await searchQollieCompanies(companyName, { limit: 3 });

    if (companies.length === 0) {
      return [];
    }

    // 取得第一個匹配公司的評論
    const reviews = await getQollieReviews(companies[0].slug, { limit });

    // 如果第一個公司沒有評論，嘗試其他公司
    if (reviews.length === 0 && companies.length > 1) {
      for (let i = 1; i < companies.length; i++) {
        const moreReviews = await getQollieReviews(companies[i].slug, { limit });
        if (moreReviews.length > 0) {
          return moreReviews;
        }
      }
    }

    return reviews;
  } catch (error) {
    console.error("Qollie search error:", error);
    return [];
  }
}

// 將 Qollie 評論轉換為標準格式
export function qollieToReview(review: QollieReview): {
  id: string;
  source: "qollie";
  sourceUrl: string;
  title: string;
  content: string;
  excerpt: string;
  sentiment: null;
  sentimentScore: null;
  author: string;
  publishedAt: string;
  scrapedAt: string;
} {
  // 整合優缺點到內容中
  let fullContent = review.content;
  if (review.pros.length > 0) {
    fullContent += `\n\n優點：${review.pros.join("、")}`;
  }
  if (review.cons.length > 0) {
    fullContent += `\n\n缺點：${review.cons.join("、")}`;
  }

  return {
    id: review.id,
    source: "qollie",
    sourceUrl: review.url,
    title: review.title,
    content: fullContent,
    excerpt: review.content.slice(0, 200),
    sentiment: null,
    sentimentScore: null,
    author: review.position || "匿名",
    publishedAt: review.createdAt,
    scrapedAt: new Date().toISOString(),
  };
}
