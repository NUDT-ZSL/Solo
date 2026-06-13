import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000
});

export interface Photo {
  _id: string;
  title: string;
  category: 'portrait' | 'landscape' | 'street' | 'still';
  description: string;
  imageBase64: string;
  author: string;
  authorAvatar: string;
  createdAt: number;
  averageRating: number;
  reviewCount: number;
  compositeScore: number;
}

export interface Review {
  _id: string;
  photoId: string;
  reviewer: string;
  reviewerAvatar: string;
  content: string;
  rating: number;
  markerX: number;
  markerY: number;
  createdAt: number;
}

export interface Category {
  id: string;
  name: string;
  color: string;
}

export interface PhotoListResponse {
  photos: Photo[];
  total: number;
  hasMore: boolean;
}

export interface PhotoDetailResponse {
  photo: Photo;
  reviews: Review[];
}

export interface ReviewListResponse {
  reviews: Review[];
  total: number;
}

export const categoryColors: Record<string, string> = {
  portrait: '#f9a8d4',
  landscape: '#6ee7b7',
  street: '#fcd34d',
  still: '#c4b5fd'
};

export const categoryNames: Record<string, string> = {
  all: '全部',
  portrait: '人像',
  landscape: '风光',
  street: '街拍',
  still: '静物'
};

export function getRatingColor(rating: number): string {
  if (rating >= 4.5) return '#fbbf24';
  if (rating >= 3.5) return '#d1d5db';
  return '#9ca3af';
}

export function getStarColor(rating: number, starIndex: number): string {
  if (rating >= starIndex + 1) return '#fbbf24';
  return '#4b5563';
}

export async function getPhotos(params: {
  page?: number;
  limit?: number;
  category?: string;
  minRating?: number;
  sortBy?: 'newest' | 'hottest' | 'topRated';
}): Promise<PhotoListResponse> {
  const response = await api.get('/photos', { params });
  return response.data;
}

export async function getPhotoDetail(id: string): Promise<PhotoDetailResponse> {
  const response = await api.get(`/photos/${id}`);
  return response.data;
}

export async function getPhotoReviews(
  id: string,
  params: { page?: number; limit?: number } = {}
): Promise<ReviewListResponse> {
  const response = await api.get(`/photos/${id}/reviews`, { params });
  return response.data;
}

export async function createPhoto(data: {
  title: string;
  category: string;
  description: string;
  imageBase64: string;
  author?: string;
  authorAvatar?: string;
}): Promise<{ success: boolean; photo: Photo }> {
  const response = await api.post('/photos', data);
  return response.data;
}

export async function createReview(data: {
  photoId: string;
  reviewer?: string;
  reviewerAvatar?: string;
  content: string;
  rating: number;
  markerX: number;
  markerY: number;
}): Promise<{ success: boolean; review: Review; photo: Photo }> {
  const response = await api.post('/reviews', data);
  return response.data;
}

export async function getHotPhotos(): Promise<{ photos: Photo[] }> {
  const response = await api.get('/hot');
  return response.data;
}

export async function getCategories(): Promise<{ categories: Category[] }> {
  const response = await api.get('/categories');
  return response.data;
}

export default api;
