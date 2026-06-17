import { Router, type Request, type Response } from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataDir = path.resolve(__dirname, '../../data')

const router = Router()

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const records = JSON.parse(fs.readFileSync(path.join(dataDir, 'records.json'), 'utf-8'))
  res.json({ success: true, data: records })
})

router.patch('/:id', async (req: Request, res: Response): Promise<void> => {
  const { status, returnTime } = req.body
  const records = JSON.parse(fs.readFileSync(path.join(dataDir, 'records.json'), 'utf-8'))
  const record = records.find((r: any) => r.id === req.params.id)
  if (!record) {
    res.status(404).json({ success: false, error: 'Record not found' })
    return
  }

  if (status !== undefined) record.status = status
  if (returnTime !== undefined) record.returnTime = returnTime

  fs.writeFileSync(path.join(dataDir, 'records.json'), JSON.stringify(records, null, 2))

  res.json({ success: true, data: record })
})

export default router
