import { create } from 'zustand'
import type { Card, BattleResponse, CardType } from '../shared/types'

interface GameState {
  cards: Card[]
  deck: Card[]
  battleResult: BattleResponse | null
  filter: CardType | 'all'
  deckPanelOpen: boolean
  setCards: (cards: Card[]) => void
  addCard: (card: Card) => { ok: boolean }
  removeCard: (instanceIndex: number) => void
  setFilter: (f: CardType | 'all') => void
  setBattleResult: (r: BattleResponse | null) => void
  toggleDeckPanel: () => void
  resetDeck: () => void
}

export const useGameStore = create<GameState>((set, get) => ({
  cards: [],
  deck: [],
  battleResult: null,
  filter: 'all',
  deckPanelOpen: true,
  setCards: (cards) => set({ cards }),
  addCard: (card) => {
    const { deck } = get()
    if (deck.length >= 15) return { ok: false }
    set({ deck: [...deck, card] })
    return { ok: true }
  },
  removeCard: (idx) => {
    const { deck } = get()
    const next = [...deck]
    next.splice(idx, 1)
    set({ deck: next })
  },
  setFilter: (f) => set({ filter: f }),
  setBattleResult: (r) => set({ battleResult: r }),
  toggleDeckPanel: () => set((s) => ({ deckPanelOpen: !s.deckPanelOpen })),
  resetDeck: () => set({ deck: [], battleResult: null }),
}))
