export type CardType = 'attack' | 'defense' | 'spell' | 'summon'
export type CardRarity = 'common' | 'rare' | 'epic' | 'legendary'

export interface Card {
  id: string
  name: string
  type: CardType
  rarity: CardRarity
  cost: number
  attack?: number
  health?: number
  effect: string
  effectIcon: string
  description: string
}

export interface BattleCard extends Card {
  instanceId: string
  currentHealth: number
  currentAttack: number
}

export interface BattlePlayer {
  health: number
  maxHealth: number
  mana: number
  maxMana: number
  deck: BattleCard[]
  hand: BattleCard[]
  battlefield: BattleCard[]
}

export interface CardPlayed {
  cardId: string
  cardName: string
  target?: string
  damage?: number
  healing?: number
}

export interface BattleTurnRecord {
  turn: number
  side: 'player' | 'enemy'
  cardsPlayed: CardPlayed[]
  damageDealt: number
  healingDone: number
  playerHealthAfter: number
  enemyHealthAfter: number
}

export interface BattleRequest {
  playerDeck: Card[]
  enemyLevel?: 1 | 2 | 3
}

export interface BattleStats {
  totalDamage: number
  totalHealing: number
  cardsUsed: Record<string, number>
}

export interface BattleResponse {
  battleId: string
  winner: 'player' | 'enemy'
  turns: BattleTurnRecord[]
  playerStats: BattleStats
  enemyStats: BattleStats
  winRateAdjustment: number
  enemyDeck: Card[]
  totalTurns: number
}

export const CARD_TYPE_LABELS: Record<CardType, string> = {
  attack: '攻击',
  defense: '防御',
  spell: '法术',
  summon: '召唤',
}

export const CARD_RARITY_COLORS: Record<CardRarity, string> = {
  common: '#888888',
  rare: '#4a9eff',
  epic: '#c77dff',
  legendary: 'linear-gradient(135deg, #ffd700, #ffae00, #ff8c00)',
}

export const CARD_RARITY_LABELS: Record<CardRarity, string> = {
  common: '常见',
  rare: '稀有',
  epic: '史诗',
  legendary: '传说',
}

export const DECK_MAX_SIZE = 15
export const MAX_MANA = 10
export const STARTING_HEALTH = 30
export const STARTING_HAND = 3
