import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { readJsonFile, writeJsonFile } from '../utils/fileStorage.js'
import type { Schedule } from '../types.js'

const router = Router()

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { movieId, startTime, endTime, votingDeadline } = req.body

    if (!movieId || !startTime || !endTime || !votingDeadline) {
      res.status(400).json({
        success: false,
        error: '缺少必要字段'
      })
      return
    }

    const schedules = await readJsonFile<Schedule[]>('schedules.json')

    const newSchedule: Schedule = {
      id: uuidv4(),
      movieId,
      startTime,
      endTime,
      votingDeadline,
      isVotingClosed: false,
      createdAt: new Date().toISOString()
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
    const { movieId, startTime, endTime, votingDeadline, isVotingClosed } = req.body

    const schedules = await readJsonFile<Schedule[]>('schedules.json')
    const index = schedules.findIndex(s => s.id === id)

    if (index === -1) {
      res.status(404).json({
        success: false,
        error: '排片不存在'
      })
      return
    }

    const updatedSchedule: Schedule = {
      ...schedules[index],
      ...(movieId !== undefined && { movieId }),
      ...(startTime !== undefined && { startTime }),
      ...(endTime !== undefined && { endTime }),
      ...(votingDeadline !== undefined && { votingDeadline }),
      ...(isVotingClosed !== undefined && { isVotingClosed })
    }

    schedules[index] = updatedSchedule
    await writeJsonFile('schedules.json', schedules)

    res.status(200).json({
      success: true,
      data: updatedSchedule
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '更新排片失败'
    })
  }
})

router.post('/:id/close-voting', async (req: Request, res: Response): Promise<void> => {
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

    schedules[index].isVotingClosed = true
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
