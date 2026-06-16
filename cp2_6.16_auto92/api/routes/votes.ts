import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { readJsonFile, writeJsonFile } from '../utils/fileStorage.js'
import type { Vote, VoteResult, Schedule } from '../types.js'

const router = Router()

const MAX_VOTES = 3

router.get('/:scheduleId/votes', async (req: Request, res: Response): Promise<void> => {
  try {
    const { scheduleId } = req.params
    const votes = await readJsonFile<Vote[]>('votes.json')
    const scheduleVotes = votes.filter(v => v.scheduleId === scheduleId)

    const voteCounts = new Map<string, number>()
    scheduleVotes.forEach(vote => {
      vote.movieIds.forEach(movieId => {
        voteCounts.set(movieId, (voteCounts.get(movieId) || 0) + 1)
      })
    })

    const results: VoteResult[] = Array.from(voteCounts.entries()).map(([movieId, count]) => ({
      movieId,
      count
    })).sort((a, b) => b.count - a.count)

    res.status(200).json({
      success: true,
      data: results
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '获取投票结果失败'
    })
  }
})

router.post('/:scheduleId/votes', async (req: Request, res: Response): Promise<void> => {
  try {
    const { scheduleId } = req.params
    const { voterId, movieIds } = req.body as { voterId?: string; movieIds?: string[] }

    if (!voterId || !movieIds || !Array.isArray(movieIds) || movieIds.length === 0) {
      res.status(400).json({
        success: false,
        error: '缺少必要字段 voterId 或 movieIds'
      })
      return
    }

    if (movieIds.length > MAX_VOTES) {
      res.status(400).json({
        success: false,
        error: `每人最多投 ${MAX_VOTES} 票`
      })
      return
    }

    const schedules = await readJsonFile<Schedule[]>('schedules.json')
    const schedule = schedules.find(s => s.id === scheduleId)

    if (!schedule) {
      res.status(404).json({
        success: false,
        error: '排片不存在'
      })
      return
    }

    if (schedule.isClosed) {
      res.status(400).json({
        success: false,
        error: '投票已截止'
      })
      return
    }

    const votes = await readJsonFile<Vote[]>('votes.json')
    const alreadyVoted = votes.some(v => v.scheduleId === scheduleId && v.voterId === voterId)

    if (alreadyVoted) {
      res.status(400).json({
        success: false,
        error: '您已经投过票了'
      })
      return
    }

    const newVote: Vote = {
      id: uuidv4(),
      scheduleId,
      voterId,
      movieIds,
      createdAt: new Date().toISOString()
    }

    votes.push(newVote)
    await writeJsonFile('votes.json', votes)

    res.status(201).json({
      success: true,
      data: newVote
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '提交投票失败'
    })
  }
})

export default router
