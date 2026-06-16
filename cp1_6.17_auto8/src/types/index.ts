export interface Flavor {
  name: string;
  color: string;
  category: string;
  description: string;
}

export interface CoffeeLog {
  id: string;
  userId: string;
  origin: string;
  beanName: string;
  roast: '浅烘' | '中烘' | '深烘';
  process: '水洗' | '日晒' | '蜜处理' | '厌氧';
  flavors: Flavor[];
  photoUrl: string;
  waterTemp: number;
  grindSize: string;
  brewTime: string;
  notes: string;
  likes: number;
  comments: number;
  createdAt: string;
  beanType?: '浅烘水洗瑰夏' | '深烘日晒曼特宁' | '其他';
}

export interface User {
  id: string;
  username: string;
  avatar: string;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  avatar: string;
  score: number;
  lastChallengeAt: string;
}

export interface ChallengeQuestion {
  optionA: Omit<CoffeeLog, 'userId' | 'origin' | 'beanName' | 'roast' | 'process' | 'photoUrl' | 'likes' | 'comments' | 'createdAt' | 'beanType'>;
  optionB: Omit<CoffeeLog, 'userId' | 'origin' | 'beanName' | 'roast' | 'process' | 'photoUrl' | 'likes' | 'comments' | 'createdAt' | 'beanType'>;
  correctAnswer: 'A' | 'B';
}

export interface ChallengeResult {
  isCorrect: boolean;
  score: number;
  streak: number;
  totalScore: number;
}
