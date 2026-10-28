"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import { messages, type MessageKey } from "@/lib/i18n/messages";
import { translateEnglishControls } from "@/lib/i18n/control-translations";

export type Locale = "zh-TW" | "en";

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey, values?: Record<string, string | number>) => string;
}

const STORAGE_KEY = "jobsmart.locale";
const I18nContext = createContext<I18nContextValue | null>(null);
const LOCALE_EVENT = "jobsmart:locale-change";

function subscribeToLocale(onChange: () => void) {
  window.addEventListener(LOCALE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(LOCALE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getStoredLocale(): Locale {
  const savedLocale = window.localStorage.getItem(STORAGE_KEY);
  return savedLocale === "en" || savedLocale === "zh-TW" ? savedLocale : "zh-TW";
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const storedLocale = useSyncExternalStore(subscribeToLocale, getStoredLocale, () => null);
  const locale: Locale = storedLocale ?? "zh-TW";

  useEffect(() => {
    if (!storedLocale) return;
    document.documentElement.lang = locale;
    document.title = messages["app.title"][locale];

    if (locale !== "en") return;

    // Legacy screens still contain a few literal control labels. Translate
    // them after render and when dialogs/lists add controls dynamically.
    // Run once after the page's client hydration has committed. Legacy pages
    // render their headings outside the message-key system and can finish
    // mounting after this provider effect.
    const translate = () => translateEnglishControls(document);
    translate();
    const delayedTranslation = window.setTimeout(translate, 50);
    const observer = new MutationObserver(() => window.requestAnimationFrame(translate));
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["aria-label", "title", "placeholder"] });
    return () => {
      window.clearTimeout(delayedTranslation);
      observer.disconnect();
    };
  }, [locale, storedLocale]);

  const setLocale = useCallback((nextLocale: Locale) => {
    window.localStorage.setItem(STORAGE_KEY, nextLocale);
    window.dispatchEvent(new Event(LOCALE_EVENT));
  }, []);

  const t = useCallback<I18nContextValue["t"]>((key, values) => {
    let message: string = messages[key][locale];
    if (values) {
      for (const [name, value] of Object.entries(values)) {
        message = message.replaceAll(`{${name}}`, String(value));
      }
    }
    return message;
  }, [locale]);

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  if (!storedLocale) {
    return <div className="min-h-screen bg-background" aria-busy="true" />;
  }

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return context;
}
