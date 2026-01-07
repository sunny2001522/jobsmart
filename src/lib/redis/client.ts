import { Redis } from "@upstash/redis";

// Upstash Redis 客戶端
let redis: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      throw new Error("Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN");
    }

    redis = new Redis({ url, token });
  }

  return redis;
}

// 快取 Key 前綴
const CACHE_PREFIX = {
  COMPANY_REVIEWS: "company:reviews:",
  COMPANY_INFO: "company:info:",
  JD_ANALYSIS: "jd:analysis:",
};

// 快取 TTL (秒)
const CACHE_TTL = {
  COMPANY_REVIEWS: 7 * 24 * 60 * 60, // 7 天
  COMPANY_INFO: 24 * 60 * 60,        // 1 天
  JD_ANALYSIS: 60 * 60,               // 1 小時
};

// 公司評論快取
export async function getCachedCompanyReviews(companyName: string): Promise<unknown | null> {
  try {
    const redis = getRedisClient();
    const key = `${CACHE_PREFIX.COMPANY_REVIEWS}${companyName.toLowerCase()}`;
    return await redis.get(key);
  } catch (error) {
    console.error("Redis get error:", error);
    return null;
  }
}

export async function setCachedCompanyReviews(
  companyName: string,
  data: unknown
): Promise<void> {
  try {
    const redis = getRedisClient();
    const key = `${CACHE_PREFIX.COMPANY_REVIEWS}${companyName.toLowerCase()}`;
    await redis.set(key, data, { ex: CACHE_TTL.COMPANY_REVIEWS });
  } catch (error) {
    console.error("Redis set error:", error);
  }
}

// 公司資訊快取
export async function getCachedCompanyInfo(companyName: string): Promise<unknown | null> {
  try {
    const redis = getRedisClient();
    const key = `${CACHE_PREFIX.COMPANY_INFO}${companyName.toLowerCase()}`;
    return await redis.get(key);
  } catch (error) {
    console.error("Redis get error:", error);
    return null;
  }
}

export async function setCachedCompanyInfo(
  companyName: string,
  data: unknown
): Promise<void> {
  try {
    const redis = getRedisClient();
    const key = `${CACHE_PREFIX.COMPANY_INFO}${companyName.toLowerCase()}`;
    await redis.set(key, data, { ex: CACHE_TTL.COMPANY_INFO });
  } catch (error) {
    console.error("Redis set error:", error);
  }
}

// JD 分析快取
export async function getCachedJDAnalysis(jdHash: string): Promise<unknown | null> {
  try {
    const redis = getRedisClient();
    const key = `${CACHE_PREFIX.JD_ANALYSIS}${jdHash}`;
    return await redis.get(key);
  } catch (error) {
    console.error("Redis get error:", error);
    return null;
  }
}

export async function setCachedJDAnalysis(
  jdHash: string,
  data: unknown
): Promise<void> {
  try {
    const redis = getRedisClient();
    const key = `${CACHE_PREFIX.JD_ANALYSIS}${jdHash}`;
    await redis.set(key, data, { ex: CACHE_TTL.JD_ANALYSIS });
  } catch (error) {
    console.error("Redis set error:", error);
  }
}

// 檢查快取是否存在
export async function hasCachedData(key: string): Promise<boolean> {
  try {
    const redis = getRedisClient();
    const exists = await redis.exists(key);
    return exists === 1;
  } catch (error) {
    console.error("Redis exists error:", error);
    return false;
  }
}

// 刪除快取
export async function deleteCachedData(key: string): Promise<void> {
  try {
    const redis = getRedisClient();
    await redis.del(key);
  } catch (error) {
    console.error("Redis delete error:", error);
  }
}
