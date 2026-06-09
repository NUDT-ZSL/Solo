export type BottleColor = 'red' | 'blue' | 'green' | 'purple' | 'gold';

export interface Bottle {
  id: string;
  message: string | null;
  unlockDate: string;
  color: BottleColor;
  createdAt: string;
  isUnlocked: boolean;
}

export interface BottleListItem {
  id: string;
  unlockDate: string;
  color: BottleColor;
  createdAt: string;
  isUnlocked: boolean;
}

export interface OpenedRecord {
  id: string;
  summary: string;
  openedAt: string;
}

export interface Stats {
  lockedCount: number;
  totalCount: number;
  recentOpened: OpenedRecord[];
}

export interface CreateBottleRequest {
  message: string;
  unlockDate: string;
  color: BottleColor;
}

export interface CreateBottleResponse {
  id: string;
}

export const COLOR_MAP: Record<BottleColor, { hex: string; name: string }> = {
  red: { hex: '#E63946', name: '珊瑚红' },
  blue: { hex: '#457B9D', name: '深海蓝' },
  green: { hex: '#2A9D8F', name: '翡翠绿' },
  purple: { hex: '#7B2CBF', name: '梦幻紫' },
  gold: { hex: '#D4A373', name: '流沙金' },
};
