"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { GripVertical, RotateCcw, Loader2, Check, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { getValueRanking, saveValueRanking } from "@/lib/turso/db";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Image from "next/image";

interface ValueCard {
  id: string;
  name: string;
  description: string;
  image?: string;
}

const VALUE_CARDS: ValueCard[] = [
  { id: "salary", name: "薪資待遇", description: "週末老闆要我加班，但有加班費我很願意", image: "/images/values/salary.png" },
  { id: "balance", name: "工作生活平衡", description: "六點準時下班去接小孩，這比什麼都重要", image: "/images/values/balance.png" },
  { id: "growth", name: "職涯發展", description: "公司有完整的升遷管道，三年內能當主管", image: "/images/values/growth.png" },
  { id: "stability", name: "穩定性", description: "就算經濟不景氣，公司也不會輕易裁員", image: "/images/values/stability.png" },
  { id: "learning", name: "學習成長", description: "公司願意出錢讓我去上課、考證照", image: "/images/values/learning.png" },
  { id: "autonomy", name: "自主性", description: "老闆只看結果，不管我用什麼方法完成", image: "/images/values/autonomy.png" },
  { id: "flexibility", name: "彈性工時", description: "睡到自然醒再進公司，晚點走就好", image: "/images/values/flexibility.png" },
  { id: "remote", name: "遠端工作", description: "在家穿睡衣開會，省下通勤時間", image: "/images/values/remote.png" },
  { id: "teamwork", name: "團隊合作", description: "遇到困難時同事會主動來幫忙", image: "/images/values/teamwork.png" },
  { id: "colleagues", name: "同事關係", description: "下班後還會約同事去吃飯聊天", image: "/images/values/colleagues.png" },
  { id: "manager", name: "主管支持", description: "主管會幫我擋掉不合理的要求", image: "/images/values/manager.png" },
  { id: "achievement", name: "成就感", description: "看到自己做的產品被很多人使用", image: "/images/values/achievement.png" },
  { id: "recognition", name: "專業認可", description: "在公司裡被認為是這個領域的專家", image: "/images/values/recognition.png" },
  { id: "impact", name: "社會影響力", description: "我的工作能幫助到真正需要的人", image: "/images/values/impact.png" },
  { id: "challenge", name: "挑戰性", description: "每天都有新問題要解決，不會無聊", image: "/images/values/challenge.png" },
  { id: "creativity", name: "創意發揮", description: "可以嘗試新點子，不用照著SOP走", image: "/images/values/creativity.png" },
  { id: "culture", name: "公司文化", description: "公司的價值觀跟我自己的很接近", image: "/images/values/culture.png" },
  { id: "independence", name: "獨立工作", description: "一個人安靜地把事情做完，不用開會", image: "/images/values/independence.png" },
  { id: "benefits", name: "福利制度", description: "三節獎金、員工旅遊、免費午餐都有", image: "/images/values/benefits.png" },
  { id: "location", name: "地理位置", description: "公司就在捷運站旁邊，通勤超方便", image: "/images/values/location.png" },
];

