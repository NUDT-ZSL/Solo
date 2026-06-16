import axios from 'axios';
import type { Book, Recommendation, LayoutRecommendation } from '../types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 5000
});

export const getBooks = (): Promise<Book[]> => {
  return api.get<Book[]>('/books').then((res) => res.data);
};

export const searchBookByISBN = (query: string): Promise<Book[]> => {
  return api.get<Book[]>('/books/search', { params: { q: query } }).then((res) => res.data);
};

export const addBook = (book: Omit<Book, 'id'>): Promise<Book> => {
  return api.post<Book>('/books', book).then((res) => res.data);
};

export const submitRecommendation = (data: {
  bookTitle: string;
  recommenderName: string;
  reason: string;
}): Promise<Recommendation> => {
  return api.post<Recommendation>('/recommendations', data).then((res) => res.data);
};

export const getRecommendations = (): Promise<Recommendation[]> => {
  return api.get<Recommendation[]>('/recommendations').then((res) => res.data);
};

export const getLayoutRecommendation = (): Promise<LayoutRecommendation[]> => {
  return api.get<LayoutRecommendation[]>('/layout-recommendation').then((res) => res.data);
};
