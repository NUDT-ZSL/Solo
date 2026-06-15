import axios from 'axios';

export interface Deck {
  id: string;
  name: string;
  themeColor: string;
  createdAt: string;
  lastPracticedAt?: string;
  cardCount: number;
}

export interface Card {
  id: string;
  deckId: string;
  word: string;
  meaning: string;
  example?: string;
  nextReviewAt: string;
  interval: number;
  createdAt: string;
}

export interface UserStats {
  todayLearned: number;
  totalCards: number;
  streakDays: number;
}

const api = axios.create({
  baseURL: '/api',
});

export const decksApi = {
  getAll: () => api.get<Deck[]>('/decks').then((res) => res.data),
  create: (name: string) => api.post<Deck>('/decks', { name }).then((res) => res.data),
};

export const cardsApi = {
  getByDeck: (deckId: string) =>
    api.get<Card[]>('/cards', { params: { deckId } }).then((res) => res.data),
  getReviewCards: (deckId: string) =>
    api.get<Card[]>('/cards/review', { params: { deckId } }).then((res) => res.data),
  create: (data: { deckId: string; word: string; meaning: string; example?: string }) =>
    api.post<Card>('/cards', data).then((res) => res.data),
  update: (id: string, data: { word: string; meaning: string; example?: string }) =>
    api.put<Card>(`/cards/${id}`, data).then((res) => res.data),
  remove: (id: string) => api.delete(`/cards/${id}`).then((res) => res.data),
};

export const reviewApi = {
  submitReview: (data: { cardId: string; deckId: string; rating: 'easy' | 'medium' | 'hard' }) =>
    api.post<{ nextReviewAt: string; interval: number; stats: UserStats }>('/review', data).then((res) => res.data),
};

export const statsApi = {
  getStats: () => api.get<UserStats>('/stats').then((res) => res.data),
};

export default api;
