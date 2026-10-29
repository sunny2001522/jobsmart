import { toast as sonnerToast } from "sonner";

type ToastOptions = Parameters<typeof sonnerToast.success>[1];
type ToastKind = "success" | "error" | "warning" | "info" | "loading";

const translations: Record<string, string> = {
  "搜尋失敗": "Search failed",
  "搜尋失敗，請稍後重試": "Search failed. Please try again later.",
  "客製履歷已建立，請逐項審核": "Tailored resume created. Please review each item.",
  "準備失敗，請稍後重試": "Preparation failed. Please try again later.",
  "草稿已儲存並重新完成事實審核": "Draft saved and fact-checked again.",
  "儲存失敗": "Save failed",
  "已更新為已投遞": "Marked as applied",
  "更新失敗": "Update failed",
  "刪除失敗，請重試": "Delete failed. Please try again.",
  "已移除候選職缺": "Candidate job removed",
  "請先新增你的原始履歷": "Please add your original resume first",
  "履歷準備失敗": "Resume preparation failed",
  "履歷準備失敗，請稍後重試": "Resume preparation failed. Please try again later.",
  "客製履歷已儲存": "Tailored resume saved",
  "客製履歷儲存失敗，請重試": "Failed to save tailored resume. Please try again.",
  "履歷更新失敗": "Failed to update resume",
  "履歷已根據你的回答更新": "Resume updated based on your answer",
  "公司評論查詢失敗，請稍後再試": "Failed to fetch company reviews. Please try again later.",
  "評論已新增，分數正在重新計算": "Review added. Score is being recalculated.",
  "履歷版本已刪除": "Resume version deleted",
  "刪除失敗，請稍後再試": "Delete failed. Please try again later.",
  "工作已加入版本": "Job added to resume version",
  "加入失敗，該工作可能已存在": "Failed to add job. It may already exist.",
  "已移除工作": "Job removed",
  "移除失敗": "Remove failed",
  "客製化履歷已生成": "Tailored resume generated",
  "生成失敗，請稍後再試": "Generation failed. Please try again later.",
  "PDF 已下載": "PDF downloaded",
  "PDF 匯出失敗": "PDF export failed",
  "PDF 匯出失敗，請稍後再試": "PDF export failed. Please try again later.",
  "履歷已儲存": "Resume saved",
  "AI 分析完成": "AI analysis complete",
  "AI 優化失敗，請稍後再試": "AI optimization failed. Please try again later.",
  "履歷客製化完成！": "Resume tailoring complete!",
  "尚未生成客製化履歷": "The tailored resume has not been generated yet",
  "Nebius 驗證失敗：請更新伺服器端的 NEBIUS_API_KEY 後再試": "Nebius authentication failed. Update the server's NEBIUS_API_KEY and try again.",
};

const fallback: Record<ToastKind, string> = {
  success: "Action completed successfully",
  error: "Something went wrong. Please try again.",
  warning: "Please check this action",
  info: "Information updated",
  loading: "Working…",
};

function hasChinese(value: string) {
  return /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/u.test(value);
}

function localize(message: string, kind: ToastKind) {
  if (typeof window === "undefined" || window.localStorage.getItem("jobsmart.locale") !== "en") {
    return message;
  }

  let translated = translations[message];
  if (!translated) {
    const candidateCount = message.match(/^找到\s*(\d+)\s*個候選職缺$/u);
    if (candidateCount) translated = `Found ${candidateCount[1]} candidate jobs`;
  }

  // User-entered names and server messages can still contain CJK after a
  // known prefix is translated. Keep the English-mode toast strictly English.
  return translated && !hasChinese(translated) ? translated : hasChinese(message) ? fallback[kind] : message;
}

function createToast(kind: ToastKind) {
  return (message: string, options?: ToastOptions) => {
    if (kind === "loading") return sonnerToast.loading(localize(message, kind), options);
    return sonnerToast[kind](localize(message, kind), options);
  };
}

export const localizedToast = {
  success: createToast("success"),
  error: createToast("error"),
  warning: createToast("warning"),
  info: createToast("info"),
  loading: createToast("loading"),
};
