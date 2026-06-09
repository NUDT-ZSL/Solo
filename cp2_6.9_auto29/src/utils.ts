import type { Activity, TimeOption } from './types';

export function getDayOfWeek(dateStr: string): string {
  const days = ['日', '一', '二', '三', '四', '五', '六'];
  const date = new Date(dateStr);
  return days[date.getDay()];
}

export function getDayClass(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getDay();
  const classMap: Record<number, string> = {
    0: 'day-sun',
    1: 'day-mon',
    2: 'day-tue',
    3: 'day-wed',
    4: 'day-thu',
    5: 'day-fri',
    6: 'day-sat',
  };
  return classMap[day] || 'day-default';
}

export function formatTimestamp(ts: number): string {
  const now = Date.now();
  const diff = now - ts;

  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;

  const date = new Date(ts);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${month}月${day}日 ${hours}:${minutes}`;
}

export function formatDeadline(ts: number): string {
  const date = new Date(ts);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${month}月${day}日 ${hours}:${minutes}`;
}

export function isExpired(ts: number): boolean {
  return Date.now() > ts;
}

export function getMaxVotes(options: TimeOption[]): number {
  return options.reduce((max, opt) => Math.max(max, opt.votes), 0);
}

export function generateUserId(): string {
  const existing = localStorage.getItem('activity_user_id');
  if (existing) return existing;
  const newId = 'u_' + Math.random().toString(36).substring(2, 10);
  localStorage.setItem('activity_user_id', newId);
  return newId;
}

export function getUserName(): string {
  const existing = localStorage.getItem('activity_user_name');
  if (existing) return existing;
  const defaultName = '用户' + Math.floor(Math.random() * 10000);
  localStorage.setItem('activity_user_name', defaultName);
  return defaultName;
}

export function sortByDate(options: TimeOption[]): TimeOption[] {
  return [...options].sort((a, b) => {
    const dateA = new Date(`${a.date}T${a.startTime}`).getTime();
    const dateB = new Date(`${b.date}T${b.startTime}`).getTime();
    return dateA - dateB;
  });
}

export async function fetchActivities(): Promise<Activity[]> {
  const res = await fetch('/api/activities');
  if (!res.ok) throw new Error('获取活动列表失败');
  return res.json();
}

export async function createActivity(data: {
  name: string;
  description: string;
  creator: string;
  deadline: number;
  location: string;
  timeOptions: { date: string; startTime: string; endTime: string; name: string }[];
}): Promise<Activity> {
  const res = await fetch('/api/activity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || '创建活动失败');
  }
  return res.json();
}

export async function submitVote(activityId: string, userId: string, optionIds: string[]): Promise<Activity> {
  const res = await fetch('/api/vote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ activityId, userId, optionIds }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || '投票失败');
  }
  return res.json();
}

export async function submitComment(
  activityId: string,
  userId: string,
  userName: string,
  content: string
): Promise<Activity> {
  const res = await fetch('/api/comment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ activityId, userId, userName, content }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || '评论失败');
  }
  return res.json();
}

export async function getScheduleRecommendation(activityId: string) {
  const res = await fetch('/api/activities/schedule', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ activityId }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || '获取推荐失败');
  }
  return res.json();
}
