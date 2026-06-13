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

export interface LeaderboardItem {
  userId: string;
  username: string;
  avatar: string;
  pages: number;
}

export const getActivities = async (): Promise<Activity[]> => {
  const res = await axios.get('/api/activities');
  return res.data;
};

export const subscribeActivities = (callback: (data: Activity) => void): () => void => {
  const es = new EventSource('/api/activities/stream');
  es.onmessage = (e) => {
    try {
      callback(JSON.parse(e.data));
    } catch {}
  };
  return () => es.close();
};

export const getReadingLogs = async (userId: string): Promise<ReadingLog[]> => {
  const res = await axios.get(`/api/reading-logs/${userId}`);
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

export const getLeaderboard = async (): Promise<LeaderboardItem[]> => {
  const res = await axios.get('/api/leaderboard');
  return res.data;
};
