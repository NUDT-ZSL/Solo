import type { Book, User, Activity, Comment } from '../types';

const BASE_URL = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers
    },
    ...options
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: '请求失败' }));
    throw new Error(error.error || '请求失败');
  }
  return response.json();
}

export function getBooks(search?: string): Promise<Book[]> {
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  return request<Book[]>(`/books${query}`);
}

export function getBook(id: string): Promise<Book> {
  return request<Book>(`/books/${id}`);
}

export function addBook(data: Partial<Book>): Promise<Book> {
  return request<Book>('/books', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export function reserveBook(bookId: string, userId: string) {
  return request(`/books/${bookId}/reserve`, {
    method: 'POST',
    body: JSON.stringify({ userId })
  });
}

export function addComment(
  bookId: string,
  userId: string,
  nickname: string,
  content: string
): Promise<Comment> {
  return request<Comment>(`/books/${bookId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ userId, nickname, content })
  });
}

export function getActivities(): Promise<Activity[]> {
  return request<Activity[]>('/activities');
}

export function registerActivity(activityId: string, userId: string) {
  return request(`/activities/${activityId}/register`, {
    method: 'POST',
    body: JSON.stringify({ userId })
  });
}

export function login(email: string, password: string): Promise<User> {
  return request<User>('/users/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
}

export function register(
  nickname: string,
  email: string,
  password: string
): Promise<User> {
  return request<User>('/users/register', {
    method: 'POST',
    body: JSON.stringify({ nickname, email, password })
  });
}

export function getUser(id: string): Promise<User> {
  return request<User>(`/users/${id}`);
}
