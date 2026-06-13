import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  timeout: 5000,
});

export interface Book {
  _id: string;
  title: string;
  author: string;
  coverColor: string;
  progress: number;
  totalPages: number;
}

export interface Note {
  _id: string;
  bookId: string;
  userId: string;
  userName: string;
  userAvatarColor: string;
  content: string;
  quote: string;
  createdAt: number;
}

export interface Member {
  _id: string;
  nickname: string;
  avatarColor: string;
  bookStatuses?: Record<string, MemberStatus>;
  status?: MemberStatus;
}

export type MemberStatus = 'unread' | 'reading' | 'read';

export interface Reminder {
  _id: string;
  userId: string;
  userName: string;
  bookId: string;
  bookTitle: string;
  createdAt: number;
}

export const booksApi = {
  list: () => api.get<Book[]>('/books').then((r) => r.data),
  get: (id: string) => api.get<Book>(`/books/${id}`).then((r) => r.data),
  getNotes: (id: string) => api.get<Note[]>(`/books/${id}/notes`).then((r) => r.data),
  addNote: (id: string, data: { userId: string; content: string; quote?: string }) =>
    api.post<Note>(`/books/${id}/notes`, data).then((r) => r.data),
  getMembers: (id: string) => api.get<Member[]>(`/books/${id}/members`).then((r) => r.data),
};

export const membersApi = {
  list: () => api.get<Member[]>('/members').then((r) => r.data),
  updateStatus: (userId: string, bookId: string, status: MemberStatus) =>
    api.patch(`/members/${userId}/status`, { bookId, status }).then((r) => r.data),
};

export const remindersApi = {
  list: () => api.get<Reminder[]>('/reminders').then((r) => r.data),
  create: (userId: string, bookId: string) =>
    api.post<Reminder>('/reminders', { userId, bookId }).then((r) => r.data),
};
