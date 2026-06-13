export type GroupId = 'review' | 'developing' | 'testing' | 'done';

export interface Member {
  id: string;
  name: string;
  color: string;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assignee: string;
  group: GroupId;
  tags: string[];
  createdAt: string;
  commentCount: number;
  comments: Comment[];
}

export type GroupMap = {
  [key in GroupId]: string;
};
