import { WebSocketServer, WebSocket } from 'ws'
import { v4 as uuidv4 } from 'uuid'
import app from './app.js'

interface Point {
  x: number
  y: number
  timestamp: number
}

interface StrokeData {
  id: string
  regionId: string
  points: Point[]
  color: string
  size: number
  glow: boolean
  userId: string
  timestamp: number
}

interface Region {
  id: string
  seed: number
  likeCount: number
  brightness: number
  createdAt: number
  strokes: StrokeData[]
}

interface ClientInfo {
  ws: WebSocket
  userId: string
  regionId: string
}

const regions = new Map<string, Region>()
const clients = new Map<WebSocket, ClientInfo>()

function getOrCreateRegion(regionId: string): Region {
  if (regions.has(regionId)) return regions.get(regionId)!
  const region: Region = {
    id: regionId,
    seed: Math.floor(Math.random() * 2147483647),
    likeCount: 0,
    brightness: 1,
    createdAt: Date.now(),
    strokes: [],
  }
  regions.set(regionId, region)
  return region
}

function broadcastToRegion(regionId: string, message: object, excludeWs?: WebSocket) {
  const data = JSON.stringify(message)
  for (const [ws, client] of clients) {
    if (ws !== excludeWs && client.regionId === regionId && ws.readyState === WebSocket.OPEN) {
      ws.send(data)
    }
  }
}

function broadcastAll(message: object) {
  const data = JSON.stringify(message)
  for (const [ws] of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data)
    }
  }
}

function sendOnlineCount() {
  broadcastAll({ type: 'online_count', payload: { count: clients.size } })
}

const PORT = process.env.PORT || 3001
const server = app.listen(PORT, () => {
  console.log(`Server ready on port ${PORT}`)
})

const wss = new WebSocketServer({ server, path: '/ws' })

wss.on('connection', (ws) => {
  const userId = uuidv4().substring(0, 10)
  const regionId = `region_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
  const region = getOrCreateRegion(regionId)

  clients.set(ws, { ws, userId, regionId })

  ws.send(JSON.stringify({
    type: 'init',
    payload: {
      regionId: region.id,
      seed: region.seed,
      strokes: region.strokes,
      likeCount: region.likeCount,
      brightness: region.brightness,
    },
  }))

  sendOnlineCount()

  broadcastToRegion(regionId, {
    type: 'activity',
    payload: { text: `匿名用户加入了岛屿`, timestamp: Date.now() },
  })

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString())

      switch (msg.type) {
        case 'stroke': {
          const stroke = msg.payload as StrokeData
          const client = clients.get(ws)
          if (!client) break

          const targetRegion = regions.get(client.regionId)
          if (targetRegion) {
            targetRegion.strokes.push(stroke)
            if (targetRegion.strokes.length > 500) {
              targetRegion.strokes = targetRegion.strokes.slice(-300)
            }
          }

          broadcastToRegion(client.regionId, { type: 'stroke', payload: stroke }, ws)
          break
        }

        case 'discover': {
          const newRegionId = msg.payload.regionId as string
          const client = clients.get(ws)
          if (!client) break

          const newRegion = getOrCreateRegion(newRegionId)
          client.regionId = newRegionId

          ws.send(JSON.stringify({
            type: 'init',
            payload: {
              regionId: newRegion.id,
              seed: newRegion.seed,
              strokes: newRegion.strokes,
              likeCount: newRegion.likeCount,
              brightness: newRegion.brightness,
            },
          }))

          broadcastToRegion(newRegionId, {
            type: 'activity',
            payload: { text: `匿名用户发现了一座新岛屿`, timestamp: Date.now() },
          })
          break
        }

        case 'like': {
          const targetRegionId = msg.payload.regionId as string
          const likedRegion = regions.get(targetRegionId)
          if (!likedRegion) break

          likedRegion.likeCount += 1
          likedRegion.brightness = 1 + likedRegion.likeCount * 0.05

          broadcastToRegion(targetRegionId, {
            type: 'region_update',
            payload: {
              regionId: targetRegionId,
              likeCount: likedRegion.likeCount,
              brightness: likedRegion.brightness,
            },
          })

          broadcastToRegion(targetRegionId, {
            type: 'activity',
            payload: { text: `匿名用户点亮了这片区域`, timestamp: Date.now() },
          })
          break
        }
      }
    } catch (e) {
      console.error('Failed to handle message:', e)
    }
  })

  ws.on('close', () => {
    const client = clients.get(ws)
    clients.delete(ws)

    if (client) {
      broadcastToRegion(client.regionId, {
        type: 'activity',
        payload: { text: `匿名用户离开了岛屿`, timestamp: Date.now() },
      })
    }

    sendOnlineCount()
  })
})

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received')
  wss.close()
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('SIGINT signal received')
  wss.close()
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})

export default app
