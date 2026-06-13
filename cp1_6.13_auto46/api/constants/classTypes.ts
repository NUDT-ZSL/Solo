export enum ClassType {
  YOGA = "yoga",
  STRENGTH = "strength",
  CYCLING = "cycling",
  PILATES = "pilates",
}

export const CLASS_TYPE_LABELS: Record<ClassType, string> = {
  [ClassType.YOGA]: "瑜伽",
  [ClassType.STRENGTH]: "力量训练",
  [ClassType.CYCLING]: "动感单车",
  [ClassType.PILATES]: "普拉提",
};

export const CLASS_TYPE_COLORS: Record<ClassType, string> = {
  [ClassType.YOGA]: "#e9d5ff",
  [ClassType.STRENGTH]: "#fed7aa",
  [ClassType.CYCLING]: "#fecaca",
  [ClassType.PILATES]: "#bfdbfe",
};

export const DEFAULT_CLASS_COLOR = "#cbd5e1";

export function getClassColor(type: string): string {
  return (
    CLASS_TYPE_COLORS[type as ClassType] ?? DEFAULT_CLASS_COLOR
  );
}

export function getClassLabel(type: string): string {
  return CLASS_TYPE_LABELS[type as ClassType] ?? "其他课程";
}

export const TIME_SLOTS = [
  "07:00-08:00",
  "08:00-09:00",
  "09:00-10:00",
  "10:00-11:00",
  "11:00-12:00",
  "14:00-15:00",
  "15:00-16:00",
  "16:00-17:00",
  "17:00-18:00",
  "18:00-19:00",
];

export const STORES = [
  { id: "store-1", name: "中关村店" },
  { id: "store-2", name: "国贸店" },
  { id: "store-3", name: "望京店" },
  { id: "store-4", name: "朝阳大悦城店" },
  { id: "store-5", name: "西单店" },
  { id: "store-6", name: "三里屯店" },
  { id: "store-7", name: "五道口店" },
];

export const STORE_COUNT = 7;
export const TIME_SLOT_COUNT = 10;

export enum UserRole {
  MEMBER = "member",
  ADMIN = "admin",
}

export const HEATMAP_FILL_RATE_THRESHOLD_LOW = 0.3;
export const HEATMAP_FILL_RATE_THRESHOLD_HIGH = 0.8;
