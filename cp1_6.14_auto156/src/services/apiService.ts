import { User, Skill, ExchangeRequest, Review, ExchangeRecord } from '../types';

const BASE_URL = '/api';

interface SkillWithUser extends Skill {
  user: User;
}

interface RequestWithDetails extends ExchangeRequest {
  fromUser?: User;
  toUser?: User;
  fromSkill?: Skill;
  toSkill?: Skill;
}

interface ReviewWithUser extends Review {
  fromUser?: User;
}

export const apiService = {
  getCurrentUser: (): Promise<User> =>
    fetch(`${BASE_URL}/user/current`).then(res => res.json()),

  getUsers: (search?: string): Promise<User[]> =>
    fetch(`${BASE_URL}/users${search ? `?search=${encodeURIComponent(search)}` : ''}`).then(res => res.json()),

  getUserById: (id: string): Promise<User> =>
    fetch(`${BASE_URL}/users/${id}`).then(res => res.json()),

  getSkills: (search?: string): Promise<SkillWithUser[]> =>
    fetch(`${BASE_URL}/skills${search ? `?search=${encodeURIComponent(search)}` : ''}`).then(res => res.json()),

  getSkillById: (id: string): Promise<SkillWithUser> =>
    fetch(`${BASE_URL}/skills/${id}`).then(res => res.json()),

  getRequests: (userId?: string): Promise<RequestWithDetails[]> =>
    fetch(`${BASE_URL}/requests${userId ? `?userId=${userId}` : ''}`).then(res => res.json()),

  createRequest: (data: {
    fromUserId: string;
    toUserId: string;
    fromSkillId: string;
    toSkillId: string;
    proposedHours: number;
    message?: string;
  }): Promise<ExchangeRequest> =>
    fetch(`${BASE_URL}/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(res => res.json()),

  updateRequest: (id: string, data: {
    status?: string;
    proposedHours?: number;
    message?: string;
  }): Promise<ExchangeRequest> =>
    fetch(`${BASE_URL}/requests/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(res => res.json()),

  getReviews: (skillId?: string, userId?: string): Promise<ReviewWithUser[]> =>
    fetch(`${BASE_URL}/reviews?${skillId ? `skillId=${skillId}` : ''}${userId ? `&userId=${userId}` : ''}`).then(res => res.json()),

  createReview: (data: {
    fromUserId: string;
    toUserId: string;
    skillId: string;
    rating: number;
    comment: string;
  }): Promise<Review> =>
    fetch(`${BASE_URL}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(res => res.json()),

  getRecords: (userId?: string): Promise<ExchangeRecord[]> =>
    fetch(`${BASE_URL}/records${userId ? `?userId=${userId}` : ''}`).then(res => res.json()),
};
