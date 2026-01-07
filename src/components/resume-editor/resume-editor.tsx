"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import { EditorToolbar } from "./editor-toolbar";
import { Card } from "@/components/ui/card";

interface ResumeEditorProps {
  content?: Record<string, unknown>;
  onChange?: (content: Record<string, unknown>) => void;
  placeholder?: string;
}

export function ResumeEditor({
  content,
  onChange,
  placeholder = "開始撰寫你的履歷...",
}: ResumeEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Placeholder.configure({
        placeholder,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline",
        },
      }),
    ],
    content: content || getDefaultResumeTemplate(),
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose-base max-w-none focus:outline-none min-h-[500px] p-4",
      },
    },
    onUpdate: ({ editor }) => {
      onChange?.(editor.getJSON());
    },
  });

  return (
    <Card className="overflow-hidden">
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} />
    </Card>
  );
}

function getDefaultResumeTemplate(): Record<string, unknown> {
  return {
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
        content: [
          { type: "text", text: "📧 email@example.com | 📱 0912-345-678 | 📍 台北市" },
        ],
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
            text: "在這裡簡短介紹你自己，包括你的專業背景和職涯目標。",
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
        content: [
          {
            type: "text",
            marks: [{ type: "italic" }],
            text: "2022 年 1 月 - 現在",
          },
        ],
      },
      {
        type: "bulletList",
        content: [
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [
                  { type: "text", text: "使用強動詞開頭描述你的成就和職責" },
                ],
              },
            ],
          },
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [
                  { type: "text", text: "量化你的成果，例如：提升 30% 轉換率" },
                ],
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
        type: "heading",
        attrs: { level: 3 },
        content: [{ type: "text", text: "學位名稱 | 學校名稱" }],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            marks: [{ type: "italic" }],
            text: "2018 年 9 月 - 2022 年 6 月",
          },
        ],
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
                content: [
                  { type: "text", marks: [{ type: "bold" }], text: "程式語言：" },
                  { type: "text", text: "TypeScript, Python, SQL" },
                ],
              },
            ],
          },
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [
                  { type: "text", marks: [{ type: "bold" }], text: "框架工具：" },
                  { type: "text", text: "React, Next.js, Node.js" },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
}
