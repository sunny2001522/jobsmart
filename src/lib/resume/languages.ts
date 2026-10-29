export const RESUME_LANGUAGES = [
  { code: "zh-TW", label: "繁體中文" },
  { code: "zh-CN", label: "简体中文" },
  { code: "en", label: "English" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
] as const;

export type ResumeLanguageCode = (typeof RESUME_LANGUAGES)[number]["code"] | string;

export interface ResumeLanguageVariant {
  language_code: ResumeLanguageCode;
  content: Record<string, unknown>;
  plain_text: string;
  updated_at?: string;
}

export function getResumeLanguageLabel(code: string) {
  return RESUME_LANGUAGES.find((language) => language.code === code)?.label ?? code;
}

export function inferResumeLanguageCode(text: string | null | undefined) {
  const value = text ?? "";
  if (/[\u3040-\u30ff]/.test(value)) return "ja";
  if (/[\uac00-\ud7af]/.test(value)) return "ko";
  if (/[\u4e00-\u9fff]/.test(value)) return "zh-TW";
  if (/[\u0400-\u04ff]/.test(value)) return "other";
  return "en";
}
