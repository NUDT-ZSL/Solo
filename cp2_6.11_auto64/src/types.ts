
export interface ScentItem {
  name: string;
  key: string;
  value: number;
  color: string;
  warm: boolean;
}

export interface ScentCard {
  id: string;
  title: string;
  description: string;
  imageData?: string;
  scents: ScentItem[];
  createdAt: number;
}

export const BASE_SCENTS: Omit<ScentItem, 'value'>[] = [
  { name: '玫瑰', key: 'rose', color: '#FF6BCB', warm: true },
  { name: '檀木', key: 'sandalwood', color: '#8B5A2B', warm: true },
  { name: '海盐', key: 'seaSalt', color: '#B0E0E6', warm: false },
  { name: '松针', key: 'pine', color: '#228B22', warm: false },
  { name: '焚香', key: 'incense', color: '#A0522D', warm: true }
];

export function createDefaultScents(): ScentItem[] {
  return BASE_SCENTS.map(s => ({ ...s, value: 0 }));
}

export function getTotalScentsValue(scents: ScentItem[]): number {
  return scents.reduce((sum, s) => sum + s.value, 0);
}
