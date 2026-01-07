"use client";

import { useState } from "react";
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

interface AddApplicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { companyName: string; position: string; jdUrl?: string }) => void;
}

export function AddApplicationDialog({
  open,
  onOpenChange,
  onSubmit,
}: AddApplicationDialogProps) {
  const [companyName, setCompanyName] = useState("");
  const [position, setPosition] = useState("");
  const [jdUrl, setJdUrl] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !position) return;

    onSubmit({
      companyName,
      position,
      jdUrl: jdUrl || undefined,
    });

    // Reset form
    setCompanyName("");
    setPosition("");
    setJdUrl("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>新增求職追蹤</DialogTitle>
            <DialogDescription>
              新增一個新的工作機會到追蹤看板
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
            <div className="space-y-2">
              <Label htmlFor="jdUrl">JD 網址 (選填)</Label>
              <Input
                id="jdUrl"
                type="url"
                placeholder="https://..."
                value={jdUrl}
                onChange={(e) => setJdUrl(e.target.value)}
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
