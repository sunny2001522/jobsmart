/**
 * Proxy-enabled fetch wrapper using ScraperAPI
 *
 * Features:
 * - Automatic proxy routing when SCRAPER_API_KEY is set
 * - Configurable timeout (default 8s for Vercel compatibility)
 * - Retry logic with exponential backoff
 * - Graceful fallback to direct fetch when proxy not configured
 */

const SCRAPER_API_BASE = "https://api.scraperapi.com";

export type CrawlerErrorCode =
  | "TIMEOUT"
  | "NETWORK_ERROR"
  | "HTTP_ERROR"
  | "ACCESS_DENIED"
  | "RATE_LIMITED"
  | "NOT_CONFIGURED"
  | "UNKNOWN";

export class CrawlerError extends Error {
  constructor(
    message: string,
    public readonly code: CrawlerErrorCode,
    public readonly httpStatus?: number,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = "CrawlerError";
  }
}

export interface ProxyFetchOptions extends Omit<RequestInit, "signal"> {
  // Skip proxy and use direct fetch
  bypassProxy?: boolean;
  // Country code for geo-targeting (e.g., 'tw' for Taiwan)
  countryCode?: string;
  // Request timeout in milliseconds (default: 20000 for proxy, 8000 for direct)
  timeout?: number;
  // Number of retries on failure (default: 2)
  retries?: number;
}

/**
 * Fetch with optional ScraperAPI proxy, timeout, and retry support
 */
export async function proxyFetch(
  url: string,
  options: ProxyFetchOptions = {}
): Promise<Response> {
  const {
    bypassProxy = false,
    countryCode,
    timeout,
    retries = 2,
    ...fetchOptions
  } = options;

  const apiKey = process.env.SCRAPER_API_KEY;

  // Decide whether to use proxy
  const shouldUseProxy = !bypassProxy && !!apiKey;

  // Use longer timeout for proxy requests (ScraperAPI can be slower)
  const effectiveTimeout = timeout ?? (shouldUseProxy ? 20000 : 8000);

  if (!shouldUseProxy) {
    if (!bypassProxy && !apiKey) {
      console.warn(
        "SCRAPER_API_KEY not configured, using direct fetch (may fail on Vercel)"
      );
    }
    return fetchWithRetry(url, fetchOptions, { timeout: effectiveTimeout, retries });
  }

  // Build ScraperAPI URL
  const params = new URLSearchParams({
    api_key: apiKey,
    url: url,
  });

  if (countryCode) {
    params.set("country_code", countryCode);
  }

  const proxyUrl = `${SCRAPER_API_BASE}?${params.toString()}`;

  // ScraperAPI handles most anti-bot measures
  // We only need to pass through the essential options
  const proxyOptions: RequestInit = {
    method: fetchOptions.method || "GET",
    body: fetchOptions.body,
  };

  return fetchWithRetry(proxyUrl, proxyOptions, {
    timeout: effectiveTimeout,
    retries,
    isProxy: true,
  });
}

interface RetryOptions {
  timeout: number;
  retries: number;
  isProxy?: boolean;
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  { timeout, retries, isProxy = false }: RetryOptions
): Promise<Response> {
  let lastError: CrawlerError | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Check for retryable HTTP errors
      if (!response.ok) {
        const isRetryable = [408, 429, 500, 502, 503, 504].includes(
          response.status
        );

        if (isRetryable && attempt < retries) {
          await delay(getBackoffDelay(attempt));
          continue;
        }

        // Non-retryable or last attempt
        throw createHttpError(response.status);
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof CrawlerError) {
        lastError = error;
      } else if (error instanceof Error) {
        lastError = classifyError(error);
      } else {
        lastError = new CrawlerError("Unknown error", "UNKNOWN");
      }

      // Check if we should retry
      const shouldRetry = lastError.retryable && attempt < retries;

      if (shouldRetry) {
        await delay(getBackoffDelay(attempt));
        continue;
      }

      break;
    }
  }

  throw lastError || new CrawlerError("Request failed", "UNKNOWN");
}

function createHttpError(status: number): CrawlerError {
  if (status === 403) {
    return new CrawlerError(
      `Access denied (${status})`,
      "ACCESS_DENIED",
      status,
      false
    );
  }
  if (status === 429) {
    return new CrawlerError(
      `Rate limited (${status})`,
      "RATE_LIMITED",
      status,
      true
    );
  }
  return new CrawlerError(
    `HTTP error (${status})`,
    "HTTP_ERROR",
    status,
    status >= 500
  );
}

function classifyError(error: Error): CrawlerError {
  // AbortError means timeout
  if (error.name === "AbortError") {
    return new CrawlerError("Request timeout", "TIMEOUT", undefined, true);
  }

  // Network errors (Node.js error codes)
  const nodeError = error as NodeJS.ErrnoException;
  if (
    nodeError.code === "ECONNRESET" ||
    nodeError.code === "ECONNREFUSED" ||
    nodeError.code === "ETIMEDOUT" ||
    nodeError.code === "ENOTFOUND"
  ) {
    return new CrawlerError(
      `Network error: ${nodeError.code}`,
      "NETWORK_ERROR",
      undefined,
      true
    );
  }

  // Check if it's a fetch TypeError (usually network related)
  if (error.name === "TypeError" && error.message.includes("fetch")) {
    return new CrawlerError(
      `Network error: ${error.message}`,
      "NETWORK_ERROR",
      undefined,
      true
    );
  }

  return new CrawlerError(error.message, "UNKNOWN", undefined, false);
}

function getBackoffDelay(attempt: number): number {
  // Exponential backoff: 500ms, 1000ms, 2000ms...
  const baseDelay = 500;
  const maxDelay = 4000;
  return Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if proxy is configured
 */
export function isProxyConfigured(): boolean {
  return !!process.env.SCRAPER_API_KEY;
}
