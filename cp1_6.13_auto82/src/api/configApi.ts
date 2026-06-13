import axios from 'axios';

export interface Card {
  id: number;
  name: string;
  type: 'attack' | 'defense' | 'energy';
  cost: number;
  damage: number;
  defense: number;
  energy: number;
  description: string;
  instanceId?: string;
}

export interface DeckResponse {
  deck: Card[];
}

export interface CardsResponse {
  cards: Card[];
}

const api = axios.create({
  baseURL: '/api'
});

export const configApi = {
  async getCards(): Promise<Card[]> {
    const response = await api.get<CardsResponse>('/cards');
    return response.data.cards;
  },

  async getDeck(): Promise<Card[]> {
    const response = await api.get<DeckResponse>('/decks');
    return response.data.deck;
  }
};
