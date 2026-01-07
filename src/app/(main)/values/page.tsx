"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Heart,
  Shuffle,
  RotateCcw,
  Check,
  ChevronLeft,
  ChevronRight,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ValueCard {
  id: string;
  name: string;
  description: string;
  category: string;
  emoji: string;
}

const VALUE_CARDS: ValueCard[] = [
  { id: "achievement", name: "成就感", description: "完成任務後的滿足感", category: "個人成長", emoji: "🏆" },
  { id: "autonomy", name: "自主性", description: "能夠自己決定工作方式", category: "工作環境", emoji: "🎯" },
  { id: "balance", name: "工作生活平衡", description: "工作與私人生活的平衡", category: "生活方式", emoji: "⚖️" },
  { id: "salary", name: "薪資待遇", description: "合理的薪資報酬", category: "報酬獎勵", emoji: "💰" },
  { id: "growth", name: "職涯發展", description: "有明確的晉升機會", category: "個人成長", emoji: "📈" },
  { id: "teamwork", name: "團隊合作", description: "與同事良好的協作關係", category: "人際關係", emoji: "🤝" },
  { id: "creativity", name: "創意發揮", description: "能夠展現創意的空間", category: "個人成長", emoji: "💡" },
  { id: "stability", name: "穩定性", description: "工作的穩定與安全感", category: "生活方式", emoji: "🏠" },
  { id: "learning", name: "學習成長", description: "持續學習新技能的機會", category: "個人成長", emoji: "📚" },
  { id: "flexibility", name: "彈性工時", description: "靈活的工作時間安排", category: "生活方式", emoji: "⏰" },
  { id: "remote", name: "遠端工作", description: "可以在家或遠端工作", category: "生活方式", emoji: "🏡" },
  { id: "impact", name: "社會影響力", description: "工作對社會有正面影響", category: "個人成長", emoji: "🌍" },
  { id: "recognition", name: "專業認可", description: "專業能力受到肯定", category: "報酬獎勵", emoji: "⭐" },
  { id: "colleagues", name: "同事關係", description: "良好的同事情誼", category: "人際關係", emoji: "👥" },
  { id: "manager", name: "主管支持", description: "主管的信任與支持", category: "人際關係", emoji: "🤲" },
  { id: "culture", name: "公司文化", description: "認同公司的價值觀", category: "工作環境", emoji: "🎭" },
  { id: "challenge", name: "挑戰性", description: "工作具有適度挑戰", category: "個人成長", emoji: "🔥" },
  { id: "independence", name: "獨立工作", description: "能夠獨立完成任務", category: "工作環境", emoji: "🦅" },
  { id: "benefits", name: "福利制度", description: "完善的員工福利", category: "報酬獎勵", emoji: "🎁" },
  { id: "location", name: "地理位置", description: "便利的工作地點", category: "生活方式", emoji: "📍" },
];

type SortingPhase = "intro" | "sorting" | "result";
type CardChoice = "important" | "neutral" | "not_important";

