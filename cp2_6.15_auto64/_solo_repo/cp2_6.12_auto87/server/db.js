import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const db = new Database(path.join(__dirname, 'spirit_tamer.db'))

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL DEFAULT '驯养师',
    hp INTEGER NOT NULL DEFAULT 100,
    maxHp INTEGER NOT NULL DEFAULT 100,
    exp INTEGER NOT NULL DEFAULT 0,
    level INTEGER NOT NULL DEFAULT 1,
    unlockedAreas TEXT NOT NULL DEFAULT '["forest"]',
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS spirits (
    id TEXT PRIMARY KEY,
    playerId TEXT NOT NULL,
    name TEXT NOT NULL,
    element TEXT NOT NULL CHECK(element IN ('fire','water','wood','light','dark')),
    hp INTEGER NOT NULL DEFAULT 50,
    maxHp INTEGER NOT NULL DEFAULT 50,
    attack INTEGER NOT NULL DEFAULT 10,
    defense INTEGER NOT NULL DEFAULT 5,
    resistance INTEGER NOT NULL DEFAULT 100,
    skills TEXT NOT NULL DEFAULT '[]',
    level INTEGER NOT NULL DEFAULT 1,
    exp INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (playerId) REFERENCES players(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_spirits_playerId ON spirits(playerId);
`)

export function getPlayer(id) {
  const row = db.prepare('SELECT * FROM players WHERE id = ?').get(id)
  if (row) {
    row.unlockedAreas = JSON.parse(row.unlockedAreas)
  }
  return row
}

export function createPlayer(id, data = {}) {
  const { name = '驯养师', hp = 100, maxHp = 100, exp = 0, level = 1, unlockedAreas = ['forest'] } = data
  db.prepare(
    `INSERT INTO players (id, name, hp, maxHp, exp, level, unlockedAreas) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, name, hp, maxHp, exp, level, JSON.stringify(unlockedAreas))
  return getPlayer(id)
}

export function updatePlayer(id, data) {
  const existing = getPlayer(id)
  if (!existing) return null
  const merged = { ...existing, ...data }
  if (data.unlockedAreas) {
    merged.unlockedAreas = JSON.stringify(data.unlockedAreas)
  }
  db.prepare(
    `UPDATE players SET name=?, hp=?, maxHp=?, exp=?, level=?, unlockedAreas=? WHERE id=?`
  ).run(merged.name, merged.hp, merged.maxHp, merged.exp, merged.level, merged.unlockedAreas, id)
  return getPlayer(id)
}

export function getPlayerSpirits(playerId) {
  const rows = db.prepare('SELECT * FROM spirits WHERE playerId = ?').all(playerId)
  return rows.map((r) => ({ ...r, skills: JSON.parse(r.skills) }))
}

export function getSpirit(id) {
  const row = db.prepare('SELECT * FROM spirits WHERE id = ?').get(id)
  if (row) row.skills = JSON.parse(row.skills)
  return row
}

export function createSpirit(spirit) {
  const { id, playerId, name, element, hp = 50, maxHp = 50, attack = 10, defense = 5, resistance = 100, skills = [], level = 1, exp = 0 } = spirit
  db.prepare(
    `INSERT INTO spirits (id, playerId, name, element, hp, maxHp, attack, defense, resistance, skills, level, exp)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, playerId, name, element, hp, maxHp, attack, defense, resistance, JSON.stringify(skills), level, exp)
  return getSpirit(id)
}

export function updateSpirit(id, data) {
  const existing = getSpirit(id)
  if (!existing) return null
  const merged = { ...existing, ...data }
  if (data.skills) merged.skills = JSON.stringify(data.skills)
  db.prepare(
    `UPDATE spirits SET hp=?, maxHp=?, attack=?, defense=?, resistance=?, skills=?, level=?, exp=? WHERE id=?`
  ).run(merged.hp, merged.maxHp, merged.attack, merged.defense, merged.resistance, merged.skills, merged.level, merged.exp, id)
  return getSpirit(id)
}

export { db }
export default db
