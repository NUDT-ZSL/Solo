export interface ControlPoint {
  time: number;
  temperature: number;
}

export interface RoastRecord {
  id: string;
  userId: string;
  user?: User;
  beanOrigin: string;
  processMethod: string;
  roastLevel: string;
  flavorTags: string[];
  notes: string;
  controlPoints: ControlPoint[];
  curveImage?: string;
  likes: number;
  likedBy: string[];
  createdAt: string;
}

export interface User {
  id: string;
  username: string;
  avatar: string;
  bio: string;
  followers: number;
  following: number;
}

export interface Comment {
  id: string;
  recordId: string;
  userId: string;
  user?: User;
  content: string;
  createdAt: string;
}

export interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: string;
}
