import { Card, EffectType, ElementType } from './data/cards'

export interface PlayerState {
  id: number
  name: string
  health: number
  maxHealth: number
  shield: number
  deck: Card[]
  hand: Card[]
  curses: Curse[]
}

export interface Curse {
  id: string
  name: string
  element: ElementType
  value: number
  remainingTurns: number
  type: 'damage' | 'debuff'
}

export interface GameState {
  players: [PlayerState, PlayerState]
  currentPlayerIndex: number
  turn: number
  gameOver: boolean
  winner: number | null
}

export interface PlayCardResult {
  success: boolean
  card: Card
  sourcePlayerId: number
  targetPlayerId: number
  effects: CardEffect[]
  sourcePlayer: PlayerState
  targetPlayer: PlayerState
  gameOver: boolean
  winner: number | null
}

export interface CardEffect {
  type: EffectType
  value: number
  applied: boolean
}

export class CardEngine {
  private state: GameState | null = null

  initGame(player1Deck: Card[], player2Deck: Card[]): GameState {
    const p1Deck = this.shuffleDeck([...player1Deck])
    const p2Deck = this.shuffleDeck([...player2Deck])

    const p1Hand = p1Deck.splice(0, 5)
    const p2Hand = p2Deck.splice(0, 5)

    this.state = {
      players: [
        {
          id: 0,
          name: '玩家一',
          health: 100,
          maxHealth: 100,
          shield: 0,
          deck: p1Deck,
          hand: p1Hand,
          curses: [],
        },
        {
          id: 1,
          name: '玩家二',
          health: 100,
          maxHealth: 100,
          shield: 0,
          deck: p2Deck,
          hand: p2Hand,
          curses: [],
        },
      ],
      currentPlayerIndex: 0,
      turn: 1,
      gameOver: false,
      winner: null,
    }

    return { ...this.state }
  }

  getState(): GameState | null {
    if (!this.state) return null
    return JSON.parse(JSON.stringify(this.state))
  }

  playCard(playerId: number, cardId: string): PlayCardResult | null {
    if (!this.state || this.state.gameOver) return null
    if (this.state.currentPlayerIndex !== playerId) return null

    const player = this.state.players[playerId]
    const cardIndex = player.hand.findIndex((c) => c.id === cardId)
    if (cardIndex === -1) return null

    const card = player.hand[cardIndex]
    const targetId = playerId === 0 ? 1 : 0
    const targetPlayer = this.state.players[targetId]

    const effects: CardEffect[] = []

    switch (card.effectType) {
      case 'damage': {
        const { actualDamage, shieldUsed } = this.applyDamage(targetPlayer, card.value)
        effects.push({ type: 'damage', value: actualDamage, applied: actualDamage > 0 })
        break
      }
      case 'shield': {
        player.shield += card.value
        effects.push({ type: 'shield', value: card.value, applied: true })
        break
      }
      case 'heal': {
        const healAmount = Math.min(card.value, player.maxHealth - player.health)
        player.health += healAmount
        effects.push({ type: 'heal', value: healAmount, applied: healAmount > 0 })
        break
      }
      case 'curse': {
        targetPlayer.curses.push({
          id: `curse_${Date.now()}_${Math.random()}`,
          name: card.name,
          element: card.element,
          value: card.value,
          remainingTurns: 3,
          type: 'damage',
        })
        effects.push({ type: 'curse', value: card.value, applied: true })
        break
      }
    }

    player.hand.splice(cardIndex, 1)

    const gameOver = targetPlayer.health <= 0
    if (gameOver) {
      this.state.gameOver = true
      this.state.winner = playerId
    }

    return {
      success: true,
      card,
      sourcePlayerId: playerId,
      targetPlayerId: targetId,
      effects,
      sourcePlayer: JSON.parse(JSON.stringify(player)),
      targetPlayer: JSON.parse(JSON.stringify(targetPlayer)),
      gameOver,
      winner: this.state.winner,
    }
  }

  endTurn(): { state: GameState | null; drawnCards: Card[]; nextPlayerId: number } {
    if (!this.state || this.state.gameOver) {
      return { state: null, drawnCards: [], nextPlayerId: -1 }
    }

    const currentPlayer = this.state.players[this.state.currentPlayerIndex]
    const currentPlayerId = this.state.currentPlayerIndex

    const remainingCurses: Curse[] = []
    for (const curse of currentPlayer.curses) {
      if (curse.type === 'damage') {
        this.applyDamage(currentPlayer, curse.value)
      }
      curse.remainingTurns--
      if (curse.remainingTurns > 0) {
        remainingCurses.push(curse)
      }
    }
    currentPlayer.curses = remainingCurses

    if (currentPlayer.health <= 0) {
      this.state.gameOver = true
      this.state.winner = this.state.currentPlayerIndex === 0 ? 1 : 0
      return {
        state: JSON.parse(JSON.stringify(this.state)),
        drawnCards: [],
        nextPlayerId: -1,
      }
    }

    this.state.currentPlayerIndex = this.state.currentPlayerIndex === 0 ? 1 : 0
    const nextPlayerId = this.state.currentPlayerIndex
    if (this.state.currentPlayerIndex === 0) {
      this.state.turn++
    }

    const drawnCards = this.drawCards(this.state.currentPlayerIndex, 2)

    return {
      state: JSON.parse(JSON.stringify(this.state)),
      drawnCards,
      nextPlayerId,
    }
  }

  drawCards(playerId: number, count: number): Card[] {
    if (!this.state) return []

    const player = this.state.players[playerId]
    const drawn: Card[] = []

    for (let i = 0; i < count && player.deck.length > 0; i++) {
      const card = player.deck.shift()!
      player.hand.push(card)
      drawn.push(card)
    }

    return JSON.parse(JSON.stringify(drawn))
  }

  private applyDamage(player: PlayerState, damage: number): { actualDamage: number; shieldUsed: number } {
    let remainingDamage = damage
    let shieldUsed = 0

    if (player.shield > 0) {
      shieldUsed = Math.min(player.shield, remainingDamage)
      player.shield -= shieldUsed
      remainingDamage -= shieldUsed
    }

    player.health = Math.max(0, player.health - remainingDamage)

    return { actualDamage: damage, shieldUsed }
  }

  private shuffleDeck(deck: Card[]): Card[] {
    const shuffled = [...deck]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  getCurrentPlayer(): PlayerState | null {
    if (!this.state) return null
    return JSON.parse(JSON.stringify(this.state.players[this.state.currentPlayerIndex]))
  }

  getOtherPlayer(): PlayerState | null {
    if (!this.state) return null
    const otherIndex = this.state.currentPlayerIndex === 0 ? 1 : 0
    return JSON.parse(JSON.stringify(this.state.players[otherIndex]))
  }
}

export const cardEngine = new CardEngine()
