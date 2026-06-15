export interface FitnessRecord {
  id: string;
  exerciseType: string;
  duration: number;
  intensity: number;
  avgHeartRate: number;
  calories: number;
  createdAt: string;
}

export interface DailyTrendItem {
  date: string;
  label: string;
  duration: number;
  avgHeartRate: number;
  calories: number;
}

export interface TypeDistributionItem {
  type: string;
  duration: number;
}

export interface MonthlyTypeItem {
  name: string;
  value: number;
}

export interface StackedWeekItem {
  week: string;
  avgHeartRate: number;
  [key: string]: number | string;
}

export interface WeeklyStats {
  totalDuration: number;
  avgHeartRate: number;
  totalCalories: number;
  activeDays: number;
  bestDay: string;
  dailyTrend: DailyTrendItem[];
  typeDistribution: TypeDistributionItem[];
}

export interface MonthlyStats {
  stackedByWeek: StackedWeekItem[];
  typeDistribution: MonthlyTypeItem[];
}

export interface StatsResponse {
  records: FitnessRecord[];
  weekly: WeeklyStats;
  monthly: MonthlyStats;
  exerciseTypes: string[];
}

export interface SubmitRecordRequest {
  exercise_type: string;
  duration: number;
  intensity: number;
  avg_heart_rate: number;
}

export interface SubmitRecordResponse {
  id: string;
  exercise_type: string;
  duration: number;
  intensity: number;
  avg_heart_rate: number;
  calories: number;
  created_at: string;
}

const API_BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error((errorData as any).error || '请求失败');
  }

  return response.json();
}

export function getStats(): Promise<StatsResponse> {
  return request<StatsResponse>('/records/stats');
}

export function submitRecord(data: SubmitRecordRequest): Promise<SubmitRecordResponse> {
  return request<SubmitRecordResponse>('/records', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function getRecordsByType(type: string): Promise<{ records: FitnessRecord[] }> {
  return request<{ records: FitnessRecord[] }>(`/records/type/${encodeURIComponent(type)}`);
}
