/**
 * 台灣薪資計算工具
 * 計算實領薪水（扣除勞健保、預估租金、通勤費用，加上福利補助）
 */

// 2024 年勞保費率
const LABOR_INSURANCE_RATE = 0.115; // 勞工負擔 20%，實際費率 11.5% * 20% = 2.3%
const LABOR_INSURANCE_EMPLOYEE_RATE = 0.023; // 勞工實際負擔 2.3%

// 2024 年健保費率
const HEALTH_INSURANCE_RATE = 0.0517; // 健保費率 5.17%
const HEALTH_INSURANCE_EMPLOYEE_RATE = 0.3; // 勞工負擔 30%

// 2024 年勞退
const LABOR_PENSION_RATE = 0.06; // 雇主提撥 6%（不從薪水扣）

// 勞保投保薪資級距（2024）
const LABOR_INSURANCE_BRACKETS = [
  27470, 28800, 30300, 31800, 33300, 34800, 36300, 38200, 40100,
  42000, 43900, 45800, 48200, 50600, 53000, 55400, 57800, 60800, 63800,
  66800, 69800, 72800, 76500, 80200, 83900, 87600, 92100, 96600,
  101100, 105600, 110100, 115500, 120900, 126300, 131700, 137100,
  142500, 147900, 150000, // 最高投保薪資 150,000
];

// 健保投保薪資級距（2024）
const HEALTH_INSURANCE_BRACKETS = [
  27470, 28800, 30300, 31800, 33300, 34800, 36300, 38200, 40100,
  42000, 43900, 45800, 48200, 50600, 53000, 55400, 57800, 60800, 63800,
  66800, 69800, 72800, 76500, 80200, 83900, 87600, 92100, 96600,
  101100, 105600, 110100, 115500, 120900, 126300, 131700, 137100,
  142500, 147900, 153600, 159600, 165600, 171600, 177600, 183600,
  189600, 195600, 201600, 207600, 213600, 219500,
];

// 各城市平均套房租金估計（TWD/月）
export const CITY_RENT_ESTIMATES: Record<string, number> = {
  '台北市': 15000,
  '新北市': 10000,
  '桃園市': 8000,
  '新竹市': 10000,
  '新竹縣': 8000,
  '台中市': 8000,
  '台南市': 6500,
  '高雄市': 7000,
  '基隆市': 6000,
  '宜蘭縣': 6000,
  '苗栗縣': 5500,
  '彰化縣': 5500,
  '南投縣': 5000,
  '雲林縣': 5000,
  '嘉義市': 5500,
  '嘉義縣': 5000,
  '屏東縣': 5500,
  '花蓮縣': 6000,
  '台東縣': 5500,
  '澎湖縣': 5000,
  '金門縣': 4500,
  '連江縣': 4500,
  // 常見區域別名
  '內湖': 14000,
  '信義區': 18000,
  '大安區': 17000,
  '中山區': 15000,
  '松山區': 15000,
  '南港區': 12000,
  '汐止': 9000,
  '板橋': 10000,
  '中和': 9500,
  '永和': 10000,
  '三重': 9000,
  '新莊': 8500,
  '竹北': 10000,
  '竹科': 10000,
};

// 取得投保薪資級距
function getInsuranceBracket(salary: number, brackets: number[]): number {
  for (const bracket of brackets) {
    if (salary <= bracket) {
      return bracket;
    }
  }
  return brackets[brackets.length - 1];
}

// 計算勞保費
export function calculateLaborInsurance(monthlySalary: number): number {
  const bracket = getInsuranceBracket(monthlySalary, LABOR_INSURANCE_BRACKETS);
  return Math.round(bracket * LABOR_INSURANCE_EMPLOYEE_RATE);
}

// 計算健保費（本人）
export function calculateHealthInsurance(monthlySalary: number, dependents: number = 0): number {
  const bracket = getInsuranceBracket(monthlySalary, HEALTH_INSURANCE_BRACKETS);
  // 本人 + 眷屬（最多 3 人）
  const persons = Math.min(1 + dependents, 4);
  return Math.round(bracket * HEALTH_INSURANCE_RATE * HEALTH_INSURANCE_EMPLOYEE_RATE * persons);
}

