import type { Member } from './taskApi';

export type RewardType = 'physical' | 'virtual';

export interface Reward {
  id: string;
  family_id: string;
  title: string;
  description: string;
  points_cost: number;
  type: RewardType;
  image_url: string | null;
}

const BASE_URL = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    let errorMessage = `HTTP error! status: ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData?.error) {
        errorMessage = errorData.error;
      }
    } catch {
      // ignore parse error
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function redeemReward(
  rewardId: string,
  memberId: string,
  familyId: string
): Promise<{ reward: Reward; member: Member }> {
  return request<{ reward: Reward; member: Member }>(
    '/reward/redeem',
    {
      method: 'POST',
      body: JSON.stringify({ rewardId, memberId, familyId }),
    }
  );
}

export async function getFamilyMembers(familyId: string): Promise<Member[]> {
  return request<Member[]>(`/family/${familyId}/members`);
}
