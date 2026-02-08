// 價值觀到評論關鍵詞的映射
export const VALUE_KEYWORD_MAP: Record<string, string[]> = {
  salary: ["薪水", "待遇", "年薪", "獎金", "分紅", "薪資", "月薪", "收入", "pay", "salary"],
  growth: ["升遷", "成長", "學習", "培訓", "發展", "晉升", "進修", "學到", "成長空間"],
  balance: [
    "準時下班",
    "WLB",
    "不加班",
    "彈性",
    "work life balance",
    "生活平衡",
    "假期",
    "休假",
    "加班少",
  ],
  team: ["同事", "團隊", "氛圍", "相處", "合作", "夥伴", "工作環境", "團隊氣氛"],
  stability: ["穩定", "不裁員", "長久", "福利", "保障", "穩定性", "job security"],
  autonomy: ["自主", "彈性", "自己決定", "不微管理", "獨立", "自由度", "空間"],
  impact: ["影響力", "意義", "貢獻", "社會", "價值", "使命", "有意義的工作"],
  recognition: ["認可", "肯定", "被看見", "表揚", "獎勵", "認同", "被重視"],
  challenge: ["挑戰", "有趣", "多元", "新技術", "刺激", "學新東西", "有挑戰性"],
  remote: ["遠端", "在家", "WFH", "居家", "remote", "遠距", "遠程"],
};

// 價值觀元數據
export const VALUE_METADATA: Record<
  string,
  { name: string; emoji: string; description: string }
> = {
  salary: { name: "薪資待遇", emoji: "💰", description: "高薪水、好福利" },
  growth: { name: "成長空間", emoji: "📈", description: "學習機會、升遷管道" },
  balance: { name: "工作生活平衡", emoji: "⚖️", description: "準時下班、彈性工時" },
  team: { name: "團隊氛圍", emoji: "👥", description: "好同事、好主管" },
  stability: { name: "工作穩定", emoji: "🏠", description: "穩定、不常裁員" },
  autonomy: { name: "自主性", emoji: "🎯", description: "自己決定工作方式" },
  impact: { name: "社會影響力", emoji: "🌍", description: "有意義的工作" },
  recognition: { name: "被認可", emoji: "🏆", description: "努力被看見" },
  challenge: { name: "挑戰性", emoji: "🔥", description: "有趣、有挑戰的任務" },
  remote: { name: "遠端工作", emoji: "🏡", description: "可在家工作" },
};

// 情緒權重
export const SENTIMENT_WEIGHTS = {
  positive: 1.0,
  neutral: 0.5,
  negative: 0.0,
} as const;
