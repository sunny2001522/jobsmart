"use client";

import { Globe2 } from "lucide-react";
import { useI18n } from "@/contexts/i18n-context";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function LanguageSwitcher({ className, compactOnMobile = false }: { className?: string; compactOnMobile?: boolean }) {
  const { locale, setLocale, t } = useI18n();

  return (
    <Select value={locale} onValueChange={(value) => setLocale(value as "zh-TW" | "en")}>
      <SelectTrigger aria-label={t("language.label")} className={className ?? "w-[142px]"}>
        <Globe2 className="mr-2 h-4 w-4 shrink-0" />
        <SelectValue className={compactOnMobile ? "max-sm:hidden" : undefined} />
      </SelectTrigger>
      <SelectContent align="end">
        <SelectItem value="zh-TW">{t("language.chinese")}</SelectItem>
        <SelectItem value="en">{t("language.english")}</SelectItem>
      </SelectContent>
    </Select>
  );
}
