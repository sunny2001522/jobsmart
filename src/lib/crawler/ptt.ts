import * as cheerio from "cheerio";
import { proxyFetch } from "./proxy-fetch";

export interface PTTPost {
  id: string;
  title: string;
  content: string;
  author: string;
  board: string;
  pushCount: number;
  createdAt: string;
  url: string;
}

const PTT_BASE = "https://www.ptt.cc";

// PTT 需要 over18 cookie 來存取某些看板
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7",
  Cookie: "over18=1",
};

// PTT with Taiwan geo-targeting needs longer timeout
const PTT_TIMEOUT = 25000;

// 預設搜尋的看板
const DEFAULT_BOARDS = ["Salary", "Tech_Job", "Soft_Job"];

// 搜尋 PTT 貼文
export async function searchPTT(
  companyName: string,
  options?: {
    boards?: string[];
    limit?: number;
  }
): Promise<PTTPost[]> {
  const { boards = DEFAULT_BOARDS, limit = 10 } = options ?? {};

  const allPosts: PTTPost[] = [];

  // 依序搜尋各看板
  for (const board of boards) {
    if (allPosts.length >= limit) break;

    try {
      const posts = await searchPTTBoard(companyName, board, {
        limit: limit - allPosts.length,
      });
      allPosts.push(...posts);
    } catch (error) {
      console.error(`PTT search error for board ${board}:`, error);
    }

    // 添加延遲避免被封鎖
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return allPosts.slice(0, limit);
}

// 搜尋特定看板
async function searchPTTBoard(
  keyword: string,
  board: string,
  options?: { limit?: number }
): Promise<PTTPost[]> {
  const { limit = 10 } = options ?? {};

  try {
    // PTT 搜尋 URL (使用 Google site search 作為備案)
    // 直接使用看板頁面並過濾
    const boardUrl = `${PTT_BASE}/bbs/${board}/index.html`;

    const response = await proxyFetch(boardUrl, {
      headers: HEADERS,
      countryCode: "tw", // Use Taiwan IP for PTT
      timeout: PTT_TIMEOUT,
    });

    if (!response.ok) {
      console.error(`PTT board fetch error: ${response.status}`);
      return [];
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const posts: PTTPost[] = [];
    const keywordLower = keyword.toLowerCase();

    // 解析貼文列表
    $(".r-ent").each((_, el) => {
      if (posts.length >= limit) return false;

      const $el = $(el);
      const title = $el.find(".title a").text().trim();
      const href = $el.find(".title a").attr("href");
      const author = $el.find(".author").text().trim();
      const pushText = $el.find(".nrec").text().trim();
      const date = $el.find(".date").text().trim();

      // 檢查標題是否包含關鍵字
      if (title.toLowerCase().includes(keywordLower) && href) {
        const pushCount = parsePushCount(pushText);
        const articleId = extractArticleId(href);

        posts.push({
          id: `ptt-${board}-${articleId}`,
          title,
          content: "", // 需要另外取得
          author,
          board,
          pushCount,
          createdAt: parseDate(date),
          url: `${PTT_BASE}${href}`,
        });
      }
    });

    // 如果直接搜尋沒有結果，嘗試瀏覽多頁
    if (posts.length === 0) {
      const morePages = await searchPTTMultiplePages(keyword, board, { limit, pages: 3 });
      return morePages;
    }

    return posts;
  } catch (error) {
    console.error(`PTT board search error for ${board}:`, error);
    return [];
  }
}

// 搜尋多頁
async function searchPTTMultiplePages(
  keyword: string,
  board: string,
  options?: { limit?: number; pages?: number }
): Promise<PTTPost[]> {
  const { limit = 10, pages = 3 } = options ?? {};
  const posts: PTTPost[] = [];

  try {
    // 先取得最新頁碼
    const indexUrl = `${PTT_BASE}/bbs/${board}/index.html`;
    const indexResponse = await proxyFetch(indexUrl, {
      headers: HEADERS,
      countryCode: "tw",
      timeout: PTT_TIMEOUT,
    });

    if (!indexResponse.ok) return [];

    const indexHtml = await indexResponse.text();
    const $ = cheerio.load(indexHtml);

    // 找到上一頁連結以取得頁碼
    const prevLink = $(".btn-group-paging a:contains('上頁')").attr("href");
    const currentPage = prevLink
      ? parseInt(prevLink.match(/index(\d+)\.html/)?.[1] || "0") + 1
      : 1;

    const keywordLower = keyword.toLowerCase();

    // 搜尋多頁
    for (let page = currentPage; page > currentPage - pages && page > 0; page--) {
      if (posts.length >= limit) break;

      const pageUrl = `${PTT_BASE}/bbs/${board}/index${page}.html`;
      const pageResponse = await proxyFetch(pageUrl, {
        headers: HEADERS,
        countryCode: "tw",
        timeout: PTT_TIMEOUT,
      });

      if (!pageResponse.ok) continue;

      const pageHtml = await pageResponse.text();
      const $page = cheerio.load(pageHtml);

      $page(".r-ent").each((_, el) => {
        if (posts.length >= limit) return false;

        const $el = $page(el);
        const title = $el.find(".title a").text().trim();
        const href = $el.find(".title a").attr("href");
        const author = $el.find(".author").text().trim();
        const pushText = $el.find(".nrec").text().trim();
        const date = $el.find(".date").text().trim();

        if (title.toLowerCase().includes(keywordLower) && href) {
          const pushCount = parsePushCount(pushText);
          const articleId = extractArticleId(href);

          posts.push({
            id: `ptt-${board}-${articleId}`,
            title,
            content: "",
            author,
            board,
            pushCount,
            createdAt: parseDate(date),
            url: `${PTT_BASE}${href}`,
          });
        }
      });

      // 延遲避免被封鎖
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  } catch (error) {
    console.error("PTT multi-page search error:", error);
  }

  return posts;
}

// 取得貼文內容
export async function getPTTPostContent(url: string): Promise<string> {
  try {
    const response = await proxyFetch(url, {
      headers: HEADERS,
      countryCode: "tw",
      timeout: PTT_TIMEOUT,
    });

    if (!response.ok) return "";

    const html = await response.text();
    const $ = cheerio.load(html);

    // PTT 的內容在 #main-content 中
    const $content = $("#main-content");

    // 移除 meta 資訊和推文
    $content.find(".article-metaline, .article-metaline-right, .push").remove();

    // 取得純文字內容
    const content = $content.text().trim();

    // 清理內容 (移除過多的空白行)
    return content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line)
      .join("\n");
  } catch (error) {
    console.error("PTT post content error:", error);
    return "";
  }
}

// 搜尋並取得完整內容
export async function searchPTTWithContent(
  companyName: string,
  options?: {
    boards?: string[];
    limit?: number;
    fetchContent?: boolean;
  }
): Promise<PTTPost[]> {
  const { fetchContent = true, ...searchOptions } = options ?? {};

  const posts = await searchPTT(companyName, searchOptions);

  if (!fetchContent) return posts;

  // 取得每篇貼文的內容
  const postsWithContent = await Promise.all(
    posts.map(async (post, index) => {
      // 添加延遲避免被封鎖
      await new Promise((resolve) => setTimeout(resolve, index * 300));

      const content = await getPTTPostContent(post.url);
      return { ...post, content };
    })
  );

  return postsWithContent;
}

// 將 PTT 貼文轉換為標準格式
export function pttToReview(post: PTTPost): {
  id: string;
  source: "ptt";
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
  return {
    id: post.id,
    source: "ptt",
    sourceUrl: post.url,
    title: post.title,
    content: post.content,
    excerpt: post.content.slice(0, 200) || post.title,
    sentiment: null,
    sentimentScore: null,
    author: post.author,
    publishedAt: post.createdAt,
    scrapedAt: new Date().toISOString(),
  };
}

// 輔助函數：解析推文數
function parsePushCount(text: string): number {
  if (!text) return 0;
  if (text === "爆") return 100;
  if (text.startsWith("X")) return -parseInt(text.slice(1)) || 0;
  return parseInt(text) || 0;
}

// 輔助函數：從 href 提取文章 ID
function extractArticleId(href: string): string {
  const match = href.match(/\/([^/]+)\.html$/);
  return match ? match[1] : "";
}

// 輔助函數：解析日期
function parseDate(dateStr: string): string {
  // PTT 日期格式: "1/15" 或 "12/31"
  const now = new Date();
  const [month, day] = dateStr.split("/").map(Number);

  if (!month || !day) return now.toISOString();

  const date = new Date(now.getFullYear(), month - 1, day);

  // 如果日期在未來，表示是去年的
  if (date > now) {
    date.setFullYear(date.getFullYear() - 1);
  }

  return date.toISOString();
}
