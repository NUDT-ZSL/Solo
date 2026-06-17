import express, { Request, Response } from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 4000

app.use(cors())
app.use(express.json())

const DATA_DIR = path.join(__dirname, 'data')

type Difficulty = 'beginner' | 'intermediate' | 'advanced'

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
  difficulty: Difficulty
  tags: string[]
  x: number
  y: number
}

interface Relation {
  id: string
  courseId: string
  from: string
  to: string
}

interface User {
  id: string
  username: string
  name: string
  role: 'teacher' | 'student'
  email: string
}

interface AssessmentRecord {
  score: number
  reviewed: boolean
}

function readJSON<T>(filename: string): T {
  const raw = fs.readFileSync(path.join(DATA_DIR, filename), 'utf-8')
  return JSON.parse(raw)
}

function writeJSON(filename: string, data: unknown): void {
  fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2), 'utf-8')
}

app.get('/api/courses', (_req: Request, res: Response) => {
  const data = readJSON<{ courses: Course[] }>('courses.json')
  res.json(data.courses)
})

app.get('/api/courses/:id', (req: Request, res: Response) => {
  const data = readJSON<{ courses: Course[] }>('courses.json')
  const course = data.courses.find(c => c.id === req.params.id)
  if (!course) return res.status(404).json({ error: 'Course not found' })
  res.json(course)
})

app.post('/api/courses', (req: Request, res: Response) => {
  const data = readJSON<{ courses: Course[] }>('courses.json')
  const newCourse: Course = { id: uuidv4(), ...req.body }
  data.courses.push(newCourse)
  writeJSON('courses.json', data)
  res.status(201).json(newCourse)
})

