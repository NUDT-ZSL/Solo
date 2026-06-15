export interface User {
  id: string;
  name: string;
  avatar: string;
  totalHours: number;
}

export interface Activity {
  id: string;
  userId: string;
  date: string;
  hours: number;
  description: string;
  createdAt: string;
}

export type BadgeType = 'bronze' | 'silver' | 'gold';

export interface Badge {
  id: string;
  userId: string;
  badgeType: BadgeType;
  earnedAt: string;
}

export interface BadgeConfig {
  type: BadgeType;
  name: string;
  minHours: number;
  gradient: string;
  glowColor: string;
}

export const BADGE_CONFIGS: BadgeConfig[] = [
  {
    type: 'bronze',
    name: '铜质徽章',
    minHours: 10,
    gradient: 'linear-gradient(135deg, #CD7F32 0%, #B87333 100%)',
    glowColor: '#CD7F32',
  },
  {
    type: 'silver',
    name: '银质徽章',
    minHours: 50,
    gradient: 'linear-gradient(135deg, #C0C0C0 0%, #A8A8A8 100%)',
    glowColor: '#C0C0C0',
  },
  {
    type: 'gold',
    name: '金质徽章',
    minHours: 100,
    gradient: 'linear-gradient(135deg, #FFD700 0%, #F5A623 100%)',
    glowColor: '#FFD700',
  },
];
