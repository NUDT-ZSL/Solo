import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'
import type { Card, CardType } from '../shared/types'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '..', 'data')
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
const DB_PATH = path.join(DATA_DIR, 'cards.db')

let db: Database.Database

const SEED_CARDS: Omit<Card, 'id'>[] = [
  { name: '火球术', type: 'spell', rarity: 'common', cost: 2, effect: 'damage', effectIcon: '🔥', description: '对敌方英雄造成3点伤害', attack: 3 },
  { name: '闪电链', type: 'spell', rarity: 'rare', cost: 3, effect: 'damage', effectIcon: '⚡', description: '对敌方英雄造成4点伤害', attack: 4 },
  { name: '炎爆术', type: 'spell', rarity: 'epic', cost: 5, effect: 'damage', effectIcon: '💥', description: '对敌方英雄造成6点伤害', attack: 6 },
  { name: '陨石坠落', type: 'spell', rarity: 'legendary', cost: 8, effect: 'damage', effectIcon: '☄️', description: '对敌方英雄造成10点伤害', attack: 10 },
  { name: '奥术飞弹', type: 'spell', rarity: 'common', cost: 1, effect: 'damage', effectIcon: '✨', description: '对敌方英雄造成2点伤害', attack: 2 },
  { name: '暗影箭', type: 'spell', rarity: 'rare', cost: 4, effect: 'damage', effectIcon: '🏹', description: '对敌方英雄造成5点伤害', attack: 5 },
  { name: '治疗术', type: 'spell', rarity: 'common', cost: 2, effect: 'heal', effectIcon: '💚', description: '恢复己方英雄4点生命值', health: 4 },
  { name: '圣光术', type: 'spell', rarity: 'rare', cost: 3, effect: 'heal', effectIcon: '✨', description: '恢复己方英雄6点生命值', health: 6 },
  { name: '神圣之光', type: 'spell', rarity: 'epic', cost: 5, effect: 'heal', effectIcon: '🌟', description: '恢复己方英雄10点生命值', health: 10 },
  { name: '生命之泉', type: 'spell', rarity: 'legendary', cost: 7, effect: 'heal', effectIcon: '💖', description: '恢复己方英雄15点生命值', health: 15 },
  { name: '铁皮护甲', type: 'defense', rarity: 'common', cost: 1, effect: 'armor', effectIcon: '🛡️', description: '获得3点护甲', attack: 3 },
  { name: '守护之盾', type: 'defense', rarity: 'rare', cost: 2, effect: 'armor', effectIcon: '🔰', description: '获得5点护甲并恢复2点生命', attack: 5, health: 2 },
  { name: '神圣壁垒', type: 'defense', rarity: 'epic', cost: 4, effect: 'shield', effectIcon: '🏛️', description: '获得8点护甲', attack: 8 },
  { name: '无敌护盾', type: 'defense', rarity: 'legendary', cost: 6, effect: 'shield', effectIcon: '⚜️', description: '获得12点护甲并恢复4点生命', attack: 12, health: 4 },
  { name: '石甲术', type: 'defense', rarity: 'common', cost: 2, effect: 'armor', effectIcon: '🪨', description: '获得4点护甲', attack: 4 },
  { name: '冰霜屏障', type: 'defense', rarity: 'rare', cost: 3, effect: 'armor', effectIcon: '❄️', description: '获得6点护甲', attack: 6 },
  { name: '新兵', type: 'summon', rarity: 'common', cost: 1, effect: 'summon', effectIcon: '🗡️', description: '召唤一个1/1的小兵', attack: 1, health: 1 },
  { name: '步兵', type: 'summon', rarity: 'common', cost: 2, effect: 'summon', effectIcon: '⚔️', description: '召唤一个2/3的战士', attack: 2, health: 3 },
  { name: '骑士', type: 'summon', rarity: 'rare', cost: 3, effect: 'summon', effectIcon: '🐴', description: '召唤一个3/4的骑士', attack: 3, health: 4 },
  { name: '精英战士', type: 'summon', rarity: 'rare', cost: 4, effect: 'summon', effectIcon: '🛡️', description: '召唤一个4/5的精英战士', attack: 4, health: 5 },
  { name: '巨龙', type: 'summon', rarity: 'epic', cost: 6, effect: 'summon', effectIcon: '🐲', description: '召唤一个6/6的巨龙', attack: 6, health: 6 },
  { name: '凤凰', type: 'summon', rarity: 'legendary', cost: 7, effect: 'summon', effectIcon: '🔥', description: '召唤一个5/7的凤凰', attack: 5, health: 7 },
  { name: '远古巨人', type: 'summon', rarity: 'legendary', cost: 9, effect: 'summon', effectIcon: '🗿', description: '召唤一个8/8的远古巨人', attack: 8, health: 8 },
  { name: '暗影刺客', type: 'summon', rarity: 'epic', cost: 5, effect: 'summon', effectIcon: '🗡️', description: '召唤一个5/4的刺客', attack: 5, health: 4 },
  { name: '狂战士', type: 'attack', rarity: 'common', cost: 2, effect: 'damage', effectIcon: '💪', description: '对敌方造成2点伤害并获得1护甲', attack: 2, health: 1 },
  { name: '重击', type: 'attack', rarity: 'common', cost: 1, effect: 'damage', effectIcon: '👊', description: '对敌方英雄造成2点伤害', attack: 2 },
  { name: '致命一击', type: 'attack', rarity: 'rare', cost: 3, effect: 'damage', effectIcon: '🗡️', description: '对敌方英雄造成4点伤害', attack: 4 },
  { name: '旋风斩', type: 'attack', rarity: 'epic', cost: 4, effect: 'damage', effectIcon: '🌀', description: '对敌方英雄造成5点伤害', attack: 5 },
  { name: '毁灭打击', type: 'attack', rarity: 'legendary', cost: 7, effect: 'damage', effectIcon: '💀', description: '对敌方英雄造成8点伤害', attack: 8 },
  { name: '狂暴', type: 'attack', rarity: 'rare', cost: 2, effect: 'buff', effectIcon: '😡', description: '己方所有随从攻击力+2', attack: 2 },
  { name: '血刃', type: 'attack', rarity: 'epic', cost: 5, effect: 'damage', effectIcon: '🩸', description: '对敌方造成6点伤害，己方损失2点', attack: 6 },
  { name: '圣光勇士', type: 'summon', rarity: 'rare', cost: 4, effect: 'summon', effectIcon: '⚜️', description: '召唤一个3/6的圣盾勇士', attack: 3, health: 6 },
  { name: '烈焰元素', type: 'summon', rarity: 'epic', cost: 5, effect: 'summon', effectIcon: '🔥', description: '召唤一个4/4烈焰元素，战吼2伤害', attack: 4, health: 4 },
  { name: '治疗图腾', type: 'summon', rarity: 'common', cost: 2, effect: 'summon', effectIcon: '➕', description: '召唤一个0/3治疗图腾，每回合回2血', attack: 0, health: 3 },
]

