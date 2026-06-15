import axios from 'axios';

export interface TimeSlot {
  id: string;
  date: string;
  start: string;
  end: string;
  booked: boolean;
}

export interface Skill {
  _id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  title: string;
  description: string;
  availableSlots: TimeSlot[];
  createdAt: number;
}

export type ExchangeStatus = 'pending' | 'confirmed' | 'rejected' | 'completed';

export interface Exchange {
  _id: string;
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

export interface Review {
  _id: string;
  exchangeId: string;
  skillId: string;
  fromUserId: string;
  fromUserName?: string;
  fromUserAvatar?: string;
  toUserId: string;
  rating: number;
  comment: string;
  anonymous: boolean;
  createdAt: number;
}

export interface Me {
  id: string;
  name: string;
  avatar: string;
}

const request = axios.create({
  baseURL: '/api',
  timeout: 8000,
});

export const fetchSkills = (): Promise<Skill[]> =>
  request.get('/skills').then((r) => r.data);

export const fetchSkillDetail = (id: string): Promise<Skill> =>
  request.get(`/skills/${id}`).then((r) => r.data);

export const fetchMySkills = (userId: string): Promise<Skill[]> =>
  request.get(`/skills/user/${userId}`).then((r) => r.data);

export const createSkill = (payload: Partial<Skill>): Promise<Skill> =>
  request.post('/skills', payload).then((r) => r.data);

export const fetchExchanges = (userId?: string): Promise<Exchange[]> =>
  request
    .get('/exchanges', { params: userId ? { userId } : {} })
    .then((r) => r.data);

export interface CreateExchangePayload {
  fromUserId: string;
  fromUserName: string;
  fromUserAvatar: string;
  skillId: string;
  slotId: string;
  offeredSkillTitle: string;
  description: string;
}

export const createExchange = (payload: CreateExchangePayload): Promise<Exchange> =>
  request.post('/exchanges', payload).then((r) => r.data);

export const confirmExchange = (id: string): Promise<Exchange> =>
  request.post(`/exchanges/${id}/confirm`).then((r) => r.data);

export const rejectExchange = (id: string): Promise<Exchange> =>
  request.post(`/exchanges/${id}/reject`).then((r) => r.data);

export const completeExchange = (id: string): Promise<Exchange> =>
  request.post(`/exchanges/${id}/complete`).then((r) => r.data);

export const fetchReviews = (params?: { skillId?: string; userId?: string }): Promise<Review[]> =>
  request.get('/reviews', { params }).then((r) => r.data);

export interface SubmitReviewPayload {
  exchangeId: string;
  skillId: string;
  fromUserId: string;
  fromUserName?: string;
  fromUserAvatar?: string;
  toUserId: string;
  rating: number;
  comment: string;
  anonymous: boolean;
}

export const submitReview = (payload: SubmitReviewPayload): Promise<Review> =>
  request.post('/reviews', payload).then((r) => r.data);

export const fetchMe = (): Promise<Me> =>
  request.get('/me').then((r) => r.data);

export function computeAvgRating(reviews: Review[]): number {
  if (!reviews.length) return 0;
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  return Math.round((sum / reviews.length) * 10 / 10;
}
