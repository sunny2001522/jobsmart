// 20 因素評分系統配置

import type { FactorMetadata } from '@/types';

// 因素元數據
export const FACTOR_METADATA: Record<string, FactorMetadata> = {
  salary: {
    id: 'salary',
    name: '薪資待遇',
    shortName: '薪資',
    description: '薪水、獎金、分紅等金錢報酬',
    primarySource: 'jd',
  },
  benefits: {
    id: 'benefits',
    name: '福利制度',
    shortName: '福利',
    description: '年假、保險、員工旅遊等福利',
    primarySource: 'jd',
  },
  growth: {
    id: 'growth',
    name: '職涯發展',
    shortName: '發展',
    description: '升遷管道、職涯規劃',
    primarySource: 'jd',
  },
  learning: {
    id: 'learning',
    name: '學習成長',
    shortName: '學習',
    description: '培訓、進修、技術分享機會',
    primarySource: 'jd',
  },
  stability: {
    id: 'stability',
    name: '穩定性',
    shortName: '穩定',
    description: '工作穩定、不常裁員',
    primarySource: 'reviews',
  },
  autonomy: {
    id: 'autonomy',
    name: '自主性',
    shortName: '自主',
    description: '自己決定工作方式、不被微管理',
    primarySource: 'jd',
  },
  flexibility: {
    id: 'flexibility',
    name: '彈性工時',
    shortName: '彈性',
    description: '彈性上下班、不打卡',
    primarySource: 'jd',
  },
  remote: {
    id: 'remote',
    name: '遠端工作',
    shortName: '遠端',
    description: '可在家工作、混合辦公',
    primarySource: 'jd',
  },
  location: {
    id: 'location',
    name: '地理位置',
    shortName: '位置',
    description: '通勤距離、交通便利性',
    primarySource: 'calculated',
    settingRequired: {
      type: 'location',
      label: '家庭地址',
      path: '/settings#location',
    },
  },
  teamwork: {
    id: 'teamwork',
    name: '團隊合作',
    shortName: '團隊',
    description: '團隊協作、互相幫忙',
    primarySource: 'jd',
  },
  colleagues: {
    id: 'colleagues',
    name: '同事關係',
    shortName: '同事',
    description: '同事友善、相處融洽',
    primarySource: 'reviews',
  },
  manager: {
    id: 'manager',
    name: '主管支持',
    shortName: '主管',
    description: '主管支持、好相處',
    primarySource: 'reviews',
  },
  achievement: {
    id: 'achievement',
    name: '成就感',
    shortName: '成就',
    description: '工作有意義、看到成果',
    primarySource: 'jd',
  },
  recognition: {
    id: 'recognition',
    name: '專業認可',
    shortName: '認可',
    description: '專業受肯定、被重視',
    primarySource: 'reviews',
  },
  impact: {
    id: 'impact',
    name: '社會影響力',
    shortName: '影響',
    description: '工作對社會有正面影響',
    primarySource: 'jd',
  },
  challenge: {
    id: 'challenge',
    name: '挑戰性',
    shortName: '挑戰',
    description: '工作有挑戰、不無聊',
    primarySource: 'jd',
  },
  creativity: {
    id: 'creativity',
    name: '創意發揮',
    shortName: '創意',
    description: '可嘗試新點子、不受限',
    primarySource: 'jd',
  },
  independence: {
    id: 'independence',
    name: '獨立工作',
    shortName: '獨立',
    description: '可獨立作業、不用常開會',
    primarySource: 'jd',
  },
  culture: {
    id: 'culture',
    name: '公司文化',
    shortName: '文化',
    description: '公司價值觀與自己相近',
    primarySource: 'reviews',
  },
  balance: {
    id: 'balance',
    name: '工作生活平衡',
    shortName: '平衡',
    description: '準時下班、不常加班',
    primarySource: 'reviews',
  },
};

// 因素顯示順序
export const FACTOR_ORDER = [
  'salary',
  'benefits',
  'growth',
  'learning',
  'stability',
  'autonomy',
  'flexibility',
  'remote',
  'location',
  'teamwork',
  'colleagues',
  'manager',
  'achievement',
  'recognition',
  'impact',
  'challenge',
  'creativity',
  'independence',
  'culture',
  'balance',
] as const;

export type FactorId = (typeof FACTOR_ORDER)[number];

// 按來源分類的因素
export const FACTORS_BY_SOURCE = {
  // 主要從 JD 分析
  jd: [
    'salary',
    'benefits',
    'growth',
    'learning',
    'autonomy',
    'flexibility',
    'remote',
    'teamwork',
    'achievement',
    'impact',
    'challenge',
    'creativity',
    'independence',
  ],
  // 主要從評論分析
  reviews: [
    'stability',
    'colleagues',
    'manager',
    'recognition',
    'culture',
    'balance',
  ],
  // 需要用戶設定後計算
  calculated: ['location'],
} as const;

