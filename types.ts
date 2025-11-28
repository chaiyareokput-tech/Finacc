
export interface FinancialRatio {
  name: string;
  value: number;
  unit: string;
  status: 'good' | 'warning' | 'critical';
  description: string;
}

export interface DepartmentAnalysis {
  name: string;
  revenue: number;
  expense: number;
  profit: number;
  liquidityComment: string;
}

export interface SignificantChange {
  item: string;
  amount: number; // ผลต่างที่เป็นตัวเงิน
  percentage: string; // % การเปลี่ยนแปลง (เช่น "+50%", "-20%")
  trend: 'increase' | 'decrease';
  reason: string; // ความเห็น AI ว่าทำไมถึงเปลี่ยนเยอะ
  relatedDepartment?: string; // หน่วยงานที่เกี่ยวข้อง (ถ้ามี)
}

export interface AnalysisResult {
  overallAnalysis: string;
  formalReport: string; // บทรายงานแบบทางการ
  ratios: FinancialRatio[];
  departments: DepartmentAnalysis[];
  significantChanges: SignificantChange[]; // รายการที่มีนัยสำคัญ
  topHighItems: string[];
  topLowItems: string[];
}

export enum AppState {
  UPLOAD,
  ANALYZING,
  RESULT,
  ERROR
}
