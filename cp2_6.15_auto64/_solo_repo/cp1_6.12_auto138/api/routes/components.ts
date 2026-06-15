import { Router, type Request, type Response } from 'express'
import { JSONFilePreset } from 'lowdb/node'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = Router()

interface StyleConfig {
  color: string
  backgroundColor: string
  fontSize: number
  borderRadius: number
  padding: number
  boxShadow: string
  width: number
  height: number
}

interface ComponentMeta {
  id: string
  name: string
  version: string
  category: string
  tags: string[]
  defaultProps: Record<string, unknown>
  styleConfig: StyleConfig
}

interface DbSchema {
  components: ComponentMeta[]
}

async function getDb() {
  const dbPath = path.resolve(__dirname, '../../db.json')
  const db = await JSONFilePreset<DbSchema>(dbPath, { components: [] })
  return db
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const db = await getDb()
    res.json({ components: db.data.components })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch components' })
  }
})

router.post('/', async (req: Request, res: Response) => {
  try {
    const db = await getDb()
    const newComponent: ComponentMeta = {
      id: uuidv4(),
      name: req.body.name || 'Untitled',
      version: req.body.version || '1.0.0',
      category: req.body.category || '/Basic',
      tags: req.body.tags || [],
      defaultProps: req.body.defaultProps || {},
      styleConfig: req.body.styleConfig || {
        color: '#333333',
        backgroundColor: '#ffffff',
        fontSize: 14,
        borderRadius: 8,
        padding: 12,
        boxShadow: 'none',
        width: 200,
        height: 100,
      },
    }
    db.data.components.push(newComponent)
    await db.write()
    res.status(201).json({ component: newComponent })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create component' })
  }
})

export default router
