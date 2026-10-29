export type InterviewLocale = "en" | "zh-TW";
export type InterviewQuestionCategory =
  | "behavioral"
  | "technical"
  | "situational"
  | "self_introduction"
  | "other";

export interface LocalizedDefaultQuestion {
  id: string;
  question: string;
  category: InterviewQuestionCategory;
  difficulty: "easy" | "medium" | "hard";
  isBookmarked: false;
}

const DEFAULT_QUESTION_COPY: Array<{
  id: string;
  zh: string;
  en: string;
  category: InterviewQuestionCategory;
  difficulty: "easy" | "medium" | "hard";
}> = [
  { id: "1", zh: "請簡單自我介紹", en: "Tell me about yourself.", category: "self_introduction", difficulty: "easy" },
  { id: "2", zh: "為什麼想加入我們公司？", en: "Why do you want to join our company?", category: "behavioral", difficulty: "easy" },
  { id: "3", zh: "描述一個你克服困難的經歷", en: "Describe a time you overcame a challenge.", category: "behavioral", difficulty: "medium" },
  { id: "4", zh: "你的優點和缺點是什麼？", en: "What are your strengths and weaknesses?", category: "behavioral", difficulty: "easy" },
  { id: "5", zh: "描述一個你與團隊成員意見不合的情況，以及你如何處理。", en: "Describe a disagreement with a teammate and how you handled it.", category: "situational", difficulty: "medium" },
  { id: "6", zh: "你如何處理工作壓力？", en: "How do you handle work-related stress?", category: "behavioral", difficulty: "easy" },
  { id: "7", zh: "描述一個你領導專案的經驗", en: "Describe a project you led.", category: "behavioral", difficulty: "hard" },
  { id: "8", zh: "你未來五年的職涯規劃是什麼？", en: "Where do you see your career in five years?", category: "behavioral", difficulty: "medium" },
  { id: "9", zh: "如果主管給你一個不合理的截止日期，你會怎麼做？", en: "What would you do if your manager gave you an unrealistic deadline?", category: "situational", difficulty: "hard" },
  { id: "10", zh: "描述一個你失敗的經驗，以及你從中學到什麼。", en: "Describe a failure and what you learned from it.", category: "behavioral", difficulty: "medium" },
];

const CJK_RE = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;

export function getDefaultInterviewQuestions(locale: InterviewLocale): LocalizedDefaultQuestion[] {
  return DEFAULT_QUESTION_COPY.map((item) => ({
    id: item.id,
    question: locale === "en" ? item.en : item.zh,
    category: item.category,
    difficulty: item.difficulty,
    isBookmarked: false,
  }));
}

export function containsCjk(value: string): boolean {
  return CJK_RE.test(value);
}

export function isTextInInterviewLocale(value: string, locale: InterviewLocale): boolean {
  return locale === "en" ? !containsCjk(value) : /\p{Script=Han}/u.test(value);
}

export function normalizeInterviewEvidence(value: string): string {
  return value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

export interface InterviewReviewEvidenceSource {
  id: string;
  source_url?: string | null;
  title?: string | null;
  content?: string | null;
  questions?: string[];
}

export interface PredictedInterviewQuestion {
  question: string;
  category: InterviewQuestionCategory;
  difficulty: "easy" | "medium" | "hard";
  evidence: Array<{ reviewId: string; quote: string }>;
  source_urls: string[];
}

const CATEGORIES = new Set<InterviewQuestionCategory>([
  "behavioral", "technical", "situational", "self_introduction", "other",
]);
const DIFFICULTIES = new Set(["easy", "medium", "hard"]);

/** Keep only review-grounded questions in the requested display language. */
export function validatePredictedInterviewQuestions(
  candidates: unknown,
  reviews: InterviewReviewEvidenceSource[],
  locale: InterviewLocale,
  limit = 8,
): PredictedInterviewQuestion[] {
  if (!Array.isArray(candidates) || reviews.length === 0) return [];

  const reviewsById = new Map(reviews.map((review) => [review.id, review]));
  const seen = new Set<string>();
  const validated: PredictedInterviewQuestion[] = [];

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object") continue;
    const item = candidate as Record<string, unknown>;
    const question = typeof item.question === "string" ? item.question.trim() : "";
    if (question.length < 8 || question.length > 300 || !isTextInInterviewLocale(question, locale)) continue;

    const key = normalizeInterviewEvidence(question);
    if (!key || seen.has(key)) continue;

    const evidence: PredictedInterviewQuestion["evidence"] = [];
    const sourceUrls = new Set<string>();
    if (Array.isArray(item.evidence)) {
      for (const rawEvidence of item.evidence) {
        if (!rawEvidence || typeof rawEvidence !== "object") continue;
        const reference = rawEvidence as Record<string, unknown>;
        const review = reviewsById.get(String(reference.reviewId ?? ""));
        const quote = typeof reference.quote === "string" ? reference.quote.trim() : "";
        const normalizedQuote = normalizeInterviewEvidence(quote);
        if (!review || normalizedQuote.length < 8) continue;
        // Only original review text is evidence. AI-extracted question fields
        // are hints and must never be treated as source quotes.
        const sourceText = normalizeInterviewEvidence(`${review.title ?? ""}\n${review.content ?? ""}`);
        if (!sourceText.includes(normalizedQuote)) continue;
        evidence.push({ reviewId: review.id, quote });
        if (review.source_url) sourceUrls.add(review.source_url);
      }
    }
    if (evidence.length === 0) continue;

    const category = CATEGORIES.has(item.category as InterviewQuestionCategory)
      ? item.category as InterviewQuestionCategory
      : "other";
    const difficulty = DIFFICULTIES.has(String(item.difficulty))
      ? item.difficulty as "easy" | "medium" | "hard"
      : "medium";

    seen.add(key);
    validated.push({
      question,
      category,
      difficulty,
      evidence,
      source_urls: Array.from(sourceUrls),
    });
    if (validated.length >= Math.max(1, Math.min(20, limit))) break;
  }

  return validated;
}
