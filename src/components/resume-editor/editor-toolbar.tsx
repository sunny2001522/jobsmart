"use client";

import { Editor } from "@tiptap/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo,
  Redo,
  Link,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/contexts/i18n-context";

interface EditorToolbarProps {
  editor: Editor | null;
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  const { locale } = useI18n();
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  if (!editor) {
    return null;
  }

  const isEnglish = locale === "en";
  const openLinkDialog = () => {
    setLinkUrl(editor.getAttributes("link").href || "");
    setLinkDialogOpen(true);
  };
  const applyLink = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const url = linkUrl.trim();
    if (!url) return;
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    setLinkDialogOpen(false);
  };

  const ToolbarButton = ({
    onClick,
    isActive,
    children,
    title,
  }: {
    onClick: () => void;
    isActive?: boolean;
    children: React.ReactNode;
    title: string;
  }) => (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={cn(
        "h-8 w-8 p-0",
        isActive && "bg-muted"
      )}
      title={title}
    >
      {children}
    </Button>
  );

  return (
    <>
    <div className="flex flex-wrap items-center gap-1 border-b p-2">
      {/* 歷史操作 */}
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        title="復原"
      >
        <Undo className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        title="重做"
      >
        <Redo className="h-4 w-4" />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* 文字樣式 */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive("bold")}
        title="粗體"
      >
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive("italic")}
        title="斜體"
      >
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive("underline")}
        title="底線"
      >
        <Underline className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive("strike")}
        title="刪除線"
      >
        <Strikethrough className="h-4 w-4" />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* 標題 */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive("heading", { level: 1 })}
        title="標題 1"
      >
        <span className="text-xs font-bold">H1</span>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive("heading", { level: 2 })}
        title="標題 2"
      >
        <span className="text-xs font-bold">H2</span>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive("heading", { level: 3 })}
        title="標題 3"
      >
        <span className="text-xs font-bold">H3</span>
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* 列表 */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive("bulletList")}
        title="無序列表"
      >
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive("orderedList")}
        title="有序列表"
      >
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* 對齊 */}
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        isActive={editor.isActive({ textAlign: "left" })}
        title="靠左對齊"
      >
        <AlignLeft className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        isActive={editor.isActive({ textAlign: "center" })}
        title="置中對齊"
      >
        <AlignCenter className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        isActive={editor.isActive({ textAlign: "right" })}
        title="靠右對齊"
      >
        <AlignRight className="h-4 w-4" />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* 連結 */}
      <ToolbarButton
        onClick={openLinkDialog}
        isActive={editor.isActive("link")}
        title="插入連結"
      >
        <Link className="h-4 w-4" />
      </ToolbarButton>
    </div>
    <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
      <DialogContent>
        <form onSubmit={applyLink}>
          <DialogHeader>
            <DialogTitle>{isEnglish ? "Add link" : "插入連結"}</DialogTitle>
            <DialogDescription>
              {isEnglish ? "Enter the URL for the selected text." : "輸入要套用到所選文字的網址。"}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              autoFocus
              type="url"
              value={linkUrl}
              onChange={(event) => setLinkUrl(event.target.value)}
              placeholder="https://example.com"
              aria-label={isEnglish ? "Link URL" : "連結網址"}
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setLinkDialogOpen(false)}>
              {isEnglish ? "Cancel" : "取消"}
            </Button>
            <Button type="submit">{isEnglish ? "Apply link" : "套用連結"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
}
