export interface Project {
  id: string;
  name: string;
  thumbnail?: string;
  gridCols: number;
  gridRows: number;
  createdAt: number;
  updatedAt: number;
}

export interface Frame {
  id: string;
  projectId: string;
  order: number;
  imageUrl?: string;
  gridX: number;
  gridY: number;
  width: number;
  height: number;
}

export interface DialogBubble {
  id: string;
  frameId: string;
  type: 'dialog' | 'sound';
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  tailDirection: 'left' | 'right' | 'top' | 'bottom';
}

export interface Comment {
  id: string;
  frameId: string;
  userId: string;
  userName: string;
  avatar: string;
  rating: number;
  content: string;
  createdAt: number;
}

export interface WSNewComment {
  type: 'NEW_COMMENT';
  frameId: string;
  comment: Comment;
  count: number;
}
