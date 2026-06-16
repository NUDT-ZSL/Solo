export interface Participant {
  id: string;
  name: string;
  phone: string;
  registeredAt: string;
  checkedIn: boolean;
  checkedInAt: string | null;
}

export interface EventItem {
  id: string;
  title: string;
  date: string;
  description: string;
  maxParticipants: number;
  participants: Participant[];
}

export interface EventStat {
  id: string;
  title: string;
  date: string;
  maxParticipants: number;
  registeredCount: number;
  checkedInCount: number;
  registrationRate: number;
  checkInRate: number;
}

async function handleResponse<T>(response: Response): Promise<T | { error: string }> {
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    return { error: data.error || `请求失败 (${response.status})` };
  }
  return response.json();
}

export async function getEvents(): Promise<EventItem[] | { error: string }> {
  try {
    const res = await fetch('/api/events');
    return handleResponse<EventItem[]>(res);
  } catch {
    return { error: '网络错误，无法获取活动列表' };
  }
}

export async function getEvent(id: string): Promise<EventItem | { error: string }> {
  try {
    const res = await fetch(`/api/events/${id}`);
    return handleResponse<EventItem>(res);
  } catch {
    return { error: '网络错误，无法获取活动详情' };
  }
}

export async function createEvent(data: {
  title: string;
  date: string;
  description: string;
  maxParticipants: number;
}): Promise<EventItem | { error: string }> {
  try {
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<EventItem>(res);
  } catch {
    return { error: '网络错误，无法创建活动' };
  }
}

export async function updateEvent(
  id: string,
  data: Partial<Pick<EventItem, 'title' | 'date' | 'description' | 'maxParticipants'>>
): Promise<EventItem | { error: string }> {
  try {
    const res = await fetch(`/api/events/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<EventItem>(res);
  } catch {
    return { error: '网络错误，无法更新活动' };
  }
}

export async function deleteEvent(id: string): Promise<{ success: boolean } | { error: string }> {
  try {
    const res = await fetch(`/api/events/${id}`, {
      method: 'DELETE',
    });
    return handleResponse<{ success: boolean }>(res);
  } catch {
    return { error: '网络错误，无法删除活动' };
  }
}

export async function registerEvent(
  id: string,
  name: string,
  phone: string
): Promise<{ success: boolean; participant: Participant } | { error: string }> {
  try {
    const res = await fetch(`/api/events/${id}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone }),
    });
    return handleResponse<{ success: boolean; participant: Participant }>(res);
  } catch {
    return { error: '网络错误，无法报名' };
  }
}

export async function checkInEvent(
  id: string,
  phone: string
): Promise<{ success: boolean; participant: Participant } | { error: string }> {
  try {
    const res = await fetch(`/api/events/${id}/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    return handleResponse<{ success: boolean; participant: Participant }>(res);
  } catch {
    return { error: '网络错误，无法签到' };
  }
}

export async function getStats(): Promise<EventStat[] | { error: string }> {
  try {
    const res = await fetch('/api/events/stats');
    return handleResponse<EventStat[]>(res);
  } catch {
    return { error: '网络错误，无法获取统计数据' };
  }
}

export async function exportEventCSV(id: string): Promise<void> {
  window.location.href = `/api/events/${id}/export`;
}
