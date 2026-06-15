export interface User {
  id: string;
  name: string;
  avatar: string;
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  status: 'in_progress' | 'ended';
  participants: string[];
  unreadComments: number;
}

export interface Vote {
  id: string;
  proposalId: string;
  userId: string;
  voteType: 'approve' | 'reject' | 'abstain';
  createdAt: string;
}

export interface Proposal {
  id: string;
  meetingId: string;
  title: string;
  summary: string;
  coverImage: string;
  createdAt: string;
  votes?: Vote[];
}

export interface Comment {
  id: string;
  proposalId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  parentId: string | null;
  createdAt: string;
}

export interface VoteStats {
  approve: number;
  reject: number;
  abstain: number;
}

export interface MeetingSummary {
  proposalId: string;
  title: string;
  votes: VoteStats;
  commentCount: number;
}
