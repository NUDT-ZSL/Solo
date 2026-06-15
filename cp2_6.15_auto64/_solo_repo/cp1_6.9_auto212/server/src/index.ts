import express from 'express'
import cors from 'cors'
import { store, Circuit, Component, Wire, VersionSnapshot } from './store'

const app = express()
const PORT = 3001

app.use(cors({ origin: '*' }))
app.use(express.json({ limit: '10mb' }))

app.get('/api/circuits', (_req, res) => {
  try {
    const circuits = store.getCircuits()
    res.json({ success: true, data: circuits })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取电路列表失败' })
  }
})

app.post('/api/circuits', (req, res) => {
  try {
    const { name } = req.body
    if (!name) {
      return res.status(400).json({ success: false, error: '电路名称不能为空' })
    }
    const circuit = store.createCircuit(name)
    res.json({ success: true, data: circuit })
  } catch (error) {
    res.status(500).json({ success: false, error: '创建电路失败' })
  }
})

app.get('/api/circuits/:id', (req, res) => {
  try {
    const circuit = store.getCircuit(req.params.id)
    if (!circuit) {
      return res.status(404).json({ success: false, error: '电路不存在' })
    }
    res.json({ success: true, data: circuit })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取电路详情失败' })
  }
})

app.put('/api/circuits/:id', (req, res) => {
  try {
    const { name, components, wires } = req.body
    const updateData: Partial<Circuit> = {}
    if (name !== undefined) updateData.name = name
    if (components !== undefined) updateData.components = components as Component[]
    if (wires !== undefined) updateData.wires = wires as Wire[]
    
    const circuit = store.updateCircuit(req.params.id, updateData)
    if (!circuit) {
      return res.status(404).json({ success: false, error: '电路不存在' })
    }
    res.json({ success: true, data: circuit })
  } catch (error) {
    res.status(500).json({ success: false, error: '更新电路失败' })
  }
})

app.delete('/api/circuits/:id', (req, res) => {
  try {
    const deleted = store.deleteCircuit(req.params.id)
    if (!deleted) {
      return res.status(404).json({ success: false, error: '电路不存在' })
    }
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false, error: '删除电路失败' })
  }
})

app.get('/api/circuits/:id/versions', (req, res) => {
  try {
    const versions = store.getVersions(req.params.id)
    res.json({ success: true, data: versions })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取版本历史失败' })
  }
})

app.post('/api/circuits/:id/versions', (req, res) => {
  try {
    const { name } = req.body
    const version = store.createVersion(req.params.id, name)
    if (!version) {
      return res.status(404).json({ success: false, error: '电路不存在' })
    }
    res.json({ success: true, data: version as VersionSnapshot })
  } catch (error) {
    res.status(500).json({ success: false, error: '创建版本快照失败' })
  }
})

app.post('/api/circuits/:id/versions/:versionId/restore', (req, res) => {
  try {
    const circuit = store.restoreVersion(req.params.id, req.params.versionId)
    if (!circuit) {
      return res.status(404).json({ success: false, error: '电路或版本不存在' })
    }
    res.json({ success: true, data: circuit })
  } catch (error) {
    res.status(500).json({ success: false, error: '恢复版本失败' })
  }
})

app.get('/api/circuits/:id/comments', (req, res) => {
  try {
    const comments = store.getComments(req.params.id)
    res.json({ success: true, data: comments })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取评论失败' })
  }
})

app.post('/api/circuits/:id/comments', (req, res) => {
  try {
    const { userId, username, text } = req.body
    if (!text || !username) {
      return res.status(400).json({ success: false, error: '评论内容和用户名不能为空' })
    }
    const comment = store.addComment(req.params.id, {
      userId: userId || `user_${Date.now()}`,
      username,
      text
    })
    if (!comment) {
      return res.status(404).json({ success: false, error: '电路不存在' })
    }
    res.json({ success: true, data: comment })
  } catch (error) {
    res.status(500).json({ success: false, error: '添加评论失败' })
  }
})

app.post('/api/circuits/:id/share', (req, res) => {
  try {
    const result = store.createShareLink(req.params.id)
    if (!result) {
      return res.status(404).json({ success: false, error: '电路不存在' })
    }
    res.json({ success: true, data: result })
  } catch (error) {
    res.status(500).json({ success: false, error: '创建分享链接失败' })
  }
})

app.get('/api/share/:token', (req, res) => {
  try {
    const circuit = store.getCircuitByShareToken(req.params.token)
    if (!circuit) {
      return res.status(404).json({ success: false, error: '分享链接无效或已过期' })
    }
    res.json({ success: true, data: circuit })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取分享内容失败' })
  }
})

app.get('/api/circuits/:id/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.flushHeaders()

  const circuitId = req.params.id
  const unsubscribe = store.subscribe(circuitId, (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`)
  })

  res.write(`data: ${JSON.stringify({ type: 'connected', data: { circuitId } })}\n\n`)

  const heartbeat = setInterval(() => {
    res.write(`: heartbeat ${Date.now()}\n\n`)
  }, 30000)

  req.on('close', () => {
    clearInterval(heartbeat)
    unsubscribe()
  })
})

app.listen(PORT, () => {
  console.log(`\n🚀 芯桥后端服务已启动`)
  console.log(`📡 API 端口: http://localhost:${PORT}`)
  console.log(`⚡ SSE 推送已就绪\n`)
})