// 卡片內容組件（供 SortableCard 和 DragOverlay 共用）
function CardContent({ card, index, isDragging }: { card: ValueCard; index: number; isDragging?: boolean }) {
  return (
    <div
      className={cn(
        "flex flex-col h-full bg-card border rounded-lg overflow-hidden",
        "cursor-grab active:cursor-grabbing",
        "hover:border-primary/50 transition-colors",
        isDragging && "opacity-50 shadow-xl ring-2 ring-primary"
      )}
    >
      {/* 圖片區域（佔一半） */}
      <div className="relative h-1/2 bg-muted flex items-center justify-center">
        {card.image ? (
          <Image
            src={card.image}
            alt={card.name}
            fill
            className="object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : null}
        <ImageIcon className="h-8 w-8 text-muted-foreground/50 absolute" />

        {/* 排名徽章 */}
        <div className="absolute top-1 left-1 w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
          {index + 1}
        </div>

        {/* 拖曳把手 */}
        <div className="absolute top-1 right-1 p-0.5 bg-background/80 rounded text-muted-foreground hover:text-foreground">
          <GripVertical className="h-3 w-3" />
        </div>
      </div>

      {/* 文字區域（佔一半） */}
      <div className="h-1/2 p-2 flex flex-col justify-center">
        <h3 className="font-medium text-sm leading-tight">{card.name}</h3>
        <p className="text-[10px] text-muted-foreground leading-tight mt-0.5 line-clamp-2">
          {card.description}
        </p>
      </div>
    </div>
  );
}

// 可拖曳的價值觀卡片
function SortableValueCard({ card, index }: { card: ValueCard; index: number }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="touch-none"
      {...attributes}
      {...listeners}
    >
      <CardContent card={card} index={index} isDragging={isDragging} />
    </div>
  );
}

export default function ValuesPage() {
  const [cards, setCards] = useState<ValueCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [activeId, setActiveId] = useState<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    })
  );

  // 載入歷史排序
  useEffect(() => {
    const loadRanking = async () => {
      setIsLoading(true);
      try {
        const ranking = await getValueRanking();
        if (ranking?.full_ranking?.length === VALUE_CARDS.length) {
          const orderedCards = ranking.full_ranking
            .map((id) => VALUE_CARDS.find((c) => c.id === id))
            .filter((c): c is ValueCard => c !== undefined);
          setCards(orderedCards);
        } else {
          setCards([...VALUE_CARDS]);
        }
      } catch (error) {
        console.error("Failed to load ranking:", error);
        setCards([...VALUE_CARDS]);
      } finally {
        setIsLoading(false);
      }
    };

    loadRanking();
  }, []);

  // 自動保存（防抖）
  const saveRanking = async (newCards: ValueCard[]) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    setSaveStatus("saving");

    saveTimeoutRef.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        const fullRanking = newCards.map((c) => c.id);
        const topValues = fullRanking.slice(0, 5);

        const result = await saveValueRanking({
          top_values: topValues,
          full_ranking: fullRanking,
          notes: null,
        });

        if (result) {
          setSaveStatus("saved");
          setTimeout(() => setSaveStatus("idle"), 2000);
        } else {
          console.error("Failed to save ranking - no result returned (check auth/profile)");
          setSaveStatus("idle");
        }
      } catch (error) {
        console.error("Failed to save ranking:", error);
        setSaveStatus("idle");
      } finally {
        setIsSaving(false);
      }
    }, 1000);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      setCards((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        saveRanking(newItems);
        return newItems;
      });
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const handleReset = () => {
    setCards([...VALUE_CARDS]);
    saveRanking([...VALUE_CARDS]);
  };

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const activeCard = activeId ? cards.find((c) => c.id === activeId) : null;
  const activeIndex = activeId ? cards.findIndex((c) => c.id === activeId) : -1;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* 標題區 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold">工作價值觀排序</h1>
          <p className="text-xs text-muted-foreground">
            拖曳卡片調整順序，排越前面代表越重視
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {saveStatus === "saving" && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              儲存中
            </span>
          )}
          {saveStatus === "saved" && (
            <span className="text-xs text-green-600 flex items-center gap-1">
              <Check className="h-3 w-3" />
              已儲存
            </span>
          )}
          <Button variant="outline" size="sm" onClick={handleReset} disabled={isSaving} className="h-7 text-xs">
            <RotateCcw className="h-3 w-3 mr-1" />
            重置
          </Button>
        </div>
      </div>

      {/* 5x4 網格 */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext
          items={cards.map((c) => c.id)}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-5 gap-2 flex-1">
            {cards.map((card, index) => (
              <SortableValueCard key={card.id} card={card} index={index} />
            ))}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeCard && activeIndex >= 0 ? (
            <div className="w-[calc((100%-32px)/5)]">
              <CardContent card={activeCard} index={activeIndex} isDragging />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
