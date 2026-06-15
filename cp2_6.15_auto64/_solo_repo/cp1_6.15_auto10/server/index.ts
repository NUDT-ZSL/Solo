import express, { Request, Response, NextFunction } from 'express'
import { initialMovies, scoreRecords, Movie, ScoreRecord } from './data'
import { v4 as uuidv4 } from 'uuid'

const app = express()
const PORT = 3002

app.use((_req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  next()
})
app.use(express.json())

interface MovieWithStats extends Movie {
  averageScore: number
  voteCount: number
}

function calculateMovieStats(movie: Movie): MovieWithStats {
  const movieScores = scoreRecords.filter(r => r.movieId === movie.id)
  const voteCount = movieScores.length
  const averageScore = voteCount > 0
    ? Math.round((movieScores.reduce((sum, r) => sum + r.score, 0) / voteCount) * 100) / 100
    : 0
  return { ...movie, averageScore, voteCount }
}

function simulateDelay<T>(data: T, minMs = 100, maxMs = 300): Promise<T> {
  const delay = Math.floor(Math.random() * (maxMs - minMs)) + minMs
  return new Promise(resolve => setTimeout(() => resolve(data), delay))
}

app.get('/api/movies', async (req: Request, res: Response) => {
  try {
    const { year, minScore, maxScore } = req.query

    let filtered = initialMovies.map(calculateMovieStats)

    if (year && year !== 'all') {
      const yearNum = parseInt(year as string)
      filtered = filtered.filter(m => m.year === yearNum)
    }

    if (minScore) {
      const min = parseFloat(minScore as string)
      filtered = filtered.filter(m => m.averageScore >= min)
    }

    if (maxScore) {
      const max = parseFloat(maxScore as string)
      filtered = filtered.filter(m => m.averageScore <= max)
    }

    const result = await simulateDelay(filtered)
    res.json({ success: true, data: result })
  } catch (error) {
    res.status(500).json({ success: false, message: '获取电影列表失败' })
  }
})

app.get('/api/movies/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const movie = initialMovies.find(m => m.id === id)

    if (!movie) {
      return res.status(404).json({ success: false, message: '电影不存在' })
    }

    const result = await simulateDelay(calculateMovieStats(movie))
    res.json({ success: true, data: result })
  } catch (error) {
    res.status(500).json({ success: false, message: '获取电影详情失败' })
  }
})

app.post('/api/movies/:id/score', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { score } = req.body

    const movie = initialMovies.find(m => m.id === id)
    if (!movie) {
      return res.status(404).json({ success: false, message: '电影不存在' })
    }

    if (typeof score !== 'number' || score < 1 || score > 10) {
      return res.status(400).json({ success: false, message: '评分必须在1-10之间' })
    }

    const newRecord: ScoreRecord = {
      id: uuidv4(),
      movieId: id,
      score: Math.round(score * 10) / 10,
      timestamp: Date.now()
    }

    scoreRecords.push(newRecord)

    const result = await simulateDelay(calculateMovieStats(movie))
    res.json({ success: true, data: result })
  } catch (error) {
    res.status(500).json({ success: false, message: '提交评分失败' })
  }
})

app.get('/api/ranking', async (_req: Request, res: Response) => {
  try {
    const ranked = initialMovies
      .map(calculateMovieStats)
      .sort((a, b) => {
        if (b.averageScore !== a.averageScore) {
          return b.averageScore - a.averageScore
        }
        return b.voteCount - a.voteCount
      })
      .map((movie, index) => ({
        ...movie,
        rank: index + 1
      }))

    const result = await simulateDelay(ranked)
    res.json({ success: true, data: result })
  } catch (error) {
    res.status(500).json({ success: false, message: '获取排行榜失败' })
  }
})

app.get('/api/years', async (_req: Request, res: Response) => {
  try {
    const years = Array.from(new Set(initialMovies.map(m => m.year))).sort((a, b) => b - a)
    const result = await simulateDelay(years, 50, 150)
    res.json({ success: true, data: result })
  } catch (error) {
    res.status(500).json({ success: false, message: '获取年份列表失败' })
  }
})

app.listen(PORT, () => {
  console.log(`MovieVote Server running on http://localhost:${PORT}`)
})
