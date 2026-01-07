import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileText } from "lucide-react";

export default function ResumePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">履歷管理</h1>
          <p className="text-muted-foreground">
            建立和管理你的 ATS 友善履歷
          </p>
        </div>
        <Button asChild>
          <Link href="/resume/new">
            <Plus className="h-4 w-4 mr-2" />
            新增履歷
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>我的履歷</CardTitle>
          <CardDescription>你目前沒有任何履歷</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <FileText className="h-16 w-16 mb-4" />
            <p className="text-lg font-medium">開始建立你的第一份履歷</p>
            <p className="text-sm mt-2">使用 AI 幫你優化履歷，提高 ATS 通過率</p>
            <Button className="mt-4" asChild>
              <Link href="/resume/new">
                <Plus className="h-4 w-4 mr-2" />
                新增履歷
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
