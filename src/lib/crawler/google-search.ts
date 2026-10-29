export interface GoogleSearchResult {
  title: string;
  link: string;
  snippet: string;
  displayLink: string;
}

export interface MediumArticle {
  id: string;
  title: string;
  content: string;
  url: string;
  author: string;
  publishedAt: string;
}

// Google Custom Search API
// 需要設定環境變數:
// GOOGLE_SEARCH_API_KEY - Google API Key
// GOOGLE_SEARCH_ENGINE_ID - Custom Search Engine ID

const GOOGLE_SEARCH_API = "https://www.googleapis.com/customsearch/v1";

export function hasGoogleSearchCredentials() {
  return Boolean(
    (process.env.GOOGLE_SEARCH_API_KEY || process.env.GOOGLE_API_KEY)
    && (process.env.GOOGLE_SEARCH_ENGINE_ID || process.env.GOOGLE_CSE_ID),
  );
}

// 使用 Google Custom Search 搜尋
export async function searchGoogle(
  query: string,
  options?: {
    site?: string;
    limit?: number;
    throwOnError?: boolean;
  }
): Promise<GoogleSearchResult[]> {
  const { site, limit = 10, throwOnError = false } = options ?? {};

  const apiKey = process.env.GOOGLE_SEARCH_API_KEY || process.env.GOOGLE_API_KEY;
  const engineId = process.env.GOOGLE_SEARCH_ENGINE_ID || process.env.GOOGLE_CSE_ID;

  if (!apiKey || !engineId) {
    console.warn("Google Search API credentials not configured");
    return [];
  }

  try {
    // 構建搜尋查詢
    let searchQuery = query;
    if (site) {
      searchQuery = `site:${site} ${query}`;
    }

    const params = new URLSearchParams({
      key: apiKey,
      cx: engineId,
      q: searchQuery,
      num: String(Math.min(limit, 10)), // Google API 最多一次 10 筆
    });

    const response = await fetch(`${GOOGLE_SEARCH_API}?${params}`, { signal: AbortSignal.timeout(8000) });

    if (!response.ok) {
      console.error(`Google Search API error: ${response.status}`);
      if (throwOnError) throw new Error(`Google Custom Search 回應錯誤（HTTP ${response.status}）`);
      return [];
    }

    const data = await response.json();

    if (!data.items || !Array.isArray(data.items)) {
      return [];
    }

    return data.items.map((item: Record<string, unknown>) => ({
      title: String(item.title || ""),
      link: String(item.link || ""),
      snippet: String(item.snippet || ""),
      displayLink: String(item.displayLink || ""),
    }));
  } catch (error) {
    console.error("Google Search error:", error);
    if (throwOnError) throw error;
    return [];
  }
}

// 搜尋 Medium 文章 (公司相關)
export async function searchMediumArticles(
  companyName: string,
  options?: { limit?: number }
): Promise<MediumArticle[]> {
  const { limit = 10 } = options ?? {};

  // 構建搜尋關鍵字
  const searchQueries = [
    `"${companyName}" 面試`,
    `"${companyName}" 工作經驗`,
    `"${companyName}" review`,
    `"${companyName}" interview`,
  ];

  const allResults: GoogleSearchResult[] = [];

  // 嘗試多個查詢
  for (const query of searchQueries) {
    if (allResults.length >= limit) break;

    const results = await searchGoogle(query, {
      site: "medium.com",
      limit: Math.min(5, limit - allResults.length),
    });

    // 去重
    for (const result of results) {
      if (!allResults.find((r) => r.link === result.link)) {
        allResults.push(result);
      }
    }

    // 延遲避免 API 限制
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  // 轉換為 MediumArticle 格式
  return allResults.slice(0, limit).map((result, index) => ({
    id: `medium-${index}-${Date.now()}`,
    title: result.title,
    content: result.snippet,
    url: result.link,
    author: extractMediumAuthor(result.link),
    publishedAt: new Date().toISOString(),
  }));
}

// 從 Medium URL 提取作者
function extractMediumAuthor(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/").filter(Boolean);

    // Medium URL 格式: medium.com/@author/article-slug
    // 或: medium.com/publication/article-slug
    if (pathParts[0] && pathParts[0].startsWith("@")) {
      return pathParts[0].slice(1);
    }

    return pathParts[0] || "Medium";
  } catch {
    return "Medium";
  }
}

// 將 Google 搜尋結果轉換為標準評論格式
export function googleResultToReview(
  result: GoogleSearchResult,
  source: "medium"
): {
  id: string;
  source: "medium";
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
    id: `${source}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    source,
    sourceUrl: result.link,
    title: result.title,
    content: result.snippet,
    excerpt: result.snippet.slice(0, 200),
    sentiment: null,
    sentimentScore: null,
    author: extractMediumAuthor(result.link),
    publishedAt: new Date().toISOString(),
    scrapedAt: new Date().toISOString(),
  };
}

// 將 Medium 文章轉換為標準評論格式
export function mediumToReview(article: MediumArticle): {
  id: string;
  source: "medium";
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
    id: article.id,
    source: "medium",
    sourceUrl: article.url,
    title: article.title,
    content: article.content,
    excerpt: article.content.slice(0, 200),
    sentiment: null,
    sentimentScore: null,
    author: article.author,
    publishedAt: article.publishedAt,
    scrapedAt: new Date().toISOString(),
  };
}
