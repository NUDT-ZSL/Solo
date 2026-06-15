export interface User {
  id: number;
  name: string;
  avatar?: string;
}

export interface Group {
  id: number;
  name: string;
  description: string;
  creatorId: number;
  memberCount: number;
  createdAt: string;
}

export interface GroupMember {
  id: number;
  groupId: number;
  userId: number;
  user: User;
  joinedAt: string;
}

export interface Post {
  id: number;
  groupId: number;
  userId: number;
  chapter: string;
  title: string;
  content: string;
  replyCount: number;
  createdAt: string;
  author: User;
}

export interface Reply {
  id: number;
  postId: number;
  userId: number;
  content: string;
  createdAt: string;
  author: User;
}

export interface BookRecommendation {
  id: number;
  userId: number;
  bookTitle: string;
  bookAuthor: string;
  bookCover?: string;
  reason: string;
  score: number;
  createdAt: string;
}

export interface ReadingListItem {
  id: number;
  userId: number;
  bookTitle: string;
  bookAuthor: string;
  doubanUrl: string;
  addedAt: string;
}

export interface HotPost extends Post {
  isHot: boolean;
}

export interface UserBehavior {
  userId: number;
  postCount: number;
  replyCount: number;
  likeCount: number;
  tags: string[];
}

export interface Book {
  id: string;
  title: string;
  author: string;
  cover: string;
  tags: string[];
  description: string;
}
