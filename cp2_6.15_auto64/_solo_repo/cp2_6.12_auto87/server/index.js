import express from 'express'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'
import {
  getPlayer,
  createPlayer,
  updatePlayer,
  getPlayerSpirits,
  createSpirit,
  updateSpirit,
  getSpirit,
} from './db.js'

const app = express()
app.use(cors())
app.use(express.json())

const DEFAULT_PLAYER_ID = 'player-1'

app.get('/api/players/:id', (req, res) => {
  let player = getPlayer(req.params.id)
  if (!player && req.params.id === DEFAULT_PLAYER_ID) {
    player = createPlayer(DEFAULT_PLAYER_ID)
  }
  if (!player) return res.status(404).json({ error: '玩家不存在' })
  res.json({ player })
})

app.put('/api/players/:id', (req, res) => {
  const player = updatePlayer(req.params.id, req.body)
  if (!player) return res.status(404).json({ error: '玩家不存在' })
  res.json({ player })
})

app.get('/api/spirits', (req, res) => {
  const { playerId } = req.query
  if (!playerId) return res.status(400).json({ error: '需要 playerId' })
  const spirits = getPlayerSpirits(playerId)
  res.json({ spirits })
})

app.post('/api/spirits', (req, res) => {
  const { playerId, name, element, skills } = req.body
  if (!playerId || !name || !element) {
    return res.status(400).json({ error: '参数不完整' })
  }
  const spirit = createSpirit({
    id: uuidv4(),
    playerId,
    name,
    element,
    skills: skills || [],
    hp: 50 + Math.floor(Math.random() * 30),
    maxHp: 50 + Math.floor(Math.random() * 30),
    attack: 8 + Math.floor(Math.random() * 8),
    defense: 3 + Math.floor(Math.random() * 6),
    resistance: 80 + Math.floor(Math.random() * 60),
  })
  res.json({ spirit })
})

app.put('/api/spirits/:id', (req, res) => {
  const spirit = updateSpirit(req.params.id, req.body)
  if (!spirit) return res.status(404).json({ error: '灵兽不存在' })
  res.json({ spirit })
})

app.post('/api/battles', (req, res) => {
  const { playerId, expGained, result } = req.body
  const player = getPlayer(playerId)
  if (!player) return res.status(404).json({ error: '玩家不存在' })

  let newExp = player.exp + (expGained || 0)
  let newLevel = player.level
  while (newExp >= newLevel * 100) {
    newExp -= newLevel * 100
    newLevel++
  }

  const unlockedAreas = [...player.unlockedAreas]
  let unlockedArea = null
  if (result === 'win') {
    const allAreas = ['forest', 'grassland', 'volcano', 'lake', 'ruins']
    for (const area of allAreas) {
      if (!unlockedAreas.includes(area) && newLevel >= 2) {
        unlockedAreas.push(area)
        unlockedArea = area
        break
      }
    }
  }

  const updated = updatePlayer(playerId, {
    exp: newExp,
    level: newLevel,
    unlockedAreas,
  })

  res.json({
    id: uuidv4(),
    result: result || 'win',
    expGained: expGained || 20,
    unlockedArea,
    player: updated,
  })
})

const PORT = 3001
app.listen(PORT, () => {
  console.log(`灵兽驯养师后端服务器运行在 http://localhost:${PORT}`)
})
