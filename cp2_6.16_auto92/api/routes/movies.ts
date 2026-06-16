import { Router, type Request, type Response } from 'express'
import { readJsonFile, writeJsonFile } from '../utils/fileStorage.js'
import type { Movie } from '../types.js'

const router = Router()

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const movies = await readJsonFile<Movie[]>('movies.json')
    res.status(200).json(movies)
  } catch (error) {
    console.error('Error fetching movies:', error)
    res.status(500).json({ error: '获取电影列表失败' })
  }
})

export default router