app.put('/api/courses/:id', (req: Request, res: Response) => {
  const data = readJSON<{ courses: Course[] }>('courses.json')
  const idx = data.courses.findIndex(c => c.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Course not found' })
  data.courses[idx] = { ...data.courses[idx], ...req.body }
  writeJSON('courses.json', data)
  res.json(data.courses[idx])
})

app.delete('/api/courses/:id', (req: Request, res: Response) => {
  const data = readJSON<{ courses: Course[] }>('courses.json')
  data.courses = data.courses.filter(c => c.id !== req.params.id)
  writeJSON('courses.json', data)
  res.json({ success: true })
})

app.get('/api/courses/:courseId/knowledge-points', (req: Request, res: Response) => {
  const data = readJSON<{ knowledgePoints: KnowledgePoint[] }>('knowledgePoints.json')
  const points = data.knowledgePoints.filter(kp => kp.courseId === req.params.courseId)
  res.json(points)
})

app.post('/api/knowledge-points', (req: Request, res: Response) => {
  const data = readJSON<{ knowledgePoints: KnowledgePoint[] }>('knowledgePoints.json')
  const newKp: KnowledgePoint = { id: uuidv4(), x: 400, y: 300, ...req.body }
  data.knowledgePoints.push(newKp)
  writeJSON('knowledgePoints.json', data)
  res.status(201).json(newKp)
})

app.put('/api/knowledge-points/:id', (req: Request, res: Response) => {
  const data = readJSON<{ knowledgePoints: KnowledgePoint[] }>('knowledgePoints.json')
  const idx = data.knowledgePoints.findIndex(kp => kp.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Knowledge point not found' })
  data.knowledgePoints[idx] = { ...data.knowledgePoints[idx], ...req.body }
  writeJSON('knowledgePoints.json', data)
  res.json(data.knowledgePoints[idx])
})

app.delete('/api/knowledge-points/:id', (req: Request, res: Response) => {
  const kpData = readJSON<{ knowledgePoints: KnowledgePoint[] }>('knowledgePoints.json')
  kpData.knowledgePoints = kpData.knowledgePoints.filter(kp => kp.id !== req.params.id)
  writeJSON('knowledgePoints.json', kpData)

  const relData = readJSON<{ relations: Relation[] }>('relations.json')
  relData.relations = relData.relations.filter(r => r.from !== req.params.id && r.to !== req.params.id)
  writeJSON('relations.json', relData)

  res.json({ success: true })
})

app.get('/api/courses/:courseId/relations', (req: Request, res: Response) => {
  const data = readJSON<{ relations: Relation[] }>('relations.json')
  const rels = data.relations.filter(r => r.courseId === req.params.courseId)
  res.json(rels)
})

app.post('/api/relations', (req: Request, res: Response) => {
  const data = readJSON<{ relations: Relation[] }>('relations.json')
  const exists = data.relations.some(r => r.from === req.body.from && r.to === req.body.to)
  if (exists) return res.status(400).json({ error: 'Relation already exists' })
  const newRel: Relation = { id: uuidv4(), ...req.body }
  data.relations.push(newRel)
  writeJSON('relations.json', data)
  res.status(201).json(newRel)
})

app.delete('/api/relations/:id', (req: Request, res: Response) => {
  const data = readJSON<{ relations: Relation[] }>('relations.json')
  data.relations = data.relations.filter(r => r.id !== req.params.id)
  writeJSON('relations.json', data)
  res.json({ success: true })
})

app.get('/api/users', (_req: Request, res: Response) => {
  const data = readJSON<{ users: User[] }>('users.json')
  res.json(data.users)
})

app.get('/api/users/:id', (req: Request, res: Response) => {
  const data = readJSON<{ users: User[] }>('users.json')
  const user = data.users.find(u => u.id === req.params.id)
  if (!user) return res.status(404).json({ error: 'User not found' })
  res.json(user)
})

app.get('/api/users/:userId/assessments', (req: Request, res: Response) => {
  const data = readJSON<{ assessments: Record<string, Record<string, AssessmentRecord>> }>('users.json')
  const assessments = data.assessments[req.params.userId] || {}
  res.json(assessments)
})

app.put('/api/users/:userId/assessments/:kpId', (req: Request, res: Response) => {
  const data = readJSON<{ assessments: Record<string, Record<string, AssessmentRecord>> }>('users.json')
  if (!data.assessments[req.params.userId]) {
    data.assessments[req.params.userId] = {}
  }
  data.assessments[req.params.userId][req.params.kpId] = {
    ...data.assessments[req.params.userId][req.params.kpId],
    ...req.body
  }
  writeJSON('users.json', data)
  res.json(data.assessments[req.params.userId][req.params.kpId])
})

app.get('/api/users/:userId/recommend-path', (req: Request, res: Response) => {
  const courseId = req.query.courseId as string
  if (!courseId) return res.status(400).json({ error: 'courseId is required' })

  const userData = readJSON<{ assessments: Record<string, Record<string, AssessmentRecord>> }>('users.json')
  const assessments = userData.assessments[req.params.userId] || {}

  const kpData = readJSON<{ knowledgePoints: KnowledgePoint[] }>('knowledgePoints.json')
  const kps = kpData.knowledgePoints.filter(kp => kp.courseId === courseId)

  const relData = readJSON<{ relations: Relation[] }>('relations.json')
  const relations = relData.relations.filter(r => r.courseId === courseId)

  const adjList: Record<string, string[]> = {}
  const inDegree: Record<string, number> = {}
  kps.forEach(kp => {
    adjList[kp.id] = []
    inDegree[kp.id] = 0
  })
  relations.forEach(r => {
    if (adjList[r.from]) {
      adjList[r.from].push(r.to)
      inDegree[r.to] = (inDegree[r.to] || 0) + 1
    }
  })

  const weakPoints = kps
    .filter(kp => {
      const score = assessments[kp.id]?.score ?? 0
      return score < 60
    })
    .sort((a, b) => (assessments[a.id]?.score ?? 0) - (assessments[b.id]?.score ?? 0))

  function dfsTopo(nodeId: string, visited: Set<string>, path: string[]): void {
    if (visited.has(nodeId) || path.length >= 5) return
    visited.add(nodeId)
    path.push(nodeId)

    for (const next of adjList[nodeId] || []) {
      if (!visited.has(next) && path.length < 5) {
        dfsTopo(next, visited, path)
      }
    }
  }

  const result: string[] = []
  const visited = new Set<string>()

  for (const wp of weakPoints) {
    if (result.length >= 5) break

    const prerequisites: string[] = []
    function findPrereqs(nodeId: string, seen: Set<string>): void {
      if (seen.has(nodeId)) return
      seen.add(nodeId)
      for (const r of relations) {
        if (r.to === nodeId && !seen.has(r.from)) {
          findPrereqs(r.from, seen)
          prerequisites.push(r.from)
        }
      }
    }
    findPrereqs(wp.id, new Set())

    for (const pre of prerequisites) {
      if (result.length >= 5) break
      if (!visited.has(pre) && (assessments[pre]?.score ?? 0) < 60) {
        dfsTopo(pre, visited, result)
      }
    }

    if (result.length < 5 && !visited.has(wp.id)) {
      dfsTopo(wp.id, visited, result)
    }
  }

  const finalPath = result.slice(0, 5)
  res.json(finalPath)
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
