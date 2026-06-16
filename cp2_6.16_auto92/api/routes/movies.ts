import { Router, type Request, type Response } from 'express'
import { readJsonFile } from '../utils/fileStorage.js'
import type { Movie } from '../types.js'

const router = Router()

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const movies = await readJsonFile<Movie[]>('movies.json')
    res.status(200).json({
      success: true,
      data: movies
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '获取电影列表失败'
    })
  }
})

export default router
