export type ShapeType = 'rectangle' | 'circle' | 'triangle' | 'star';

export interface ShapeData {
  id: string;
  type: ShapeType;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
  radius?: number;
  color: string;
  rotation: number;
  opacity: number;
}

export interface Comment {
  id: string;
  content: string;
  timestamp: number;
}

export interface Inspiration {
  id: string;
  shape: ShapeData;
  upVotes: number;
  downVotes: number;
  votedIps: Record<string, 'up' | 'down'>;
  comments: Comment[];
  timestamp: number;
}

export interface VoteRequest {
  id: string;
  type: 'up' | 'down';
}

export interface CommentRequest {
  id: string;
  content: string;
}
