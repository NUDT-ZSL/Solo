import express, { Request, Response } from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DATA_DIR = path.join(__dirname, 'data')

interface Course {
  id: string
  title: string
  description: string
  coverUrl: string
}

interface KnowledgePoint {
  id: string
  courseId: string
  title: string
  description: string
  difficulty: '初级' | '中级' | '高级'
  tags: string[]
  x: number
  y: number
}

interface Relation {
  id: string
  sourceId: string
  targetId: string
  type: 'prerequisite'
}

interface User {
  id: string
  name: string
  role: 'teacher' | 'student'
  scores: Record<string, number>
  reviewed: string[]
}

function readJSON<T>(filename: string, key: string): T[] {
  const filePath = path.join(DATA_DIR, filename)
  const raw = fs.readFileSync(filePath, 'utf-8')
  return JSON.parse(raw)[key] as T[]
}

function writeJSON<T>(filename: string, key: string, data: T[]): void {
  const filePath = path.join(DATA_DIR, filename)
  fs.writeFileSync(filePath, JSON.stringify({ [key]: data }, null, 2), 'utf-8')
}

function topologicalSortDFS(
  points: KnowledgePoint[],
  relations: Relation[]
): string[] {
  const adj: Record<string, string[]> = {}
  points.forEach(p => (adj[p.id] = []))
  relations.forEach(r => {
    if (adj[r.sourceId]) adj[r.sourceId].push(r.targetId)
  })

  const visited = new Set<string>()
  const temp = new Set<string>()
  const result: string[] = []

  function dfs(nodeId: string): boolean {
    if (temp.has(nodeId)) return false
    if (visited.has(nodeId)) return true
    temp.add(nodeId)
    for (const next of adj[nodeId] || []) {
      if (!dfs(next)) return false
    }
    temp.delete(nodeId)
    visited.add(nodeId)
    result.unshift(nodeId)
    return true
  }

  for (const p of points) {
    if (!visited.has(p.id)) {
      if (!dfs(p.id)) break
    }
  }
  return result
}

function computeRecommendPath(
  userId: string,
  courseId: string
): string[] {
  const users = readJSON<User>('users.json', 'users')
  const user = users.find(u => u.id === userId)
  const allPoints = readJSON<KnowledgePoint>('points.json', 'points')
  const allRelations = readJSON<Relation>('relations.json', 'relations')

  if (!user) return []

  const points = allPoints.filter(p => p.courseId === courseId)
  const pointIds = new Set(points.map(p => p.id))
  const relations = allRelations.filter(
    r => pointIds.has(r.sourceId) && pointIds.has(r.targetId)
  )

  const weakPoints = points
    .filter(p => {
      const score = user.scores[p.id]
      return score !== undefined && score < 60
    })
    .sort((a, b) => (user.scores[a.id] || 0) - (user.scores[b.id] || 0))

  if (weakPoints.length === 0) {
    return topologicalSortDFS(points, relations).slice(0, 5)
  }

  const prereqMap: Record<string, string[]> = {}
  points.forEach(p => (prereqMap[p.id] = []))
  relations.forEach(r => {
    prereqMap[r.targetId].push(r.sourceId)
  })

  const startPoint = weakPoints[0]
  const visited = new Set<string>()
  const path: string[] = []

  function collectPrereqs(pointId: string): void {
    if (visited.has(pointId) || path.length >= 5) return
    const prereqs = prereqMap[pointId] || []
    const weakPrereqs = prereqs
      .filter(pid => {
        const s = user.scores[pid]
        return s !== undefined && s < 60
      })
      .sort((a, b) => (user.scores[a] || 0) - (user.scores[b] || 0))

    for (const pid of weakPrereqs) {
      if (path.length >= 5) break
      collectPrereqs(pid)
    }

    if (path.length < 5 && !visited.has(pointId)) {
      visited.add(pointId)
      path.push(pointId)
    }
  }

  collectPrereqs(startPoint.id)
  return path.slice(0, 5)
}

const app = express()
app.use(cors())
app.use(express.json())

app.get('/api/courses', (_req: Request, res: Response) => {
  const courses = readJSON<Course>('courses.json', 'courses')
  res.json(courses)
})

