export interface CommentData {
  id: string;
  userId: string;
  nickname: string;
  content: string;
  createdAt: number;
}

export interface TreeData {
  id: string;
  userId: string;
  nickname: string;
  x: number;
  y: number;
  moodColor: string;
  text: string;
  streakDays: number;
  createdAt: number;
  likes: number;
  likedUsers: { [userId: string]: string };
  comments: CommentData[];
}

export type SaveTreeRequest = Omit<TreeData, 'id' | 'createdAt' | 'likes' | 'likedUsers' | 'comments'>;
export interface SaveTreeResponse {
  success: boolean;
  tree?: TreeData;
  occupied: boolean;
  newX?: number;
  newY?: number;
}
export type GetTreesResponse = { trees: TreeData[] };
export interface LikeRequest {
  treeId: string;
  userId: string;
}
export interface LikeResponse {
  success: boolean;
  likes: number;
  alreadyLiked: boolean;
}
export interface CommentRequest {
  treeId: string;
  userId: string;
  nickname: string;
  content: string;
}
export interface CommentResponse {
  success: boolean;
  comment?: CommentData;
}

export interface LocalUserState {
  userId: string;
  nickname: string;
  streakDays: number;
  lastRecordDate: string;
  myTreeIds: string[];
}

export const MOOD_COLORS = [
  { name: '快乐', value: '#FFD700' },
  { name: '平静', value: '#4FC3F7' },
  { name: '忧伤', value: '#9575CD' },
  { name: '愤怒', value: '#EF5350' },
  { name: '惊喜', value: '#FF7043' },
  { name: '满足', value: '#81C784' },
  { name: '焦虑', value: '#FFB74D' },
  { name: '孤独', value: '#90A4AE' },
];
