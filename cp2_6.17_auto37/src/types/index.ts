export interface User {
  id: string;
  nickname: string;
  avatar: string;
  bio: string;
  followers: number;
  following: number;
}

export interface ControlPoint {
  time: number;
  temperature: number;
}

export interface FlavorTag {
  id: string;
  name: string;
  selected: boolean;
}

export interface RoastRecord {
  id: string;
  userId: string;
  user: User;
  beanOrigin: string;
  processMethod: string;
  roastLevel: 'light' | 'medium' | 'dark';
  flavorTags: FlavorTag[];
  notes: string;
  controlPoints: ControlPoint[];
  curveImage: string;
  likes: number;
  likedBy: string[];
  createdAt: string;
}

export interface Comment {
  id: string;
  recordId: string;
  userId: string;
  user: User;
  content: string;
  createdAt: string;
}

export interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  loading: boolean;
}
