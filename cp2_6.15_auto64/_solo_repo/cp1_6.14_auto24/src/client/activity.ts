import axios from 'axios';

export interface Activity {
  _id: string;
  type: 'complete_book' | 'vote_book' | 'announcement' | 'add_book' | 'new_vote';
  userId: string;
  username: string;
  avatar: string;
  bookId?: string;
  bookTitle?: string;
  content?: string;
  createdAt: number;
}

export interface ReadingLog {
  _id: string;
  userId: string;
  date: string;
  pages: number;
  minutes: number;
  note: string;
  createdAt: number;
}

export interface CalendarCell {
  minutes: number;
  pages: number;
  intensity: number;
}

export interface CalendarData {
  [date: string]: CalendarCell;
}

export interface TrendPoint {
  date: string;
  minutes: number;
  pages: number;
}

export interface LeaderboardItem {
  rank: number;
  userId: string;
  username: string;
  avatar: string;
  pages: number;
  minutes: number;
  medal: '' | 'gold' | 'silver' | 'bronze';
}

export interface Leaderboard {
  board: LeaderboardItem[];
  stats: {
    members: number;
    books: number;
    totalPages: number;
  };
}

export const getActivities = async (): Promise<Activity[]> => {
  const res = await axios.get('/api/activities');
  return res.data;
};

export const subscribeActivities = (callback: (data: Activity) => void): (() => void) => {
  const es = new EventSource('/api/activities/stream');
  es.onmessage = (e) => {
    try {
      callback(JSON.parse(e.data));
    } catch {}
  };
  return () => es.close();
};

export const getReadingCalendar = async (userId: string): Promise<CalendarData> => {
  const res = await axios.get(`/api/reading-calendar/${userId}`);
  return res.data;
};

export const getReadingLogs = async (userId: string): Promise<ReadingLog[]> => {
  const res = await axios.get(`/api/reading-logs/${userId}`);
  return res.data;
};

export const getReadingTrend = async (userId: string): Promise<TrendPoint[]> => {
  const res = await axios.get(`/api/reading-trend/${userId}`);
  return res.data;
};

export const saveReadingLog = async (log: {
  userId: string;
  date: string;
  pages: number;
  minutes: number;
  note: string;
}): Promise<ReadingLog> => {
  const res = await axios.post('/api/reading-logs', log);
  return res.data;
};

export const getLeaderboard = async (): Promise<Leaderboard> => {
  const res = await axios.get('/api/leaderboard');
  return res.data;
};

export const postAnnouncement = async (data: {
  userId: string;
  username: string;
  avatar: string;
  content: string;
}): Promise<Activity> => {
  const res = await axios.post('/api/announcements', data);
  return res.data;
};
