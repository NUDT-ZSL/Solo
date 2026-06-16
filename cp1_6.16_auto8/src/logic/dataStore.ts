import type { WeeklyPlan } from './planGenerator';

const STORAGE_KEYS = {
  COMPLETED_TASKS: 'mpp_completed_tasks',
  DAILY_RECORD: 'mpp_daily_record',
  WEEKLY_PLAN: 'mpp_weekly_plan',
  SELECTED_TRACKS: 'mpp_selected_tracks',
  USER_PREFERENCES: 'mpp_user_prefs',
  VIEWED_FEEDBACK: 'mpp_viewed_feedback',
};

export interface UserPreferences {
  studentId: string;
  userLevel: number;
  instrument: string;
  dailyMinutes: number;
  preference: 'easy' | 'moderate' | 'challenge';
}

const safeParse = <T>(value: string | null, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

export function getCompletedTasks(): Set<string> {
  const data = localStorage.getItem(STORAGE_KEYS.COMPLETED_TASKS);
  const arr = safeParse<string[]>(data, []);
  return new Set(arr);
}

export function saveCompletedTasks(ids: Set<string>): void {
  localStorage.setItem(STORAGE_KEYS.COMPLETED_TASKS, JSON.stringify(Array.from(ids)));
}

export function addCompletedTask(id: string): Set<string> {
  const set = getCompletedTasks();
  set.add(id);
  saveCompletedTasks(set);
  return set;
}

export function removeCompletedTask(id: string): Set<string> {
  const set = getCompletedTasks();
  set.delete(id);
  saveCompletedTasks(set);
  return set;
}

export function toggleCompletedTask(id: string): { completed: boolean; set: Set<string> } {
  const set = getCompletedTasks();
  const exists = set.has(id);
  if (exists) {
    set.delete(id);
  } else {
    set.add(id);
  }
  saveCompletedTasks(set);
  return { completed: !exists, set };
}

export function getDailyRecord(): Record<string, number> {
  const data = localStorage.getItem(STORAGE_KEYS.DAILY_RECORD);
  return safeParse<Record<string, number>>(data, {});
}

export function saveDailyRecord(record: Record<string, number>): void {
  localStorage.setItem(STORAGE_KEYS.DAILY_RECORD, JSON.stringify(record));
}

export function addDailyMinutes(date: string, minutes: number): Record<string, number> {
  const record = getDailyRecord();
  record[date] = (record[date] || 0) + minutes;
  saveDailyRecord(record);
  return record;
}

export function incrementTracksCompleted(date: string): Record<string, number> {
  const record = getDailyRecord();
  const key = `tracks_${date}`;
  record[key] = (record[key] || 0) + 1;
  saveDailyRecord(record);
  return record;
}

export function getWeeklyPlan(): WeeklyPlan | null {
  const data = localStorage.getItem(STORAGE_KEYS.WEEKLY_PLAN);
  return safeParse<WeeklyPlan | null>(data, null);
}

export function saveWeeklyPlan(plan: WeeklyPlan): void {
  localStorage.setItem(STORAGE_KEYS.WEEKLY_PLAN, JSON.stringify(plan));
}

export function clearWeeklyPlan(): void {
  localStorage.removeItem(STORAGE_KEYS.WEEKLY_PLAN);
}

export function getSelectedTrackIds(): string[] {
  const data = localStorage.getItem(STORAGE_KEYS.SELECTED_TRACKS);
  return safeParse<string[]>(data, []);
}

export function saveSelectedTrackIds(ids: string[]): void {
  localStorage.setItem(STORAGE_KEYS.SELECTED_TRACKS, JSON.stringify(ids));
}

export function getUserPreferences(): UserPreferences | null {
  const data = localStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
  return safeParse<UserPreferences | null>(data, null);
}

export function saveUserPreferences(prefs: UserPreferences): void {
  localStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(prefs));
}

export function getViewedFeedbackIds(): Set<string> {
  const data = localStorage.getItem(STORAGE_KEYS.VIEWED_FEEDBACK);
  const arr = safeParse<string[]>(data, []);
  return new Set(arr);
}

export function markFeedbackViewed(id: string): Set<string> {
  const set = getViewedFeedbackIds();
  set.add(id);
  localStorage.setItem(STORAGE_KEYS.VIEWED_FEEDBACK, JSON.stringify(Array.from(set)));
  return set;
}

export function clearAllData(): void {
  Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
}
