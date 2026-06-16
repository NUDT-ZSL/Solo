import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { readJsonFile, writeJsonFile } from '../utils/fileStorage.js'
import type { Vote, VoteResult, Schedule } from '../types.js'

const router = Router()

const MAX_VOTES_PER_USER = 3

router.get('/:scheduleId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { scheduleId } = req.params
    const votes = await readJsonFile<Vote[]>('votes.json')
    const scheduleVotes = votes.filter(v => v.scheduleId === scheduleId)

    const voteCounts = new Map<string, number>()
    scheduleVotes.forEach(vote => {
      voteCounts.set(vote.movieId, (voteCounts.get(vote.movieId) || 0) + 1)
    })

    const results: VoteResult[] = Array.from(voteCounts.entries()).map(([movieId, count]) => ({
      movieId,
      count
    })).sort((a, b) => b.count - a.count)

    res.status(200).json({
      success: true,
      data: {
        scheduleId,
        totalVotes: scheduleVotes.length,
        results
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '获取投票结果失败'
    })
  }
})

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { scheduleId, userId, movieId } = req.body

    if (!scheduleId || !userId || !movieId) {
      res.status(400).json({
        success: false,
        error: '缺少必要字段'
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

    if (schedule.isVotingClosed) {
      res.status(400).json({
        success: false,
        error: '投票已截止'
      })
      return
    }

    const votes = await readJsonFile<Vote[]>('votes.json')
    const userVotesCount = votes.filter(v => v.scheduleId === scheduleId && v.userId === userId).length

    if (userVotesCount >= MAX_VOTES_PER_USER) {
      res.status(400).json({
        success: false,
        error: `每人最多投 ${MAX_VOTES_PER_USER} 票`
      })
      return
    }

    const alreadyVoted = votes.some(
      v => v.scheduleId === scheduleId && v.userId === userId && v.movieId === movieId
    )

    if (alreadyVoted) {
      res.status(400).json({
        success: false,
        error: '不能对同一电影重复投票'
      })
      return
    }

    const newVote: Vote = {
      id: uuidv4(),
      scheduleId,
      userId,
      movieId,
      createdAt: new Date().toISOString()
    }

    votes.push(newVote)
    await writeJsonFile('votes.json', votes)

    res.status(201).json({
      success: true,
      data: {
        vote: newVote,
        remainingVotes: MAX_VOTES_PER_USER - userVotesCount - 1
      }
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '提交投票失败'
    })
  }
})

export default router
