import { load } from "cheerio";

const BLOCK_TAGS = /<(?:br\b|\/p\b|\/div\b|\/section\b|\/article\b|\/li\b|\/h[1-6]\b|\/tr\b)[^>]*>/gi;
const OPEN_BLOCK_TAGS = /<(?:p|div|section|article|li|h[1-6]|tr)\b[^>]*>/gi;

const NOISE_SELECTORS = [
  "script", "style", "noscript", "template", "svg", "canvas", "iframe",
  "header", "nav", "footer", "aside", "[role='navigation']",
  "[role='banner']", "[role='contentinfo']", "[aria-label*='menu' i]",
  "[aria-label*='navigation' i]",
];

const CONTENT_SELECTORS = [
  "main", "[role='main']", "article", "[class*='job-description' i]",
  "[class*='job-detail' i]", "[class*='job-content' i]",
  "[id*='job-description' i]", "[id*='job-detail' i]",
];

const UI_NOISE = new Set([
  "menu", "menu icon", "close", "close icon", "search icon",
  "shopping cart", "skip to main content", "nvidia logo", "login",
  "log in", "logout", "log out",
]);

function cleanLines(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/[ \t\f\v]+/g, " ").trim())
    .filter(Boolean)
    .filter((line) => !UI_NOISE.has(line.toLocaleLowerCase()));

  const deduped: string[] = [];
  for (const line of lines) {
    if (line !== deduped[deduped.length - 1]) deduped.push(line);
  }
  return deduped.join("\n").trim();
}

/** Extract readable job content while preserving paragraphs and list items. */
export function extractJobTextFromHTML(html: string) {
  const $ = load(html);
  $(NOISE_SELECTORS.join(",")).remove();

  let root = $("body");
  for (const selector of CONTENT_SELECTORS) {
    const candidate = $(selector).first();
    if (candidate.length && cleanLines(candidate.html() || "").length >= 200) {
      root = candidate as typeof root;
      break;
    }
  }

  // Add boundaries before stripping tags. $.text() would concatenate adjacent
  // headings, paragraphs, and list items into one long line.
  const withBreaks = (root.html() || "")
    .replace(BLOCK_TAGS, "\n")
    .replace(OPEN_BLOCK_TAGS, "\n")
    .replace(/<[^>]+>/g, " ");

  return cleanLines(load(`<body>${withBreaks}</body>`).text());
}

/** Normalize model output without flattening intentional paragraph breaks. */
export function normalizeJobText(value: unknown) {
  if (typeof value !== "string") return "";
  return cleanLines(value.replace(/\r\n?/g, "\n"));
}

export function normalizeJobList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeJobText).filter(Boolean);
}
