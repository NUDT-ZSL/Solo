export interface Book {
  id: string;
  title: string;
  author: string;
  color: string;
  description: string;
}

export interface Review {
  id: string;
  bookId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  rating: number;
  comment: string;
  timestamp: number;
  likes: number;
}

export interface ReviewFilter {
  bookId?: string;
  ratings?: number[];
  sortBy?: 'latest' | 'hottest';
}

const API_BASE = '/api';

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function request<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}

export async function getBooks(): Promise<Book[]> {
  const delayMs = 300 + Math.random() * 500;
  await delay(delayMs);
  return request<Book[]>(`${API_BASE}/books`);
}

export async function getReviews(filter?: ReviewFilter): Promise<Review[]> {
  const delayMs = 300 + Math.random() * 500;
  await delay(delayMs);
  
  const params = new URLSearchParams();
  if (filter?.bookId) params.append('bookId', filter.bookId);
  if (filter?.ratings && filter.ratings.length > 0) {
    params.append('ratings', filter.ratings.join(','));
  }
  if (filter?.sortBy) params.append('sortBy', filter.sortBy);
  
  return request<Review[]>(`${API_BASE}/reviews?${params.toString()}`);
}

export async function likeReview(reviewId: string, liked: boolean): Promise<Review | null> {
  const delayMs = 200 + Math.random() * 300;
  await delay(delayMs);
  
  const response = await fetch(`${API_BASE}/reviews/${reviewId}/like`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ liked }),
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
}
