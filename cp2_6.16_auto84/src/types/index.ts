export interface Plant {
  id: string;
  name: string;
  x: number;
  y: number;
  adopted: boolean;
  adoptedBy: string | null;
  adoptedByName?: string | null;
  adoptedAt: string | null;
  growthScore: number;
  description: string;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
}

export interface Diary {
  id: string;
  plantId: string;
  userId: string;
  userName: string;
  content: string;
  image: string | null;
  likes: number;
  likedBy: string[];
  comments: Comment[];
  createdAt: string;
  growthIncrease: number;
}
