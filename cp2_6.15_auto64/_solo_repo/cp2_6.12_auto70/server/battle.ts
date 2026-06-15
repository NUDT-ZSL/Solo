import { v4 as uuidv4 } from 'uuid'
import type {
  Card,
  BattleCard,
  BattlePlayer,
  BattleTurnRecord,
  BattleResponse,
  BattleRequest,
  CardPlayed,
  BattleStats,
} from '../shared/types'
import { MAX_MANA, STARTING_HEALTH, STARTING_HAND, DECK_MAX_SIZE } from '../shared/types'
import { getAllCards, saveBattleRecord, getBattleWinRate } from './cards'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function cardToBattleCard(card: Card): BattleCard {
  return {
    ...card,
    instanceId: uuidv4(),
    currentAttack: card.attack ?? 0,
    currentHealth: card.health ?? 0,
  }
}

function createPlayer(deckCards: Card[]): BattlePlayer {
  const deck = shuffle(deckCards.map(cardToBattleCard))
  return {
    health: STARTING_HEALTH,
    maxHealth: STARTING_HEALTH,
    mana: 0,
    maxMana: 0,
    deck,
    hand: [],
    battlefield: [],
  }
}

export function generateEnemyDeck(level: 1 | 2 | 3 = 1): Card[] {
  const all = getAllCards()
  const size = DECK_MAX_SIZE
  const result: Card[] = []
  const rarityBias: Record<string, number> = level === 1
    ? { common: 0.7, rare: 0.25, epic: 0.05, legendary: 0 }
    : level === 2
    ? { common: 0.45, rare: 0.35, epic: 0.18, legendary: 0.02 }
    : { common: 0.25, rare: 0.35, epic: 0.3, legendary: 0.1 }

  while (result.length < size) {
    const r = Math.random()
    let rarity: 'common' | 'rare' | 'epic' | 'legendary' = 'common'
    if (r < rarityBias.common) rarity = 'common'
    else if (r < rarityBias.common + rarityBias.rare) rarity = 'rare'
    else if (r < rarityBias.common + rarityBias.rare + rarityBias.epic) rarity = 'epic'
    else rarity = 'legendary'

    const pool = all.filter(c => c.rarity === rarity)
    if (pool.length === 0) {
      result.push(all[Math.floor(Math.random() * all.length)])
    } else {
      result.push(pool[Math.floor(Math.random() * pool.length)])
    }
  }
  return result
}

function drawCard(player: BattlePlayer): BattleCard | null {
  if (player.deck.length === 0) return null
  if (player.hand.length >= 10) {
    player.deck.shift()
    return null
  }
  const card = player.deck.shift()!
  player.hand.push(card)
  return card
}

function applyCardEffect(
  card: BattleCard,
  caster: BattlePlayer,
  target: BattlePlayer
): { damage: number; healing: number } {
  let damage = 0
  let healing = 0

  switch (card.effect) {
    case 'damage':
      damage = card.attack ?? 0
      target.health = Math.max(0, target.health - damage)
      break
    case 'heal':
      healing = card.health ?? 0
      caster.health = Math.min(caster.maxHealth, caster.health + healing)
      break
    case 'armor':
    case 'shield': {
      const armor = card.attack ?? 0
      caster.health = Math.min(caster.maxHealth, caster.health + (card.health ?? 0))
      healing = card.health ?? 0
      damage = -armor
      break
    }
    case 'buff': {
      const atkBuff = card.attack ?? 0
      for (const minion of caster.battlefield) {
        minion.currentAttack += atkBuff
      }
      break
    }
    case 'summon': {
      const minion: BattleCard = {
        ...card,
        instanceId: uuidv4(),
        currentAttack: card.attack ?? 0,
        currentHealth: card.health ?? 0,
      }
      if (caster.battlefield.length < 7) {
        caster.battlefield.push(minion)
      }
      break
    }
    default:
      if (card.attack && card.attack > 0) {
        damage = card.attack
        target.health = Math.max(0, target.health - damage)
      }
      if (card.health && card.health > 0) {
        healing = card.health
        caster.health = Math.min(caster.maxHealth, caster.health + healing)
      }
  }
  return { damage: Math.max(0, damage), healing }
}

