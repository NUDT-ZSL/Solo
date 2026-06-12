import { v4 as uuidv4 } from 'uuid';

export type Sentiment = 'positive' | 'neutral' | 'negative';

export interface Feedback {
  id: string;
  title: string;
  description: string;
  sentiment: Sentiment;
  username: string;
  avatarColor: string;
  timestamp: number;
  reply: string | null;
  screenshots: string[];
  isHandled: boolean;
  isUrgent: boolean;
}

const STORAGE_KEY = 'feedbackflow_data';

export function getFeedbacks(): Feedback[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveFeedbacks(feedbacks: Feedback[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(feedbacks));
}

export function addFeedback(feedback: Omit<Feedback, 'id' | 'timestamp' | 'username' | 'avatarColor' | 'reply' | 'isHandled'>): Feedback {
  const feedbacks = getFeedbacks();
  const newFeedback: Feedback = {
    ...feedback,
    id: uuidv4(),
    timestamp: Date.now(),
    username: generateRandomUsername(),
    avatarColor: generateRandomColor(),
    reply: null,
    isHandled: false,
  };
  feedbacks.unshift(newFeedback);
  saveFeedbacks(feedbacks);
  return newFeedback;
}

export function updateFeedback(id: string, updates: Partial<Feedback>): Feedback | null {
  const feedbacks = getFeedbacks();
  const index = feedbacks.findIndex(f => f.id === id);
  if (index === -1) return null;
  feedbacks[index] = { ...feedbacks[index], ...updates };
  saveFeedbacks(feedbacks);
  return feedbacks[index];
}

export function deleteFeedback(id: string): boolean {
  const feedbacks = getFeedbacks();
  const filtered = feedbacks.filter(f => f.id !== id);
  if (filtered.length === feedbacks.length) return false;
  saveFeedbacks(filtered);
  return true;
}

function generateRandomUsername(): string {
  const adjectives = ['快乐的', '认真的', '热情的', '细心的', '友好的', '活泼的', '沉稳的', '机智的', '勇敢的', '温柔的'];
  const nouns = ['小明', '小红', '小华', '小李', '小王', '小张', '小陈', '小林', '小周', '小吴'];
  return adjectives[Math.floor(Math.random() * adjectives.length)] + nouns[Math.floor(Math.random() * nouns.length)];
}

function generateRandomColor(): string {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'];
  return colors[Math.floor(Math.random() * colors.length)];
}

export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 30) return `${days}天前`;
  return new Date(timestamp).toLocaleDateString('zh-CN');
}
