import { Router, type Request, type Response } from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataDir = path.resolve(__dirname, '../../data')

const router = Router()

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const users = JSON.parse(fs.readFileSync(path.join(dataDir, 'users.json'), 'utf-8'))
  const user = users.find((u: any) => u.id === req.params.id)
  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' })
    return
  }
  res.json({ success: true, data: user })
})

router.get('/:id/records', async (req: Request, res: Response): Promise<void> => {
  const records = JSON.parse(fs.readFileSync(path.join(dataDir, 'records.json'), 'utf-8'))
  const userRecords = records.filter((r: any) => r.userId === req.params.id)
  res.json({ success: true, data: userRecords })
})

export default router
