import express from 'express'
import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

interface ColorValue {
  hex: string
  rgb: { r: number; g: number; b: number }
  hsl: { h: number; s: number; l: number }
}

interface PaletteVersion {
  id: string
  name: string
  createdAt: string
  colors: ColorValue[]
}

interface DatabaseData {
  versions: PaletteVersion[]
  baselineId: string | null
}

const app = express()
const port = 3001

app.use(express.json({ limit: '10mb' }))

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200)
  }
  next()
})

const file = path.join(__dirname, 'db.json')
const defaultData: DatabaseData = { versions: [], baselineId: null }
const db = new Low<DatabaseData>(new JSONFile(file), defaultData)

async function initDb() {
  await db.read()
  if (!db.data) {
    db.data = defaultData
    await db.write()
  }
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(x).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }).join('')
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      case b: h = (r - g) / d + 4; break
    }
    h /= 6
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  }
}

function calculateColorDifference(
  c1: { r: number; g: number; b: number },
  c2: { r: number; g: number; b: number }
): number {
  const rDiff = c1.r - c2.r
  const gDiff = c1.g - c2.g
  const bDiff = c1.b - c2.b
  const distance = Math.sqrt(rDiff * rDiff + gDiff * gDiff + bDiff * bDiff)
  const maxDistance = Math.sqrt(255 * 255 * 3)
  return Math.round((distance / maxDistance) * 100 * 10) / 10
}

function getDifferenceLevel(diff: number): { level: string; color: string } {
  if (diff < 5) {
    return { level: '相似', color: '#10B981' }
  } else if (diff <= 15) {
    return { level: '微调', color: '#F59E0B' }
  } else {
    return { level: '差异', color: '#EF4444' }
  }
}

app.get('/api/versions', async (req, res) => {
  await db.read()
  res.json({
    versions: db.data?.versions || [],
    baselineId: db.data?.baselineId || null
  })
})

app.post('/api/versions', async (req, res) => {
  try {
    const { name, colors } = req.body as { name: string; colors: { r: number; g: number; b: number }[] }

    if (!name || !colors || colors.length !== 5) {
      return res.status(400).json({ error: 'Invalid data: need name and 5 colors' })
    }

    const colorValues: ColorValue[] = colors.map(c => {
      const hex = rgbToHex(c.r, c.g, c.b)
      const hsl = rgbToHsl(c.r, c.g, c.b)
      return {
        hex,
        rgb: { r: Math.round(c.r), g: Math.round(c.g), b: Math.round(c.b) },
        hsl
      }
    })

    const newVersion: PaletteVersion = {
      id: uuidv4(),
      name,
      createdAt: new Date().toISOString(),
      colors: colorValues
    }

    await db.read()
    db.data?.versions.unshift(newVersion)
    await db.write()

    res.status(201).json(newVersion)
  } catch (error) {
    console.error('Error creating version:', error)
    res.status(500).json({ error: 'Failed to create version' })
  }
})

app.delete('/api/versions/:id', async (req, res) => {
  try {
    const { id } = req.params
    await db.read()
    
    if (!db.data) {
      return res.status(404).json({ error: 'Database not initialized' })
    }

    const index = db.data.versions.findIndex(v => v.id === id)
    if (index === -1) {
      return res.status(404).json({ error: 'Version not found' })
    }

    db.data.versions.splice(index, 1)
    
    if (db.data.baselineId === id) {
      db.data.baselineId = null
    }

    await db.write()
    res.json({ success: true })
  } catch (error) {
    console.error('Error deleting version:', error)
    res.status(500).json({ error: 'Failed to delete version' })
  }
})

app.get('/api/versions/compare', async (req, res) => {
  try {
    const { id1, id2 } = req.query

    if (!id1 || !id2) {
      return res.status(400).json({ error: 'Both id1 and id2 are required' })
    }

    await db.read()
    
    if (!db.data) {
      return res.status(500).json({ error: 'Database not initialized' })
    }

    const v1 = db.data.versions.find(v => v.id === id1)
    const v2 = db.data.versions.find(v => v.id === id2)

    if (!v1 || !v2) {
      return res.status(404).json({ error: 'One or both versions not found' })
    }

    const comparisons = v1.colors.map((color1, index) => {
      const color2 = v2.colors[index]
      const diff = calculateColorDifference(color1.rgb, color2.rgb)
      const levelInfo = getDifferenceLevel(diff)
      return {
        index,
        color1,
        color2,
        difference: diff,
        level: levelInfo.level,
        levelColor: levelInfo.color
      }
    })

    const overallDiff = Math.round(
      (comparisons.reduce((sum, c) => sum + c.difference, 0) / comparisons.length) * 10
    ) / 10

    res.json({
      version1: v1,
      version2: v2,
      comparisons,
      overallDifference: overallDiff,
      overallLevel: getDifferenceLevel(overallDiff).level,
      overallLevelColor: getDifferenceLevel(overallDiff).color
    })
  } catch (error) {
    console.error('Error comparing versions:', error)
    res.status(500).json({ error: 'Failed to compare versions' })
  }
})

app.put('/api/versions/:id/baseline', async (req, res) => {
  try {
    const { id } = req.params
    await db.read()
    
    if (!db.data) {
      return res.status(500).json({ error: 'Database not initialized' })
    }

    const version = db.data.versions.find(v => v.id === id)
    if (!version) {
      return res.status(404).json({ error: 'Version not found' })
    }

    db.data.baselineId = id
    await db.write()

    res.json({ success: true, baselineId: id })
  } catch (error) {
    console.error('Error setting baseline:', error)
    res.status(500).json({ error: 'Failed to set baseline' })
  }
})

app.put('/api/versions/reorder', async (req, res) => {
  try {
    const { order } = req.body as { order: string[] }
    
    if (!order || !Array.isArray(order)) {
      return res.status(400).json({ error: 'Invalid order data' })
    }

    await db.read()
    
    if (!db.data) {
      return res.status(500).json({ error: 'Database not initialized' })
    }

    const versionMap = new Map(db.data.versions.map(v => [v.id, v]))
    const baselineId = db.data.baselineId
    const baselineVersion = baselineId ? versionMap.get(baselineId) : null
    
    const reorderedVersions: PaletteVersion[] = []
    if (baselineVersion) {
      reorderedVersions.push(baselineVersion)
    }
    
    for (const id of order) {
      const v = versionMap.get(id)
      if (v && v.id !== baselineId) {
        reorderedVersions.push(v)
      }
    }

    for (const v of db.data.versions) {
      if (!reorderedVersions.find(rv => rv.id === v.id)) {
        reorderedVersions.push(v)
      }
    }

    db.data.versions = reorderedVersions
    await db.write()

    res.json({ success: true })
  } catch (error) {
    console.error('Error reordering versions:', error)
    res.status(500).json({ error: 'Failed to reorder versions' })
  }
})

app.listen(port, () => {
  console.log(`PaletteFlow server running on http://localhost:${port}`)
  initDb()
})
