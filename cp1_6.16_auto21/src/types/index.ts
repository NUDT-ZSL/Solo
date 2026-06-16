export interface CoffeeBean {
  id: string;
  name: string;
  origin: string;
  processMethod: string;
  flavorNotes: string[];
  stockKg: number;
  altitude: string;
  variety: string;
}

export type RoastLevel = 'light' | 'medium' | 'dark';

export interface RoastBatch {
  id: string;
  beanId: string;
  beanName: string;
  roastDate: string;
  roastLevel: RoastLevel;
  flavorNotes: string;
  inputTemp: number;
  outputTemp: number;
  roastDuration: number;
  score: number;
  createdAt: string;
}

export interface InventoryAlert {
  beanId: string;
  beanName: string;
  currentStock: number;
  threshold: number;
}

export interface StatsData {
  monthlyBatches: { month: string; count: number }[];
  roastLevelAvgScores: { level: string; avgScore: number }[];
}

export interface FilterOptions {
  roastLevels: RoastLevel[];
  startDate: string | null;
  endDate: string | null;
  searchTerm: string;
}

export interface CreateBatchRequest {
  beanId: string;
  roastDate: string;
  roastLevel: RoastLevel;
  flavorNotes: string;
  inputTemp: number;
  outputTemp: number;
  roastDuration: number;
}
