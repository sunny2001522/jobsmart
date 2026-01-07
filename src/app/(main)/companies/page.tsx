import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Building2, Search } from "lucide-react";

export default function CompaniesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">公司資料庫</h1>
        <p className="text-muted-foreground">
          搜尋公司，查看評價和評論
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="搜尋公司名稱..."
          className="pl-10"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>熱門公司</CardTitle>
          <CardDescription>最多人追蹤的公司</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <Building2 className="h-16 w-16 mb-4" />
            <p className="text-lg font-medium">搜尋公司開始</p>
            <p className="text-sm mt-2">輸入公司名稱查看評價和面試經驗</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