// 擴展的關鍵詞映射（用於評論分析）
export const VALUE_KEYWORD_MAP: Record<string, string[]> = {
  salary: [
    '薪水',
    '待遇',
    '年薪',
    '獎金',
    '分紅',
    '薪資',
    '月薪',
    '收入',
    'pay',
    'salary',
    '加薪',
    '調薪',
    '年終',
  ],
  benefits: [
    '福利',
    '年假',
    '保險',
    '員工旅遊',
    '午餐',
    '下午茶',
    '健身房',
    '員購',
    '生日假',
    '補助',
    '津貼',
  ],
  growth: [
    '升遷',
    '成長',
    '培訓',
    '發展',
    '晉升',
    '進修',
    '學到',
    '成長空間',
    '職涯',
    '升職',
  ],
  learning: [
    '學習',
    '培訓',
    '課程',
    '研討會',
    '技術分享',
    'mentor',
    '進修',
    '證照',
    '教育訓練',
  ],
  stability: [
    '穩定',
    '不裁員',
    '長久',
    '保障',
    '穩定性',
    'job security',
    '資遣',
    '裁員',
    '離職率',
  ],
  autonomy: [
    '自主',
    '彈性',
    '自己決定',
    '不微管理',
    '獨立',
    '自由度',
    '空間',
    '信任',
    '授權',
  ],
  flexibility: [
    '彈性上下班',
    '不打卡',
    '核心時間',
    '自由安排',
    'flexible',
    '彈性工時',
  ],
  remote: [
    '遠端',
    '在家',
    'WFH',
    '居家',
    'remote',
    '遠距',
    '遠程',
    '混合辦公',
    'hybrid',
  ],
  location: ['交通', '捷運', '位置', '通勤', '距離', '地點'],
  teamwork: [
    '團隊',
    '合作',
    '協作',
    '一起',
    '互相幫忙',
    'team',
    '團隊合作',
  ],
  colleagues: [
    '同事',
    '夥伴',
    '工作環境',
    '人好',
    '相處',
    '氣氛',
    '人際',
  ],
  manager: [
    '主管',
    '老闆',
    'leader',
    '帶人',
    '指導',
    '支持',
    '上司',
    '長官',
  ],
  achievement: [
    '成就',
    '有意義',
    '看到成果',
    '影響',
    '貢獻',
    '價值',
    '成果',
  ],
  recognition: [
    '認可',
    '肯定',
    '被看見',
    '表揚',
    '獎勵',
    '認同',
    '被重視',
    '升職',
  ],
  impact: [
    '影響力',
    '使命',
    '價值',
    '社會',
    '幫助',
    '改變',
    '貢獻社會',
  ],
  challenge: [
    '挑戰',
    '有趣',
    '多元',
    '新技術',
    '刺激',
    '學新東西',
    '有挑戰性',
    '複雜',
  ],
  creativity: [
    '創意',
    '創新',
    '新點子',
    '嘗試',
    '實驗',
    '不受限',
    '發揮',
  ],
  independence: [
    '獨立',
    '一個人',
    '不開會',
    '專注',
    '安靜',
    '獨立作業',
  ],
  culture: [
    '文化',
    '價值觀',
    '氛圍',
    '風格',
    '理念',
    '企業文化',
  ],
  balance: [
    '準時下班',
    'WLB',
    '不加班',
    '生活平衡',
    '假期',
    '休假',
    '加班少',
    'work life balance',
    '工作生活',
  ],
};

// 獲取因素的分數顏色類名
export function getScoreColorClass(score: number | null): string {
  if (score === null) return 'text-muted-foreground';
  if (score >= 8) return 'text-green-600';
  if (score >= 5) return 'text-yellow-600';
  return 'text-red-600';
}

// 獲取因素的背景顏色類名
export function getScoreBgClass(score: number | null): string {
  if (score === null) return 'bg-muted/50';
  if (score >= 8) return 'bg-green-50';
  if (score >= 5) return 'bg-yellow-50';
  return 'bg-red-50';
}

// 格式化分數顯示
export function formatScore(score: number | null): string {
  if (score === null) return '?/10';
  return `${score}/10`;
}

// 獲取需要設定的因素列表
export function getFactorsRequiringSetting(): FactorMetadata[] {
  return Object.values(FACTOR_METADATA).filter((f) => f.settingRequired);
}
