export type SkillLevel = '初级' | '中级' | '高级';

export interface Skill {
  id: string;
  name: string;
  level: SkillLevel;
  description: string;
  userId: string;
  availableSlots: boolean[][];
  avgRating: number;
  reviewCount: number;
}

export interface User {
  id: string;
  nickname: string;
  avatar: string;
  skills: Skill[];
}

export type RequestStatus = 'pending' | 'accepted' | 'rejected' | 'modified' | 'confirmed' | 'completed';

export interface ExchangeRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  fromSkillId: string;
  toSkillId: string;
  proposedHours: number;
  status: RequestStatus;
  message: string;
  createdAt: string;
  scheduledSlot?: { day: number; hour: number };
}

export interface Review {
  id: string;
  fromUserId: string;
  toUserId: string;
  skillId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface ExchangeRecord {
  id: string;
  requestId: string;
  fromUserId: string;
  toUserId: string;
  fromSkillId: string;
  toSkillId: string;
  hours: number;
  status: 'scheduled' | 'completed' | 'cancelled';
  scheduledTime: string;
}
