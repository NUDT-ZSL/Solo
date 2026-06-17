import { Router, type Request, type Response } from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataDir = path.resolve(__dirname, '../../data')

const router = Router()

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const devices = JSON.parse(fs.readFileSync(path.join(dataDir, 'devices.json'), 'utf-8'))
  res.json({ success: true, data: devices })
})

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const devices = JSON.parse(fs.readFileSync(path.join(dataDir, 'devices.json'), 'utf-8'))
  const device = devices.find((d: any) => d.id === req.params.id)
  if (!device) {
    res.status(404).json({ success: false, error: 'Device not found' })
    return
  }
  res.json({ success: true, data: device })
})

export default router
