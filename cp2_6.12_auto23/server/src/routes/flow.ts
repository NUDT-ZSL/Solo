import { Router, type Request, type Response } from 'express'
import {
  createFlow,
  getFlow,
  getAllFlows,
  getMyFlows,
  getTodos,
  approveFlow,
  rejectFlow,
} from '../services/flowService.js'

const router = Router()

async function triggerNotify(flow: any) {
  try {
    const mod = await import('../index.js')
    if (mod.notifyRelevantUsers) {
      mod.notifyRelevantUsers(flow)
    }
  } catch (_e) {
  }
}

router.post('/flows', (req: Request, res: Response): void => {
  try {
    const { type, formData, creatorId, creatorName } = req.body
    if (!type || !formData || !creatorId || !creatorName) {
      res.status(400).json({ success: false, error: '缺少必要参数' })
      return
    }
    const flow = createFlow(type, formData, creatorId, creatorName)
    res.json({ success: true, data: flow })
    triggerNotify(flow)
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message })
  }
})

router.get('/flows', (_req: Request, res: Response): void => {
  try {
    const flows = getAllFlows()
    res.json({ success: true, data: flows })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/flows/:id', (req: Request, res: Response): void => {
  try {
    const { id } = req.params
    const flow = getFlow(id)
    if (!flow) {
      res.status(404).json({ success: false, error: '流程不存在' })
      return
    }
    res.json({ success: true, data: flow })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.post('/flows/:id/approve', (req: Request, res: Response): void => {
  try {
    const { id } = req.params
    const { handlerId, comment } = req.body
    if (!handlerId) {
      res.status(400).json({ success: false, error: '缺少 handlerId' })
      return
    }
    const flow = approveFlow(id, handlerId, comment || '')
    if (!flow) {
      res.status(404).json({ success: false, error: '流程不存在' })
      return
    }
    res.json({ success: true, data: flow })
    triggerNotify(flow)
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message })
  }
})

router.post('/flows/:id/reject', (req: Request, res: Response): void => {
  try {
    const { id } = req.params
    const { handlerId, comment } = req.body
    if (!handlerId) {
      res.status(400).json({ success: false, error: '缺少 handlerId' })
      return
    }
    const flow = rejectFlow(id, handlerId, comment || '')
    if (!flow) {
      res.status(404).json({ success: false, error: '流程不存在' })
      return
    }
    res.json({ success: true, data: flow })
    triggerNotify(flow)
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message })
  }
})

router.get('/todos', (req: Request, res: Response): void => {
  try {
    const userId = (req.query.userId as string) || 'u002'
    const todos = getTodos(userId)
    res.json({ success: true, code: 0, data: todos })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/todos/:userId', (req: Request, res: Response): void => {
  try {
    const { userId } = req.params
    const todos = getTodos(userId)
    res.json({ success: true, data: todos })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/me/flows', (req: Request, res: Response): void => {
  try {
    const { creatorId } = req.query
    if (!creatorId || typeof creatorId !== 'string') {
      res.status(400).json({ success: false, error: '缺少 creatorId' })
      return
    }
    const flows = getMyFlows(creatorId)
    res.json({ success: true, data: flows })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
