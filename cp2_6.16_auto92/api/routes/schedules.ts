import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { readJsonFile, writeJsonFile } from '../utils/fileStorage.js'
import type { Schedule, ScheduleItem } from '../types.js'

const router = Router()

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { items } = req.body as { items?: ScheduleItem[] }

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({
        success: false,
        error: '缺少必要字段 items'
      })
      return
    }

    const schedules = await readJsonFile<Schedule[]>('schedules.json')

    const newSchedule: Schedule = {
      id: uuidv4(),
      items,
      createdAt: new Date().toISOString(),
      isClosed: false
    }

    schedules.push(newSchedule)
    await writeJsonFile('schedules.json', schedules)

    res.status(201).json({
      success: true,
      data: newSchedule
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '创建排片失败'
    })
  }
})

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const schedules = await readJsonFile<Schedule[]>('schedules.json')
    const schedule = schedules.find(s => s.id === id)

    if (!schedule) {
      res.status(404).json({
        success: false,
        error: '排片不存在'
      })
      return
    }

    res.status(200).json({
      success: true,
      data: schedule
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '获取排片失败'
    })
  }
})

router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { items } = req.body as { items?: ScheduleItem[] }

    if (!items || !Array.isArray(items)) {
      res.status(400).json({
        success: false,
        error: '缺少必要字段 items'
      })
      return
    }

    const schedules = await readJsonFile<Schedule[]>('schedules.json')
    const index = schedules.findIndex(s => s.id === id)

    if (index === -1) {
      res.status(404).json({
        success: false,
        error: '排片不存在'
      })
      return
    }

    schedules[index] = {
      ...schedules[index],
      items
    }
    await writeJsonFile('schedules.json', schedules)

    res.status(200).json({
      success: true,
      data: schedules[index]
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '更新排片失败'
    })
  }
})

router.post('/:id/close', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const schedules = await readJsonFile<Schedule[]>('schedules.json')
    const index = schedules.findIndex(s => s.id === id)

    if (index === -1) {
      res.status(404).json({
        success: false,
        error: '排片不存在'
      })
      return
    }

    schedules[index].isClosed = true
    schedules[index].closedAt = new Date().toISOString()
    await writeJsonFile('schedules.json', schedules)

    res.status(200).json({
      success: true,
      data: schedules[index]
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '截止投票失败'
    })
  }
})

export default router
