import * as cheerio from "cheerio";
import { proxyFetch } from "./proxy-fetch";

export interface DcardPost {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  url: string;
  author: string;
  createdAt: string;
  likeCount: number;
  commentCount: number;
}

// Dcard API 端點
const DCARD_API_BASE = "https://www.dcard.tw/_api";

// 搜尋 Dcard 工作版貼文
export async function searchDcardPosts(
  companyName: string,
  options?: {
    limit?: number;
    forum?: string;
  }
): Promise<DcardPost[]> {
  const { limit = 10, forum = "job" } = options ?? {};

  try {
    // Dcard 搜尋 API
    const searchUrl = `${DCARD_API_BASE}/search/posts?query=${encodeURIComponent(
      companyName
    )}&forum=${forum}&limit=${limit}`;

    const response = await proxyFetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Dcard API error: ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      return [];
    }

    return data.map((post: Record<string, unknown>) => ({
      id: String(post.id || ""),
      title: String(post.title || ""),
      content: String(post.content || ""),
      excerpt: String(post.excerpt || ""),
      url: `https://www.dcard.tw/f/${forum}/p/${post.id}`,
      author: post.withNickname ? String(post.school || "匿名") : "匿名",
      createdAt: String(post.createdAt || ""),
      likeCount: Number(post.likeCount) || 0,
      commentCount: Number(post.commentCount) || 0,
    }));
  } catch (error) {
    console.error("Dcard search error:", error);
    return [];
  }
}

// 取得單篇 Dcard 貼文詳情
export async function getDcardPostDetail(postId: string): Promise<DcardPost | null> {
  try {
    const postUrl = `${DCARD_API_BASE}/posts/${postId}`;

    const response = await proxyFetch(postUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return null;
    }

    const post = await response.json();

    return {
      id: String(post.id || ""),
      title: String(post.title || ""),
      content: String(post.content || ""),
      excerpt: String(post.excerpt || ""),
      url: `https://www.dcard.tw/f/${post.forumAlias}/p/${post.id}`,
      author: post.withNickname ? String(post.school || "匿名") : "匿名",
      createdAt: String(post.createdAt || ""),
      likeCount: Number(post.likeCount) || 0,
      commentCount: Number(post.commentCount) || 0,
    };
  } catch (error) {
    console.error("Dcard post detail error:", error);
    return null;
  }
}

// 從網頁爬取 (備用方案)
export async function scrapeDcardPage(url: string): Promise<{
  title: string;
  content: string;
} | null> {
  try {
    const response = await proxyFetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Dcard 的內容通常在 article 或特定 class 中
    const title = $("h1").first().text().trim();
    const content = $("article").text().trim() || $(".post-content").text().trim();

    return { title, content };
  } catch (error) {
    console.error("Dcard scrape error:", error);
    return null;
  }
}