// 根據地點取得預估租金
export function getRentEstimate(location: string | null): number | null {
  if (!location) return null;

  // 直接匹配
  if (CITY_RENT_ESTIMATES[location]) {
    return CITY_RENT_ESTIMATES[location];
  }

  // 模糊匹配
  const locationLower = location.toLowerCase();
  for (const [key, value] of Object.entries(CITY_RENT_ESTIMATES)) {
    if (locationLower.includes(key) || key.includes(location)) {
      return value;
    }
  }

  return null;
}

// 薪資計算輸入
export interface SalaryCalculatorInput {
  monthlySalary: number;           // 月薪
  workLocation?: string | null;    // 工作地點
  customRent?: number | null;      // 自訂租金（優先於自動估算）
  commuteCost?: number;            // 通勤費用
  mealAllowance?: number;          // 餐費補助
  otherAllowance?: number;         // 其他補助
  dependents?: number;             // 健保眷屬人數
}

// 薪資計算結果
export interface SalaryCalculatorResult {
  grossSalary: number;             // 稅前月薪
  laborInsurance: number;          // 勞保費
  healthInsurance: number;         // 健保費
  totalDeductions: number;         // 總扣除（勞健保）
  netSalary: number;               // 實領薪水（扣勞健保後）
  rentEstimate: number | null;     // 租金估計
  commuteCost: number;             // 通勤費用
  totalAllowance: number;          // 總補助
  disposableIncome: number;        // 可支配收入（實領 - 租金 - 通勤 + 補助）
  breakdown: {
    label: string;
    amount: number;
    type: 'income' | 'deduction' | 'expense' | 'benefit';
  }[];
}

// 計算實領薪水和可支配收入
export function calculateSalary(input: SalaryCalculatorInput): SalaryCalculatorResult {
  const {
    monthlySalary,
    workLocation,
    customRent,
    commuteCost = 0,
    mealAllowance = 0,
    otherAllowance = 0,
    dependents = 0,
  } = input;

  const laborInsurance = calculateLaborInsurance(monthlySalary);
  const healthInsurance = calculateHealthInsurance(monthlySalary, dependents);
  const totalDeductions = laborInsurance + healthInsurance;
  const netSalary = monthlySalary - totalDeductions;

  // 租金：優先使用自訂，否則根據地點估算
  const rentEstimate = customRent ?? getRentEstimate(workLocation ?? null);

  // 總補助
  const totalAllowance = mealAllowance + otherAllowance;

  // 可支配收入 = 實領 - 租金 - 通勤 + 補助
  const disposableIncome = netSalary - (rentEstimate || 0) - commuteCost + totalAllowance;

  // 明細
  const breakdown: SalaryCalculatorResult['breakdown'] = [
    { label: '稅前月薪', amount: monthlySalary, type: 'income' },
    { label: '勞保費', amount: -laborInsurance, type: 'deduction' },
    { label: '健保費', amount: -healthInsurance, type: 'deduction' },
  ];

  if (rentEstimate) {
    breakdown.push({ label: '租金', amount: -rentEstimate, type: 'expense' });
  }

  if (commuteCost > 0) {
    breakdown.push({ label: '通勤費', amount: -commuteCost, type: 'expense' });
  }

  if (mealAllowance > 0) {
    breakdown.push({ label: '餐費補助', amount: mealAllowance, type: 'benefit' });
  }

  if (otherAllowance > 0) {
    breakdown.push({ label: '其他補助', amount: otherAllowance, type: 'benefit' });
  }

  return {
    grossSalary: monthlySalary,
    laborInsurance,
    healthInsurance,
    totalDeductions,
    netSalary,
    rentEstimate,
    commuteCost,
    totalAllowance,
    disposableIncome,
    breakdown,
  };
}

// 格式化金額
export function formatCurrency(amount: number, currency: string = 'TWD'): string {
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// 年薪轉月薪
export function yearlyToMonthly(yearlySalary: number): number {
  return Math.round(yearlySalary / 12);
}

// 時薪轉月薪（假設每月工作 176 小時）
export function hourlyToMonthly(hourlyRate: number, hoursPerMonth: number = 176): number {
  return Math.round(hourlyRate * hoursPerMonth);
}
