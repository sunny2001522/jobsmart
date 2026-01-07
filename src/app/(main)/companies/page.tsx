"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Building2, Search, TrendingUp } from "lucide-react";

const popularCompanies = [
  { name: "Google", industry: "科技" },
  { name: "台積電", industry: "半導體" },
  { name: "Meta", industry: "科技" },
  { name: "Microsoft", industry: "科技" },
  { name: "蝦皮", industry: "電商" },
  { name: "LINE", industry: "科技" },
];

export default function CompaniesPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/companies/${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleCompanyClick = (companyName: string) => {
    router.push(`/companies/${encodeURIComponent(companyName)}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">公司資料庫</h1>
        <p className="text-muted-foreground">
          搜尋公司，查看評價和評論
        </p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜尋公司名稱..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={!searchQuery.trim()}>
          搜尋
        </Button>
      </form>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            熱門公司
          </CardTitle>
          <CardDescription>最多人搜尋的公司</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {popularCompanies.map((company) => (
              <button
                key={company.name}
                onClick={() => handleCompanyClick(company.name)}
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors text-left"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold">
                  {company.name[0]}
                </div>
                <div>
                  <p className="font-medium">{company.name}</p>
                  <p className="text-xs text-muted-foreground">{company.industry}</p>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>評論來源</CardTitle>
          <CardDescription>我們從以下平台收集公司評論</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <Building2 className="h-8 w-8 text-blue-500" />
              <div>
                <p className="font-medium">Dcard</p>
                <p className="text-xs text-muted-foreground">工作版評論</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border opacity-50">
              <Building2 className="h-8 w-8 text-green-500" />
              <div>
                <p className="font-medium">Medium</p>
                <p className="text-xs text-muted-foreground">即將支援</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border opacity-50">
              <Building2 className="h-8 w-8 text-orange-500" />
              <div>
                <p className="font-medium">職場天眼通</p>
                <p className="text-xs text-muted-foreground">即將支援</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
