"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { useResumeVersions } from "@/hooks";
import { Loader2 } from "lucide-react";

interface AddVersionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// 預設的空白履歷模板
const DEFAULT_RESUME_TEMPLATE = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 1, textAlign: "center" },
      content: [{ type: "text", text: "你的名字" }],
    },
    {
      type: "paragraph",
      attrs: { textAlign: "center" },
      content: [{ type: "text", text: "email@example.com | 0912-345-678 | 台北市" }],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "個人簡介" }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "在此撰寫 2-3 句話的專業摘要，強調你的核心能力和職涯目標。",
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "工作經歷" }],
    },
    {
      type: "heading",
      attrs: { level: 3 },
      content: [{ type: "text", text: "職位名稱 | 公司名稱" }],
    },
    {
      type: "paragraph",
      content: [{ type: "text", text: "2022/01 - 至今 | 台北" }],
    },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "描述你的工作內容和成就，使用數據量化成果" }],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "使用強動詞開頭：領導、開發、優化、提升..." }],
            },
          ],
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "學歷" }],
    },
    {
      type: "paragraph",
      content: [{ type: "text", text: "學校名稱 | 科系 | 2018-2022" }],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "技能" }],
    },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "程式語言：JavaScript, TypeScript, Python" }],
            },
          ],
        },
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "框架：React, Next.js, Node.js" }],
            },
          ],
        },
      ],
    },
  ],
};

export function AddVersionDialog({ open, onOpenChange }: AddVersionDialogProps) {
  const router = useRouter();
  const { addVersion } = useResumeVersions();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const newVersion = await addVersion({
        name: name.trim(),
        description: description.trim() || null,
        target_role: targetRole.trim() || null,
        base_content: DEFAULT_RESUME_TEMPLATE,
        base_plain_text: null,
        base_ats_score: null,
        base_keywords: [],
        is_active: true,
        display_order: 0,
        category_id: null,
      });

      if (newVersion) {
        onOpenChange(false);
        // 重置表單
        setName("");
        setDescription("");
        setTargetRole("");
        // 導航到編輯頁面
        router.push(`/resume/${newVersion.id}/edit`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>新增履歷版本</DialogTitle>
            <DialogDescription>
              為不同類型的職位創建專屬的履歷版本
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">版本名稱 *</Label>
              <Input
                id="name"
                placeholder="例如：前端工程師版、設計師版"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="targetRole">目標職位</Label>
              <Input
                id="targetRole"
                placeholder="例如：Frontend Engineer"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">描述</Label>
              <Textarea
                id="description"
                placeholder="簡短描述這個版本的用途..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button type="submit" disabled={!name.trim() || isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              創建並編輯
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
