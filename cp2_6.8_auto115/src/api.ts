import axios from 'axios'

export interface Card {
  id: string
  front: string
  back: string
  interval: number
  easeFactor: number
  nextReview: string
  createdAt: string
}

export interface CardDeck {
  id: string
  title: string
  cards: Card[]
  createdAt: string
}

export type Rating = 'hard' | 'good' | 'easy'

export interface ReviewResponse {
  cardId: string
  nextReview: string
  newInterval: number
  newEaseFactor: number
}

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

export const fetchDecks = async (): Promise<CardDeck[]> => {
  const response = await api.get('/decks')
  return response.data
}

export const fetchDeck = async (deckId: string): Promise<CardDeck> => {
  const response = await api.get(`/decks/${deckId}`)
  return response.data
}

export const createDeck = async (title: string): Promise<CardDeck> => {
  const response = await api.post('/decks', { title })
  return response.data
}

export const addCard = async (
  deckId: string,
  front: string,
  back: string
): Promise<Card> => {
  const response = await api.post(`/decks/${deckId}/cards`, { front, back })
  return response.data
}

export const submitReview = async (
  cardId: string,
  rating: Rating
): Promise<ReviewResponse> => {
  const response = await api.post(`/cards/${cardId}/review`, { rating })
  return response.data
}
