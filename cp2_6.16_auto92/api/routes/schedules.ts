import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { readJsonFile, writeJsonFile } from '../utils/fileStorage.js'
import type { Schedule, ScheduleItem, Vote, VoteResult } from '../types.js'

const router = Router()

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { items } = req.body as { items: ScheduleItem[] }

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: '排片列表不能为空' })
      return
    }

    const schedules = await readJsonFile<Schedule[]>('schedules.json')

    const newSchedule: Schedule = {
      id: uuidv4(),
      items: items.map((item, index) => ({ ...item, order: index })),
      createdAt: new Date().toISOString(),
      isClosed: false,
    }

    schedules.push(newSchedule)
    await writeJsonFile('schedules.json', schedules)

    res.status(201).json(newSchedule)
  } catch (error) {
    console.error('Error creating schedule:', error)
    res.status(500).json({ error: '创建排片失败' })
  }
})

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const schedules = await readJsonFile<Schedule[]>('schedules.json')
    const schedule = schedules.find((s) => s.id === id)

    if (!schedule) {
      res.status(404).json({ error: '排片不存在' })
      return
    }

    res.status(200).json(schedule)
  } catch (error) {
    console.error('Error fetching schedule:', error)
    res.status(500).json({ error: '获取排片失败' })
  }
})

router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { items } = req.body as { items: ScheduleItem[] }

    const schedules = await readJsonFile<Schedule[]>('schedules.json')
    const index = schedules.findIndex((s) => s.id === id)

    if (index === -1) {
      res.status(404).json({ error: '排片不存在' })
      return
    }

    const updatedSchedule: Schedule = {
      ...schedules[index],
      items: items.map((item, i) => ({ ...item, order: i })),
    }

    schedules[index] = updatedSchedule
    await writeJsonFile('schedules.json', schedules)

    res.status(200).json(updatedSchedule)
  } catch (error) {
    console.error('Error updating schedule:', error)
    res.status(500).json({ error: '更新排片失败' })
  }
})

router.post('/:id/close', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const schedules = await readJsonFile<Schedule[]>('schedules.json')
    const index = schedules.findIndex((s) => s.id === id)

    if (index === -1) {
      res.status(404).json({ error: '排片不存在' })
      return
    }

    schedules[index].isClosed = true
    schedules[index].closedAt = new Date().toISOString()
    await writeJsonFile('schedules.json', schedules)

    res.status(200).json(schedules[index])
  } catch (error) {
    console.error('Error closing schedule:', error)
    res.status(500).json({ error: '截止投票失败' })
  }
})

router.get('/:id/votes', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: scheduleId } = req.params

    const schedules = await readJsonFile<Schedule[]>('schedules.json')
    const schedule = schedules.find((s) => s.id === scheduleId)

    if (!schedule) {
      res.status(404).json({ error: '排片不存在' })
      return
    }

    const votes = await readJsonFile<Vote[]>('votes.json')
    const scheduleVotes = votes.filter((v) => v.scheduleId === scheduleId)

    const voteCounts = new Map<string, number>()
    scheduleVotes.forEach((vote) => {
      vote.movieIds.forEach((movieId) => {
        voteCounts.set(movieId, (voteCounts.get(movieId) || 0) + 1)
      })
    })

    const results: VoteResult[] = Array.from(voteCounts.entries()).map(
      ([movieId, count]) => ({
        movieId,
        count,
      }),
    )

    schedule.items.forEach((item) => {
      if (!voteCounts.has(item.movieId)) {
        results.push({ movieId: item.movieId, count: 0 })
      }
    })

    res.status(200).json(results)
  } catch (error) {
    console.error('Error fetching votes:', error)
    res.status(500).json({ error: '获取投票结果失败' })
  }
})

router.post('/:id/votes', async (req: Request, res: Response): Promise<void> => {
  const MAX_VOTES_PER_USER = 3

  try {
    const { id: scheduleId } = req.params
    const { voterId, movieIds } = req.body as {
      voterId: string
      movieIds: string[]
    }

    if (!scheduleId || !voterId || !movieIds) {
      res.status(400).json({ error: '缺少必要字段' })
      return
    }

    if (movieIds.length > MAX_VOTES_PER_USER) {
      res.status(400).json({ error: `每人最多投 ${MAX_VOTES_PER_USER} 票` })
      return
    }

    const schedules = await readJsonFile<Schedule[]>('schedules.json')
    const schedule = schedules.find((s) => s.id === scheduleId)

    if (!schedule) {
      res.status(404).json({ error: '排片不存在' })
      return
    }

    if (schedule.isClosed) {
      res.status(400).json({ error: '投票已截止' })
      return
    }

    const validMovieIds = schedule.items.map((item) => item.movieId)
    const allValid = movieIds.every((id) => validMovieIds.includes(id))
    if (!allValid) {
      res.status(400).json({ error: '包含无效的电影ID' })
      return
    }

    const votes = await readJsonFile<Vote[]>('votes.json')

    const existingVoteIndex = votes.findIndex(
      (v) => v.scheduleId === scheduleId && v.voterId === voterId,
    )

    if (existingVoteIndex !== -1) {
      votes[existingVoteIndex].movieIds = movieIds
      votes[existingVoteIndex].createdAt = new Date().toISOString()
    } else {
      const newVote: Vote = {
        id: uuidv4(),
        scheduleId,
        voterId,
        movieIds,
        createdAt: new Date().toISOString(),
      }
      votes.push(newVote)
    }

    await writeJsonFile('votes.json', votes)

    const voteCounts = new Map<string, number>()
    const scheduleVotes = votes.filter((v) => v.scheduleId === scheduleId)
    scheduleVotes.forEach((vote) => {
      vote.movieIds.forEach((movieId) => {
        voteCounts.set(movieId, (voteCounts.get(movieId) || 0) + 1)
      })
    })

    const results: VoteResult[] = Array.from(voteCounts.entries()).map(
      ([movieId, count]) => ({
        movieId,
        count,
      }),
    )

    schedule.items.forEach((item) => {
      if (!voteCounts.has(item.movieId)) {
        results.push({ movieId: item.movieId, count: 0 })
      }
    })

    res.status(200).json({ success: true, results })
  } catch (error) {
    console.error('Error submitting vote:', error)
    res.status(500).json({ error: '提交投票失败' })
  }
})

export default router
