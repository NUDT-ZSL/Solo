import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'
import type { Card, CardType } from '../shared/types'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = path.join(__dirname, '..', 'data', 'cards.db')

let db: Database.Database

const SEED_CARDS: Omit<Card, 'id'>[] = [
  { name: '火球术', type: 'spell', rarity: 'common', cost: 2, effect: 'damage', effectIcon: '🔥', description: '对敌方英雄造成3点伤害', attack: 3 },
  { name: '闪电链', type: 'spell', rarity: 'rare', cost: 3, effect: 'damage', effectIcon: '⚡', description: '对敌方英雄造成4点伤害', attack: 4 },
  { name: '炎爆术', type: 'spell', rarity: 'epic', cost: 5, effect: 'damage', effectIcon: '💥', description: '对敌方英雄造成6点伤害', attack: 6 },
  { name: '陨石坠落', type: 'spell', rarity: 'legendary', cost: 8, effect: 'damage', effectIcon: '☄️', description: '对敌方英雄造成10点伤害并对所有敌方随从造成3点', attack: 10 },
  { name: '奥术飞弹', type: 'spell', rarity: 'common', cost: 1, effect: 'damage', effectIcon: '✨', description: '对敌方英雄造成2点伤害', attack: 2 },
  { name: '暗影箭', type: 'spell', rarity: 'rare', cost: 4, effect: 'damage', effectIcon: '🏹', description: '对敌方英雄造成5点伤害', attack: 5 },
  { name: '治疗术', type: 'spell', rarity: 'common', cost: 2, effect: 'heal', effectIcon: '💚', description: '恢复己方英雄4点生命值', health: 4 },
  { name: '圣光术', type: 'spell', rarity: 'rare', cost: 3, effect: 'heal', effectIcon: '✨', description: '恢复己方英雄6点生命值', health: 6 },
  { name: '神圣之光', type: 'spell', rarity: 'epic', cost: 5, effect: 'heal', effectIcon: '🌟', description: '恢复己方英雄10点生命值', health: 10 },
  { name: '生命之泉', type: 'spell', rarity: 'legendary', cost: 7, effect: 'heal', effectIcon: '💖', description: '恢复己方英雄15点生命值', health: 15 },
  { name: '铁皮护甲', type: 'defense', rarity: 'common', cost: 1, effect: 'armor', effectIcon: '🛡️', description: '获得3点护甲（下次受到伤害减免）', attack: 3 },
  { name: '守护之盾', type: 'defense', rarity: 'rare', cost: 2, effect: 'armor', effectIcon: '🔰', description: '获得5点护甲并恢复2点生命', attack: 5, health: 2 },
  { name: '神圣壁垒', type: 'defense', rarity: 'epic', cost: 4, effect: 'shield', effectIcon: '🏛️', description: '获得8点护甲', attack: 8 },
  { name: '无敌护盾', type: 'defense', rarity: 'legendary', cost: 6, effect: 'shield', effectIcon: '⚜️', description: '获得12点护甲并恢复4点生命', attack: 12, health: 4 },
  { name: '石甲术', type: 'defense', rarity: 'common', cost: 2, effect: 'armor', effectIcon: '🪨', description: '获得4点护甲', attack: 4 },
  { name: '冰霜屏障', type: 'defense', rarity: 'rare', cost: 3, effect: 'armor', effectIcon: '❄️', description: '获得6点护甲', attack: 6 },
  { name: '新兵', type: 'summon', rarity: 'common', cost: 1, effect: 'summon', effectIcon: '🗡️', description: '召唤一个1/1的小兵', attack: 1, health: 1 },
  { name: '步兵', type: 'summon', rarity: 'common', cost: 2, effect: 'summon', effectIcon: '⚔️', description: '召唤一个2/3的战士', attack: 2, health: 3 },
  { name: '骑士', type: 'summon', rarity: 'rare', cost: 3, effect: 'summon', effectIcon: '🐴', description: '召唤一个3/4的骑士', attack: 3, health: 4 },
  { name: '精英战士', type: 'summon', rarity: 'rare', cost: 4, effect: 'summon', effectIcon: '🛡️', description: '召唤一个4/5带嘲讽的精英战士', attack: 4, health: 5 },
  { name: '巨龙', type: 'summon', rarity: 'epic', cost: 6, effect: 'summon', effectIcon: '🐲', description: '召唤一个6/6的巨龙', attack: 6, health: 6 },
  { name: '凤凰', type: 'summon', rarity: 'legendary', cost: 7, effect: 'summon', effectIcon: '🔥', description: '召唤一个5/7的凤凰，亡语造成3点伤害', attack: 5, health: 7 },
  { name: '远古巨人', type: 'summon', rarity: 'legendary', cost: 9, effect: 'summon', effectIcon: '🗿', description: '召唤一个8/8的远古巨人', attack: 8, health: 8 },
  { name: '暗影刺客', type: 'summon', rarity: 'epic', cost: 5, effect: 'summon', effectIcon: '🗡️', description: '召唤一个5/4的刺客，战吼造成2点伤害', attack: 5, health: 4 },
  { name: '狂战士', type: 'attack', rarity: 'common', cost: 2, effect: 'damage', effectIcon: '💪', description: '对敌方英雄造成2点伤害并获得1点护甲', attack: 2, health: 1 },
  { name: '重击', type: 'attack', rarity: 'common', cost: 1, effect: 'damage', effectIcon: '👊', description: '对敌方英雄造成2点伤害', attack: 2 },
  { name: '致命一击', type: 'attack', rarity: 'rare', cost: 3, effect: 'damage', effectIcon: '🗡️', description: '对敌方英雄造成4点伤害', attack: 4 },
  { name: '旋风斩', type: 'attack', rarity: 'epic', cost: 4, effect: 'damage', effectIcon: '🌀', description: '对敌方英雄造成5点伤害并对所有敌方随从造成1点', attack: 5 },
  { name: '毁灭打击', type: 'attack', rarity: 'legendary', cost: 7, effect: 'damage', effectIcon: '💀', description: '对敌方英雄造成8点伤害', attack: 8 },
  { name: '狂暴', type: 'attack', rarity: 'rare', cost: 2, effect: 'buff', effectIcon: '😡', description: '己方所有随从攻击力+2', attack: 2 },
  { name: '血刃', type: 'attack', rarity: 'epic', cost: 5, effect: 'damage', effectIcon: '🩸', description: '对敌方英雄造成6点伤害，己方损失2点', attack: 6 },
  { name: '圣光勇士', type: 'summon', rarity: 'rare', cost: 4, effect: 'summon', effectIcon: '⚜️', description: '召唤一个3/6的圣盾勇士', attack: 3, health: 6 },
]

export function initDB() {
  db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')

  db.exec(`
    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('attack','defense','spell','summon'),
      rarity TEXT NOT NULL CHECK(rarity IN ('common','rare','epic','legendary')),
      cost INTEGER NOT NULL DEFAULT 0,
      attack INTEGER DEFAULT 0,
      health INTEGER DEFAULT 0,
      effect TEXT NOT NULL DEFAULT 'none',
      effect_icon TEXT NOT NULL DEFAULT '✨',
      description TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS battle_records