export type RecordType = 'feeding' | 'walk' | 'medication' | 'bath' | 'weight';

export interface Pet {
  id: string;
  name: string;
  avatar: string;
  breed: string;
  birthday: string;
  weight: number;
  createdAt: number;
}

export interface Record {
  id: string;
  petId: string;
  type: RecordType;
  note: string;
  timestamp: number;
  value?: number;
}

export interface TrendData {
  date: string;
  value: number;
}

export interface TrendStats {
  average: number;
  max: number;
  min: number;
  total: number;
}

export type TimeRange = 7 | 30 | 90;
export type TrendMetric = 'weight' | 'walkDuration';

export const RECORD_TYPE_CONFIG: Record<RecordType, { label: string; color: string }> = {
  feeding: { label: '喂食', color: '#e8a87c' },
  walk: { label: '遛弯', color: '#8bc34a' },
  medication: { label: '用药', color: '#e57373' },
  bath: { label: '洗澡', color: '#64b5f6' },
  weight: { label: '体重', color: '#ffb74d' },
};

export type PageType = 'home' | 'records' | 'trend';
