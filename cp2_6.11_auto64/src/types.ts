
export interface ScentRatio {
  rose: number;
  sandalwood: number;
  seaSalt: number;
  pine: number;
  incense: number;
}

export interface ScentCard {
  id: string;
  title: string;
  description: string;
  imageData?: string;
  scentRatios: ScentRatio;
  createdAt: number;
}

export interface BaseScent {
  name: string;
  key: keyof ScentRatio;
  color: string;
  warm: boolean;
}

export const BASE_SCENTS: BaseScent[] = [
  { name: '玫瑰', key: 'rose', color: '#FF6BCB', warm: true },
  { name: '檀木', key: 'sandalwood', color: '#8B5A2B', warm: true },
  { name: '海盐', key: 'seaSalt', color: '#B0E0E6', warm: false },
  { name: '松针', key: 'pine', color: '#228B22', warm: false },
  { name: '焚香', key: 'incense', color: '#A0522D', warm: true }
];
