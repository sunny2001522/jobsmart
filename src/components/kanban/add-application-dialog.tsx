"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Link2, CheckCircle2, Languages } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useJobCategoryContext } from "@/contexts/job-category-context";
import type { JDContentZh, ApplicationStatus } from "@/types";

interface FetchedJDData {
  companyName: string;
  position: string;
  description: string;
  requirements: string[];
  responsibilities: string[];
  benefits: string[];
  keywords: string[];
  salary?: string;
  location?: string;
  translation?: JDContentZh;  // 中文翻譯
}

interface AddApplicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultStatus?: ApplicationStatus;
  defaultCategoryId?: string | null;
  onSubmit: (data: {
    companyName: string;
    position: string;
    jdUrl?: string;
    jdContent?: string;
    fetchedData?: FetchedJDData;
    status?: ApplicationStatus;
    categoryId?: string | null;
  }) => void;
}

export function AddApplicationDialog({
  open,
  onOpenChange,
  defaultStatus,
  defaultCategoryId,
  onSubmit,
}: AddApplicationDialogProps) {
  const { categories } = useJobCategoryContext();
  const [companyName, setCompanyName] = useState("");
  const [position, setPosition] = useState("");
  const [jdUrl, setJdUrl] = useState("");
  const [jdContent, setJdContent] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(defaultCategoryId || null);
  const [isFetching, setIsFetching] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchedData, setFetchedData] = useState<FetchedJDData | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // 當 defaultCategoryId 變化時更新
  useEffect(() => {
    setCategoryId(defaultCategoryId || null);
  }, [defaultCategoryId]);

  // 翻譯 JD 內容
  const translateJD = async (data: FetchedJDData) => {
    setIsTranslating(true);
    try {
      const response = await fetch("/api/jd/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jdContent: {
            description: data.description,
            requirements: data.requirements,
            responsibilities: data.responsibilities,
            benefits: data.benefits,
            keywords: data.keywords,
          },
        }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        setFetchedData({
          ...data,
          translation: result.data,
        });
      }
    } catch (error) {
      console.error("Translation error:", error);
      // 翻譯失敗不阻擋主流程
    } finally {
      setIsTranslating(false);
    }
  };

  const handleFetchFromUrl = async () => {
    if (!jdUrl.trim()) return;

    setIsFetching(true);
    setFetchError(null);

    try {
      const response = await fetch("/api/jd/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: jdUrl }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        const data = result.data as FetchedJDData;
        setFetchedData(data);

        // 自動填入表單
        if (data.companyName && !companyName) {
          setCompanyName(data.companyName);
        }
        if (data.position && !position) {
          setPosition(data.position);
        }
        if (data.description) {
          setJdContent(data.description);
        }

        // 自動觸發翻譯
        translateJD(data);
      } else {
        setFetchError(result.error || "抓取失敗");
      }
    } catch (error) {
      console.error("Fetch error:", error);
      setFetchError("網路錯誤，請稍後再試");
    } finally {
      setIsFetching(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !position.trim()) {
      setValidationError("Please enter a company name and job title.");
      return;
    }
    setValidationError(null);

    onSubmit({
      companyName,
      position,
      jdUrl: jdUrl || undefined,
      jdContent: jdContent || undefined,
      fetchedData: fetchedData || undefined,
      status: defaultStatus,
      categoryId: categoryId,
    });

    // Reset form
    setCompanyName("");
    setPosition("");
    setJdUrl("");
    setJdContent("");
    setCategoryId(defaultCategoryId || null);
    setFetchedData(null);
    setFetchError(null);
  };

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} noValidate>
          <DialogHeader>
            <DialogTitle>新增求職追蹤</DialogTitle>
            <DialogDescription>
              新增一個新的工作機會到追蹤看板
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {validationError && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{validationError}</p>}
            <div className="space-y-2">
              <Label htmlFor="companyName">公司名稱 *</Label>
              <Input
                id="companyName"
                placeholder="例如：Google"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">職位名稱 *</Label>
              <Input
                id="position"
                placeholder="例如：Frontend Engineer"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                required
              />
            </div>
            {categories.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="category">職位類別 (選填)</Label>
                <Select
                  value={categoryId || "none"}
                  onValueChange={(value) => setCategoryId(value === "none" ? null : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="選擇類別" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">不分類</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: cat.color }}
                          />
                          {cat.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="jdUrl">JD 網址 (選填)</Label>
              <div className="flex gap-2">
                <Input
                  id="jdUrl"
                  type="url"
                  placeholder="貼上 CakeResume、104 等職缺連結..."
                  value={jdUrl}
                  onChange={(e) => {
                    setJdUrl(e.target.value);
                    setFetchError(null);
                    setFetchedData(null);
                  }}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleFetchFromUrl}
                  disabled={!isValidUrl(jdUrl) || isFetching}
                >
                  {isFetching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : fetchedData ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <Link2 className="h-4 w-4" />
                  )}
                  <span className="ml-1.5">{isFetching ? "抓取中" : "抓取"}</span>
                </Button>
              </div>
              {fetchError && (
                <p className="text-xs text-destructive">{fetchError}</p>
              )}
              {fetchedData && (
                <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded space-y-2">
                  <p className="text-green-600 font-medium flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    已成功抓取職缺資訊
                  </p>

                  {/* 翻譯中的 Skeleton */}
                  {isTranslating && (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Languages className="h-3.5 w-3.5 animate-pulse" />
                        <span>翻譯中...</span>
                      </div>
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-4/5" />
                      <Skeleton className="h-3 w-3/5" />
                    </div>
                  )}

                  {/* 中文摘要預覽 */}
                  {!isTranslating && fetchedData.translation && (
                    <div className="pt-1 border-t border-border/50 space-y-1.5">
                      <p className="font-medium text-foreground flex items-center gap-1.5">
                        <Languages className="h-3.5 w-3.5" />
                        中文摘要
                      </p>
                      {fetchedData.translation.summary && (
                        <p className="text-muted-foreground">{fetchedData.translation.summary}</p>
                      )}
                      {fetchedData.translation.requirements && fetchedData.translation.requirements.length > 0 && (
                        <div className="pt-1">
                          <p className="text-muted-foreground/80 mb-0.5">要求：</p>
                          <ul className="list-disc list-inside space-y-0.5">
                            {fetchedData.translation.requirements.slice(0, 3).map((req, idx) => (
                              <li key={idx}>{req}</li>
                            ))}
                            {fetchedData.translation.requirements.length > 3 && (
                              <li className="text-muted-foreground/60">還有 {fetchedData.translation.requirements.length - 3} 項...</li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 未翻譯時顯示福利 */}
                  {!isTranslating && !fetchedData.translation && fetchedData.benefits.length > 0 && (
                    <p>福利：{fetchedData.benefits.slice(0, 3).join("、")}{fetchedData.benefits.length > 3 ? "..." : ""}</p>
                  )}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="jdContent">
                JD 內容 (選填)
                <span className="text-xs text-muted-foreground ml-2">
                  貼上職缺描述，系統將自動解析
                </span>
              </Label>
              <Textarea
                id="jdContent"
                placeholder="貼上職缺描述內容..."
                value={jdContent}
                onChange={(e) => setJdContent(e.target.value)}
                rows={6}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit">新增</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
