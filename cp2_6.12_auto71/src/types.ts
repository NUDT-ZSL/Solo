export interface User {
  id: string;
  name: string;
  avatar: string;
  avatarBorder: string;
}

export interface BookClub {
  id: string;
  name: string;
  description: string;
  date: string;
  time: string;
  location: string;
  coverBg: string;
  coverIcon: string;
  registeredCount: number;
  registeredUsers: User[];
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  rating: number;
  content: string;
  createdAt: string;
}

export interface BookCandidate {
  id: string;
  title: string;
  author: string;
  coverBg: string;
  votes: number;
}

export interface ReviewsResponse {
  reviews: Review[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface CurrentUser {
  id: string;
  name: string;
  avatar: string;
  avatarBorder: string;
}
