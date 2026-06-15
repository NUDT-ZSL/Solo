export interface VoteOption {
  id: string;
  text: string;
  color: string;
  votes: number;
}

export interface Poll {
  _id?: string;
  title: string;
  options: VoteOption[];
  duration: number;
  status: 'pending' | 'active' | 'closed';
  createdAt: number;
  startedAt?: number;
  closedAt?: number;
}

export interface Comment {
  _id?: string;
  pollId: string;
  text: string;
  createdAt: number;
}

export interface VoteData {
  pollId: string;
  optionId: string;
}

export interface CommentData {
  pollId: string;
  text: string;
}
