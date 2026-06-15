import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { run, all } from '../db.js'

const router = Router()

type MoodType = 'happy' | 'calm' | 'neutral' | 'down' | 'anxious'

const VALID_MOODS: MoodType[] = ['happy', 'calm', 'neutral', 'down', 'anxious']

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { mood, text } = req.body as { mood?: string; text?: string }

    if (!mood || !VALID_MOODS.includes(mood as MoodType)) {
      res.status(400).json({ success: false, error: 'Invalid mood value' })
      return
    }

    const id = uuidv4()
    const createdAt = new Date().toISOString()
    const textValue = (text || '').slice(0, 200)

    await run(
      'INSERT INTO mood_records (id, mood, text, createdAt) VALUES (?, ?, ?, ?)',
      [id, mood, textValue, createdAt],
    )

    res.status(201).json({ success: true, id })
  } catch (error) {
    console.error('Error saving mood:', error)
    res.status(500).json({ success: false, error: 'Failed to save mood' })
  }
})

router.get('/report', async (_req: Request, res: Response): Promise<void> => {
  try {
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]
    const sevenDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]

    const distributionRows = await all<{ mood: string; count: number }>(
      "SELECT mood, COUNT(*) as count FROM mood_records WHERE date(createdAt) = ? GROUP BY mood",
      [todayStr],
    )

    const distribution: Record<MoodType, number> = {
      happy: 0,
      calm: 0,
      neutral: 0,
      down: 0,
      anxious: 0,
    }

    for (const row of distributionRows) {
      if (VALID_MOODS.includes(row.mood as MoodType)) {
        distribution[row.mood as MoodType] = row.count
      }
    }

    const trendRows = await all<{ d: string; avgScore: number }>(
      `SELECT date(createdAt) as d, AVG(
        CASE mood
          WHEN 'happy' THEN 5
          WHEN 'calm' THEN 4
          WHEN 'neutral' THEN 3
          WHEN 'down' THEN 2
          WHEN 'anxious' THEN 1
        END
      ) as avgScore
      FROM mood_records
      WHERE date(createdAt) >= ?
      GROUP BY date(createdAt)
      ORDER BY d ASC`,
      [sevenDaysAgo],
    )

    const weekTrend = trendRows.map((row) => ({
      date: row.d,
      avgScore: Math.round(row.avgScore * 100) / 100,
    }))

    const allTextRows = await all<{ text: string }>(
      "SELECT text FROM mood_records WHERE text IS NOT NULL AND text != '' AND date(createdAt) >= ?",
      [sevenDaysAgo],
    )

    const wordFreq: Record<string, number> = {}
    const stopWords = new Set([
      '的', '了', '是', '在', '我', '有', '和', '就', '不', '人',
      '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去',
      '你', '会', '着', '没有', '看', '好', '自己', '这', '他', '她',
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
      'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
      'would', 'could', 'should', 'may', 'might', 'can', 'shall',
      'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'him',
      'his', 'she', 'her', 'it', 'its', 'they', 'them', 'their',
      'and', 'but', 'or', 'not', 'no', 'so', 'if', 'of', 'at',
      'by', 'for', 'with', 'about', 'to', 'from', 'in', 'on',
      'that', 'this', 'these', 'those', 'am', 'just', 'very',
      'really', 'too', 'much', 'more', 'some', 'any', 'all',
    ])

    for (const row of allTextRows) {
      if (!row.text) continue
      const matches = row.text.match(/[\u4e00-\u9fff]{2,4}|[a-zA-Z]{2,}/g) || []
      for (const word of matches) {
        const w = word.toLowerCase()
        if (!stopWords.has(w) && w.length >= 2) {
          wordFreq[w] = (wordFreq[w] || 0) + 1
        }
      }
    }

    const wordCloud = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50)
      .map(([word, count]) => ({ word, count }))

    res.json({
      todayDistribution: distribution,
      weekTrend,
      wordCloud,
    })
  } catch (error) {
    console.error('Error generating report:', error)
    res.status(500).json({ success: false, error: 'Failed to generate report' })
  }
})

export default router