app.post('/api/courses', (req: Request, res: Response) => {
  const courses = readJSON<Course>('courses.json', 'courses')
  const newCourse: Course = { id: uuidv4(), ...req.body }
  courses.push(newCourse)
  writeJSON('courses.json', 'courses', courses)
  res.json(newCourse)
})

app.put('/api/courses/:id', (req: Request, res: Response) => {
  const courses = readJSON<Course>('courses.json', 'courses')
  const idx = courses.findIndex(c => c.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Not found' })
  courses[idx] = { ...courses[idx], ...req.body }
  writeJSON('courses.json', 'courses', courses)
  res.json(courses[idx])
})

app.delete('/api/courses/:id', (req: Request, res: Response) => {
  let courses = readJSON<Course>('courses.json', 'courses')
  courses = courses.filter(c => c.id !== req.params.id)
  writeJSON('courses.json', 'courses', courses)
  res.json({ success: true })
})

app.get('/api/courses/:id/points', (req: Request, res: Response) => {
  const points = readJSON<KnowledgePoint>('points.json', 'points')
  res.json(points.filter(p => p.courseId === req.params.id))
})

app.post('/api/points', (req: Request, res: Response) => {
  const points = readJSON<KnowledgePoint>('points.json', 'points')
  const newPoint: KnowledgePoint = { id: uuidv4(), ...req.body }
  points.push(newPoint)
  writeJSON('points.json', 'points', points)
  res.json(newPoint)
})

app.put('/api/points/:id', (req: Request, res: Response) => {
  const points = readJSON<KnowledgePoint>('points.json', 'points')
  const idx = points.findIndex(p => p.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Not found' })
  points[idx] = { ...points[idx], ...req.body }
  writeJSON('points.json', 'points', points)
  res.json(points[idx])
})

app.delete('/api/points/:id', (req: Request, res: Response) => {
  let points = readJSON<KnowledgePoint>('points.json', 'points')
  points = points.filter(p => p.id !== req.params.id)
  writeJSON('points.json', 'points', points)
  res.json({ success: true })
})

app.get('/api/courses/:id/relations', (req: Request, res: Response) => {
  const points = readJSON<KnowledgePoint>('points.json', 'points')
  const coursePointIds = new Set(
    points.filter(p => p.courseId === req.params.id).map(p => p.id)
  )
  const relations = readJSON<Relation>('relations.json', 'relations')
  res.json(
    relations.filter(
      r => coursePointIds.has(r.sourceId) && coursePointIds.has(r.targetId)
    )
  )
})

app.post('/api/relations', (req: Request, res: Response) => {
  const relations = readJSON<Relation>('relations.json', 'relations')
  const exists = relations.some(
    r => r.sourceId === req.body.sourceId && r.targetId === req.body.targetId
  )
  if (exists) return res.status(400).json({ error: 'Relation exists' })
  const newRel: Relation = { id: uuidv4(), type: 'prerequisite', ...req.body }
  relations.push(newRel)
  writeJSON('relations.json', 'relations', relations)
  res.json(newRel)
})

app.delete('/api/relations/:id', (req: Request, res: Response) => {
  let relations = readJSON<Relation>('relations.json', 'relations')
  relations = relations.filter(r => r.id !== req.params.id)
  writeJSON('relations.json', 'relations', relations)
  res.json({ success: true })
})

app.get('/api/users', (_req: Request, res: Response) => {
  const users = readJSON<User>('users.json', 'users')
  res.json(users)
})

app.post('/api/users', (req: Request, res: Response) => {
  const users = readJSON<User>('users.json', 'users')
  const newUser: User = {
    id: uuidv4(),
    scores: {},
    reviewed: [],
    ...req.body
  }
  users.push(newUser)
  writeJSON('users.json', 'users', users)
  res.json(newUser)
})

app.put('/api/users/:id', (req: Request, res: Response) => {
  const users = readJSON<User>('users.json', 'users')
  const idx = users.findIndex(u => u.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Not found' })
  users[idx] = { ...users[idx], ...req.body }
  writeJSON('users.json', 'users', users)
  res.json(users[idx])
})

app.post('/api/recommend-path', (req: Request, res: Response) => {
  const { userId, courseId } = req.body
  const path = computeRecommendPath(userId, courseId)
  res.json({ path })
})

const PORT = 3001
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