export default function ValuesPage() {
  const [phase, setPhase] = useState<SortingPhase>("intro");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [choices, setChoices] = useState<Map<string, CardChoice>>(new Map());
  const [shuffledCards, setShuffledCards] = useState<ValueCard[]>([]);

  const startSorting = () => {
    // 隨機打亂卡片
    const shuffled = [...VALUE_CARDS].sort(() => Math.random() - 0.5);
    setShuffledCards(shuffled);
    setCurrentIndex(0);
    setChoices(new Map());
    setPhase("sorting");
  };

  const handleChoice = (choice: CardChoice) => {
    const card = shuffledCards[currentIndex];
    setChoices(new Map(choices.set(card.id, choice)));

    if (currentIndex < shuffledCards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setPhase("result");
    }
  };

  const goBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const reset = () => {
    setPhase("intro");
    setCurrentIndex(0);
    setChoices(new Map());
  };

  const getResults = () => {
    const important = shuffledCards.filter((c) => choices.get(c.id) === "important");
    const neutral = shuffledCards.filter((c) => choices.get(c.id) === "neutral");
    const notImportant = shuffledCards.filter((c) => choices.get(c.id) === "not_important");
    return { important, neutral, notImportant };
  };

  const progress = ((currentIndex + 1) / shuffledCards.length) * 100;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">工作價值觀探索</h1>
        <p className="text-muted-foreground">
          透過卡片排序了解你最重視的工作價值
        </p>
      </div>

      {phase === "intro" && (
        <Card>
          <CardHeader>
            <Heart className="h-12 w-12 text-primary mb-4" />
            <CardTitle>開始價值觀卡片排序</CardTitle>
            <CardDescription>
              這個練習將幫助你更清楚了解自己的工作動機和價值觀
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>📋 總共 {VALUE_CARDS.length} 張價值觀卡片</p>
              <p>⏱️ 預計需要 5-10 分鐘</p>
              <p>🎯 將每張卡片分類為：重要、普通、不重要</p>
            </div>

            <div className="space-y-2">
              <p className="font-medium">這個練習將幫助你：</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 更清楚了解自己的工作動機</li>
                <li>• 在面試中更好地表達你的價值觀</li>
                <li>• 找到更適合你的工作環境</li>
                <li>• 做出更好的職涯決策</li>
              </ul>
            </div>

            <Button onClick={startSorting} className="w-full">
              <Shuffle className="h-4 w-4 mr-2" />
              開始排序
            </Button>
          </CardContent>
        </Card>
      )}

      {phase === "sorting" && shuffledCards.length > 0 && (
        <div className="space-y-4">
          {/* 進度 */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>進度</span>
              <span>{currentIndex + 1} / {shuffledCards.length}</span>
            </div>
            <Progress value={progress} />
          </div>

          {/* 當前卡片 */}
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="bg-primary/5 p-8 text-center">
                <span className="text-6xl mb-4 block">
                  {shuffledCards[currentIndex].emoji}
                </span>
                <h2 className="text-2xl font-bold mb-2">
                  {shuffledCards[currentIndex].name}
                </h2>
                <p className="text-muted-foreground">
                  {shuffledCards[currentIndex].description}
                </p>
                <Badge variant="secondary" className="mt-4">
                  {shuffledCards[currentIndex].category}
                </Badge>
              </div>

              <div className="p-4 space-y-4">
                <p className="text-center text-sm text-muted-foreground">
                  這個價值觀對你來說有多重要？
                </p>

                <div className="grid grid-cols-3 gap-3">
                  <Button
                    variant="outline"
                    className="flex-col h-auto py-4 border-red-200 hover:bg-red-50 hover:border-red-300"
                    onClick={() => handleChoice("not_important")}
                  >
                    <span className="text-lg mb-1">😐</span>
                    <span className="text-xs">不重要</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-col h-auto py-4 border-yellow-200 hover:bg-yellow-50 hover:border-yellow-300"
                    onClick={() => handleChoice("neutral")}
                  >
                    <span className="text-lg mb-1">🤔</span>
                    <span className="text-xs">普通</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-col h-auto py-4 border-green-200 hover:bg-green-50 hover:border-green-300"
                    onClick={() => handleChoice("important")}
                  >
                    <span className="text-lg mb-1">❤️</span>
                    <span className="text-xs">重要</span>
                  </Button>
                </div>

                <div className="flex justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={goBack}
                    disabled={currentIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    上一張
                  </Button>
                  <Button variant="ghost" size="sm" onClick={reset}>
                    <RotateCcw className="h-4 w-4 mr-1" />
                    重新開始
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {phase === "result" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Trophy className="h-6 w-6 text-yellow-500" />
                <CardTitle>排序完成！</CardTitle>
              </div>
              <CardDescription>
                以下是你的工作價值觀排序結果
              </CardDescription>
            </CardHeader>
          </Card>

          {/* 重要 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="text-green-500">❤️</span>
                最重視的價值觀
              </CardTitle>
            </CardHeader>
            <CardContent>
              {getResults().important.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {getResults().important.map((card) => (
                    <Badge
                      key={card.id}
                      variant="secondary"
                      className="text-sm py-1 px-3"
                    >
                      {card.emoji} {card.name}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">沒有選擇任何重要的價值觀</p>
              )}
            </CardContent>
          </Card>

          {/* 普通 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="text-yellow-500">🤔</span>
                普通重要的價值觀
              </CardTitle>
            </CardHeader>
            <CardContent>
              {getResults().neutral.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {getResults().neutral.map((card) => (
                    <Badge
                      key={card.id}
                      variant="outline"
                      className="text-sm py-1 px-3"
                    >
                      {card.emoji} {card.name}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">沒有選擇任何普通重要的價值觀</p>
              )}
            </CardContent>
          </Card>

          {/* 不重要 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="text-gray-400">😐</span>
                較不重要的價值觀
              </CardTitle>
            </CardHeader>
            <CardContent>
              {getResults().notImportant.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {getResults().notImportant.map((card) => (
                    <Badge
                      key={card.id}
                      variant="outline"
                      className="text-sm py-1 px-3 opacity-60"
                    >
                      {card.emoji} {card.name}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">沒有選擇任何不重要的價值觀</p>
              )}
            </CardContent>
          </Card>

          {/* 操作 */}
          <div className="flex gap-4">
            <Button variant="outline" onClick={reset} className="flex-1">
              <RotateCcw className="h-4 w-4 mr-2" />
              重新排序
            </Button>
            <Button className="flex-1">
              <Check className="h-4 w-4 mr-2" />
              儲存結果
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