export function initDB() {
  db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')

  db.exec(`
    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('attack','defense','spell','summon')),
      rarity TEXT NOT NULL CHECK(rarity IN ('common','rare','epic','legendary')),
      cost INTEGER NOT NULL DEFAULT 0,
      attack INTEGER DEFAULT 0,
      health INTEGER DEFAULT 0,
      effect TEXT NOT NULL DEFAULT 'none',
      effect_icon TEXT NOT NULL DEFAULT '✨',
      description TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS battle_records (
      id TEXT PRIMARY KEY,
      player_deck TEXT NOT NULL,
      enemy_deck TEXT NOT NULL,
      winner TEXT NOT NULL CHECK(winner IN ('player','enemy')),
      total_turns INTEGER NOT NULL DEFAULT 0,
      turns_json TEXT NOT NULL,
      player_stats TEXT NOT NULL,
      enemy_stats TEXT NOT NULL,
      win_rate_adjustment REAL NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_cards_type ON cards(type);
    CREATE INDEX IF NOT EXISTS idx_cards_rarity ON cards(rarity);
    CREATE INDEX IF NOT EXISTS idx_battles_created ON battle_records(created_at DESC);
  `)

  const count = db.prepare('SELECT COUNT(*) as c FROM cards').get() as { c: number }
  if (count.c === 0) {
    const insert = db.prepare(
      'INSERT INTO cards (id, name, type, rarity, cost, attack, health, effect, effect_icon, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
    const tx = db.transaction((cards: Omit<Card, 'id'>[]) => {
      for (const c of cards) {
        insert.run(
          uuidv4(),
          c.name,
          c.type,
          c.rarity,
          c.cost,
          c.attack ?? 0,
          c.health ?? 0,
          c.effect,
          c.effectIcon,
          c.description
        )
      }
    })
    tx(SEED_CARDS)
  }
}

export function getAllCards(type?: CardType): Card[] {
  let rows
  if (type) {
    rows = db.prepare('SELECT * FROM cards WHERE type = ?').all(type) as any[]
  } else {
    rows = db.prepare('SELECT * FROM cards ORDER BY cost ASC').all() as any[]
  }
  return rows.map(mapCard)
}

export function getCardById(id: string): Card | null {
  const row = db.prepare('SELECT * FROM cards WHERE id = ?').get(id) as any
  return row ? mapCard(row) : null
}

function mapCard(row: any): Card {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    rarity: row.rarity,
    cost: row.cost,
    attack: row.attack || undefined,
    health: row.health || undefined,
    effect: row.effect,
    effectIcon: row.effect_icon,
    description: row.description,
  }
}

export function saveBattleRecord(record: {
  id: string
  playerDeck: any[]
  enemyDeck: any[]
  winner: 'player' | 'enemy'
  totalTurns: number
  turns: any[]
  playerStats: any
  enemyStats: any
  winRateAdjustment: number
}) {
  db.prepare(
    `INSERT INTO battle_records (id, player_deck, enemy_deck, winner, total_turns, turns_json, player_stats, enemy_stats, win_rate_adjustment)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    record.id,
    JSON.stringify(record.playerDeck),
    JSON.stringify(record.enemyDeck),
    record.winner,
    record.totalTurns,
    JSON.stringify(record.turns),
    JSON.stringify(record.playerStats),
    JSON.stringify(record.enemyStats),
    record.winRateAdjustment
  )
}

export function getBattleWinRate(): number {
  const row = db.prepare(
    `SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN winner = 'player' THEN 1 ELSE 0 END) as wins
     FROM battle_records`
  ).get() as { total: number; wins: number }
  if (!row || row.total === 0) return 0.5
  return row.wins / row.total
}

export function getDB(): Database.Database {
  return db
}
