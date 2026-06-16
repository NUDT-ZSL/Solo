export type Instrument = 'piano' | 'guitar' | 'violin' | 'vocal';

export interface Track {
  id: string;
  title: string;
  composer: string;
  instrument: Instrument;
  difficulty: number;
  duration: number;
  description: string;
}

export interface Student {
  id: string;
  name: string;
  level: number;
  instrument: Instrument;
  avatarColor: string;
}

export interface Feedback {
  id: string;
  studentId: string;
  teacherName: string;
  content: string;
  emoji: '👍' | '💪';
  timestamp: number;
  isNew: boolean;
}

export const instrumentLabels: Record<Instrument, string> = {
  piano: '钢琴',
  guitar: '吉他',
  violin: '小提琴',
  vocal: '声乐',
};

export const instrumentColors: Record<Instrument, string> = {
  piano: '#8B5CF6',
  guitar: '#10B981',
  violin: '#F59E0B',
  vocal: '#EC4899',
};

const API_BASE = '/api';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return await response.json();
}

export async function fetchTracks(instrument?: Instrument): Promise<Track[]> {
  const query = instrument ? `?instrument=${instrument}` : '';
  return request<Track[]>(`/tracks${query}`);
}

export async function fetchStudents(): Promise<Student[]> {
  return request<Student[]>('/students');
}

export async function fetchFeedback(studentId?: string): Promise<Feedback[]> {
  const query = studentId ? `?studentId=${studentId}` : '';
  return request<Feedback[]>(`/feedback${query}`);
}

export async function postFeedback(data: Omit<Feedback, 'id' | 'timestamp' | 'isNew'>): Promise<Feedback> {
  await delay(50);
  return request<Feedback>('/feedback', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function fetchInstrumentColors(): Promise<Record<Instrument, string>> {
  return request<Record<Instrument, string>>('/instrument-colors');
}