function aiDecidePlay(
  player: BattlePlayer,
  enemy: BattlePlayer
): BattleCard | null {
  const playable = player.hand.filter(c => c.cost <= player.mana)
  if (playable.length === 0) return null
  playable.sort((a, b) => b.cost - a.cost)
  if (enemy.health <= 10) {
    const lethal = playable.find(c => (c.attack ?? 0) >= enemy.health && c.effect === 'damage')
    if (lethal) return lethal
  }
  if (player.health <= 10) {
    const healer = playable.find(c => c.effect === 'heal')
    if (healer) return healer
  }
  return playable[0]
}

export function simulateBattle(req: BattleRequest): BattleResponse {
  const battleId = uuidv4()
  const player = createPlayer(req.playerDeck)
  const enemyLevel = req.enemyLevel ?? (Math.floor(Math.random() * 3) + 1) as 1 | 2 | 3
  const enemyDeckCards = generateEnemyDeck(enemyLevel)
  const enemy = createPlayer(enemyDeckCards)

  for (let i = 0; i < STARTING_HAND; i++) {
    drawCard(player)
    drawCard(enemy)
  }

  const turns: BattleTurnRecord[] = []
  const playerStats: BattleStats = { totalDamage: 0, totalHealing: 0, cardsUsed: {} }
  const enemyStats: BattleStats = { totalDamage: 0, totalHealing: 0, cardsUsed: {} }
  let turnNumber = 0
  let winner: 'player' | 'enemy' | null = null

  while (turnNumber < 100 && player.health > 0 && enemy.health > 0) {
    turnNumber++
    for (const side of ['player', 'enemy'] as const) {
      if (player.health <= 0 || enemy.health <= 0) break
      const caster = side === 'player' ? player : enemy
      const target = side === 'player' ? enemy : player
      caster.maxMana = Math.min(MAX_MANA, caster.maxMana + 1)
      caster.mana = caster.maxMana
      drawCard(caster)

      const cardsPlayed: CardPlayed[] = []
      let damageDealtThisTurn = 0
      let healingDoneThisTurn = 0
      let safety = 0

      while (safety++ < 20) {
        const card = aiDecidePlay(caster, target)
        if (!card) break
        caster.mana -= card.cost
        const idx = caster.hand.findIndex(c => c.instanceId === card.instanceId)
        if (idx >= 0) caster.hand.splice(idx, 1)

        const stats = side === 'player' ? playerStats : enemyStats
        stats.cardsUsed[card.id] = (stats.cardsUsed[card.id] ?? 0) + 1

        const { damage, healing } = applyCardEffect(card, caster, target)
        stats.totalDamage += damage
        stats.totalHealing += healing
        damageDealtThisTurn += damage
        healingDoneThisTurn += healing

        for (let i = caster.battlefield.length - 1; i >= 0; i--) {
          const m = caster.battlefield[i]
          if (m.currentAttack > 0) {
            target.health = Math.max(0, target.health - m.currentAttack)
            stats.totalDamage += m.currentAttack
            damageDealtThisTurn += m.currentAttack
          }
        }

        cardsPlayed.push({
          cardId: card.id,
          cardName: card.name,
          damage,
          healing,
        })

        if (target.health <= 0) break
      }

      turns.push({
        turn: turnNumber,
        side,
        cardsPlayed,
        damageDealt: damageDealtThisTurn,
        healingDone: healingDoneThisTurn,
        playerHealthAfter: player.health,
        enemyHealthAfter: enemy.health,
      })

      if (player.health <= 0) {
        winner = 'enemy'
        break
      }
      if (enemy.health <= 0) {
        winner = 'player'
        break
      }
    }
  }

  if (!winner) winner = player.health >= enemy.health ? 'player' : 'enemy'

  const historicalRate = getBattleWinRate()
  const totalCost = req.playerDeck.reduce((s, c) => s + c.cost, 0) / Math.max(1, req.playerDeck.length)
  const levelFactor = (enemyLevel - 2) * 0.1
  const costFactor = (totalCost - 3.5) * 0.03
  const winRateAdjustment = Math.round((winner === 'player' ? 1 : -1) * (5 + Math.abs(levelFactor * 20) + costFactor * 10 + (historicalRate - 0.5) * -10) * 10) / 10

  saveBattleRecord({
    id: battleId,
    playerDeck: req.playerDeck,
    enemyDeck: enemyDeckCards,
    winner,
    totalTurns: turnNumber,
    turns,
    playerStats,
    enemyStats,
    winRateAdjustment,
  })

  return {
    battleId,
    winner,
    turns,
    playerStats,
    enemyStats,
    winRateAdjustment,
    enemyDeck: enemyDeckCards,
    totalTurns: turnNumber,
  }
}
