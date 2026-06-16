export interface User {
  id: string;
  username: string;
  email: string;
  password: string;
  registeredWorkshops: string[];
  attendedWorkshops: string[];
  skills: Record<string, { level: number; exp: number }>;
}

export interface Workshop {
  id: string;
  title: string;
  date: string;
  location: string;
  maxParticipants: number;
  materials: string;
  participants: string[];
  hostId: string;
  category: string;
  submissions: { userId: string; photo: string }[];
}

export interface AuthResponse {
  success: boolean;
  userId?: string;
  message?: string;
  user?: Omit<User, 'password'>;
}

export type SkillCategory = 'carpentry' | 'pottery' | 'weaving' | 'embroidery' | 'leathercraft' | 'papercraft';

export const SKILL_CATEGORIES: { key: SkillCategory; name: string; icon: string }[] = [
  { key: 'carpentry', name: '木工', icon: '🪵' },
  { key: 'pottery', name: '陶艺', icon: '🏺' },
  { key: 'weaving', name: '编织', icon: '🧶' },
  { key: 'embroidery', name: '刺绣', icon: '🪡' },
  { key: 'leathercraft', name: '皮具', icon: '👜' },
  { key: 'papercraft', name: '纸艺', icon: '✂️' },
];
