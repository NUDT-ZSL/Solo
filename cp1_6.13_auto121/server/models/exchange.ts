export type ExchangeStatus = 'pending' | 'confirmed' | 'rejected' | 'completed';

export interface ExchangeDoc {
  _id?: string;
  fromUserId: string;
  fromUserName: string;
  fromUserAvatar: string;
  toUserId: string;
  toUserName: string;
  skillId: string;
  skillTitle: string;
  offeredSkillTitle: string;
  description: string;
  slotId: string;
  slotDate: string;
  slotStart: string;
  slotEnd: string;
  status: ExchangeStatus;
  createdAt: number;
}
