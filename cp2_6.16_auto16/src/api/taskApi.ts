export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Member {
  id: string;
  family_id: string;
  name: string;
  avatar: string;
  points: number;
}

export interface Task {
  id: string;
  family_id: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  points: number;
  claimed_by: string | null;
  completed: boolean;
}

export interface Family {
  id: string;
  name: string;
  created_at: string;
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

export async function createFamily(
  name: string,
  members: { name: string; avatar: string }[]
): Promise<{ family: Family; tasks: Task[]; rewards: any[] }> {
  return request<{ family: Family; tasks: Task[]; rewards: any[] }>('/family', {
    method: 'POST',
    body: JSON.stringify({ name, members }),
  });
}

export async function claimTask(
  taskId: string,
  memberId: string,
  familyId: string
): Promise<Task> {
  return request<Task>('/task/claim', {
    method: 'POST',
    body: JSON.stringify({ taskId, memberId, familyId }),
  });
}

export async function completeTask(
  taskId: string,
  familyId: string
): Promise<{ task: Task; member: Member }> {
  return request<{ task: Task; member: Member }>('/task/complete', {
    method: 'POST',
    body: JSON.stringify({ taskId, familyId }),
  });
}

export async function getFamilyDetails(
  familyId: string
): Promise<{ family: Family; members: Member[]; tasks: Task[]; rewards: any[] }> {
  return request<{ family: Family; members: Member[]; tasks: Task[]; rewards: any[] }>(
    `/family/${familyId}`
  );
}

export async function getFamilyMembers(familyId: string): Promise<Member[]> {
  return request<Member[]>(`/family/${familyId}/members`);
}
