import express, { type Request, type Response } from 'express'
import cors from 'cors'
import { getAllAromas, createRecipe, getAllRecipes, getDb } from './database'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

getDb()

app.get('/api/aromas', (_req: Request, res: Response): void => {
  try {
    const aromas = getAllAromas()
    res.json(aromas)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch aromas' })
  }
})

app.get('/api/recipes', (_req: Request, res: Response): void => {
  try {
    const recipes = getAllRecipes()
    res.json(recipes)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch recipes' })
  }
})

app.post('/api/recipes', (req: Request, res: Response): void => {
  try {
    const { name, aromas } = req.body as {
      name: string
      aromas: { aromaId: number; ratio: number }[]
    }
    if (!name || !aromas || !Array.isArray(aromas) || aromas.length === 0) {
      res.status(400).json({ error: 'name and aromas array are required' })
      return
    }
    const id = createRecipe(name, aromas)
    res.status(201).json({ id, name, aromas })
  } catch (error) {
    res.status(500).json({ error: 'Failed to save recipe' })
  }
})

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'API not found' })
})

app.listen(PORT, () => {
  console.log(`Server ready on port ${PORT}`)
})
