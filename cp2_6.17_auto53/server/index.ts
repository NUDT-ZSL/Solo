import express from 'express'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs/promises'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const dataDir = join(__dirname, 'data')

const app = express()
const port = 3001

app.use(cors())
app.use(express.json())

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
  detail: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  tags: string[]
  x: number
  y: number
}

interface Relationship {
  id: string
  courseId: string
  sourceId: string
  targetId: string
  anchorX: number
  anchorY: number
}

interface User {
  id: string
  name: string
  role: 'teacher' | 'student'
  courseId: string
}

interface Score {
  userId: string
  knowledgePointId: string
  score: number
}

async function readJsonFile<T>(filename: string): Promise<T[]> {
  const filePath = join(dataDir, filename)
  const content = await fs.readFile(filePath, 'utf-8')
  return JSON.parse(content) as T[]
}

async function writeJsonFile<T>(filename: string, data: T[]): Promise<void> {
  const filePath = join(dataDir, filename)
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

app.get('/api/courses', async (_req, res) => {
  try {
    const courses = await readJsonFile<Course>('courses.json')
    res.json(courses)
  } catch (error) {
    res.status(500).json({ error: 'Failed to read courses' })
  }
})

app.post('/api/courses', async (req, res) => {
  try {
    const { title, description, coverUrl } = req.body
    if (!title || !description) {
      res.status(400).json({ error: 'title and description are required' })
      return
    }
    const courses = await readJsonFile<Course>('courses.json')
    const newCourse: Course = {
      id: uuidv4(),
      title,
      description,
      coverUrl: coverUrl || '',
    }
    courses.push(newCourse)
    await writeJsonFile('courses.json', courses)
    res.status(201).json(newCourse)
  } catch (error) {
    res.status(500).json({ error: 'Failed to create course' })
  }
})

app.get('/api/courses/:courseId/knowledge-points', async (req, res) => {
  try {
    const knowledgePoints = await readJsonFile<KnowledgePoint>('knowledge-points.json')
    const filtered = knowledgePoints.filter(kp => kp.courseId === req.params.courseId)
    res.json(filtered)
  } catch (error) {
    res.status(500).json({ error: 'Failed to read knowledge points' })
  }
})

app.post('/api/courses/:courseId/knowledge-points', async (req, res) => {
  try {
    const { title, detail, difficulty, tags, x, y } = req.body
    if (!title || !detail || !difficulty) {
      res.status(400).json({ error: 'title, detail, and difficulty are required' })
      return
    }
    if (tags && tags.length > 5) {
      res.status(400).json({ error: 'tags must have at most 5 items' })
      return
    }
    const knowledgePoints = await readJsonFile<KnowledgePoint>('knowledge-points.json')
    const newKp: KnowledgePoint = {
      id: uuidv4(),
      courseId: req.params.courseId,
      title,
      detail,
      difficulty,
      tags: tags || [],
      x: x || 0,
      y: y || 0,
    }
    knowledgePoints.push(newKp)
    await writeJsonFile('knowledge-points.json', knowledgePoints)
    res.status(201).json(newKp)
  } catch (error) {
    res.status(500).json({ error: 'Failed to create knowledge point' })
  }
})

app.put('/api/knowledge-points/:id', async (req, res) => {
  try {
    const knowledgePoints = await readJsonFile<KnowledgePoint>('knowledge-points.json')
    const index = knowledgePoints.findIndex(kp => kp.id === req.params.id)
    if (index === -1) {
      res.status(404).json({ error: 'Knowledge point not found' })
      return
    }
    const updated = { ...knowledgePoints[index], ...req.body, id: knowledgePoints[index].id, courseId: knowledgePoints[index].courseId }
    knowledgePoints[index] = updated
    await writeJsonFile('knowledge-points.json', knowledgePoints)
    res.json(updated)
  } catch (error) {
    res.status(500).json({ error: 'Failed to update knowledge point' })
  }
})

app.delete('/api/knowledge-points/:id', async (req, res) => {
  try {
    const knowledgePoints = await readJsonFile<KnowledgePoint>('knowledge-points.json')
    const filtered = knowledgePoints.filter(kp => kp.id !== req.params.id)
    if (filtered.length === knowledgePoints.length) {
      res.status(404).json({ error: 'Knowledge point not found' })
      return
    }
    await writeJsonFile('knowledge-points.json', filtered)
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete knowledge point' })
  }
})

app.get('/api/courses/:courseId/relationships', async (req, res) => {
  try {
    const relationships = await readJsonFile<Relationship>('relationships.json')
    const filtered = relationships.filter(rel => rel.courseId === req.params.courseId)
    res.json(filtered)
  } catch (error) {
    res.status(500).json({ error: 'Failed to read relationships' })
  }
})

app.post('/api/courses/:courseId/relationships', async (req, res) => {
  try {
    const { sourceId, targetId } = req.body
    if (!sourceId || !targetId) {
      res.status(400).json({ error: 'sourceId and targetId are required' })
      return
    }
    const relationships = await readJsonFile<Relationship>('relationships.json')
    const knowledgePoints = await readJsonFile<KnowledgePoint>('knowledge-points.json')
    const source = knowledgePoints.find(kp => kp.id === sourceId)
    const target = knowledgePoints.find(kp => kp.id === targetId)
    const anchorX = source && target ? Math.round((source.x + target.x) / 2) : 0
    const anchorY = source && target ? Math.round((source.y + target.y) / 2) : 0
    const newRel: Relationship = {
      id: uuidv4(),
      courseId: req.params.courseId,
      sourceId,
      targetId,
      anchorX,
      anchorY,
    }
    relationships.push(newRel)
    await writeJsonFile('relationships.json', relationships)
    res.status(201).json(newRel)
  } catch (error) {
    res.status(500).json({ error: 'Failed to create relationship' })
  }
})

app.put('/api/relationships/:id', async (req, res) => {
  try {
    const relationships = await readJsonFile<Relationship>('relationships.json')
    const index = relationships.findIndex(rel => rel.id === req.params.id)
    if (index === -1) {
      res.status(404).json({ error: 'Relationship not found' })
      return
    }
    const updated = { ...relationships[index], ...req.body, id: relationships[index].id, courseId: relationships[index].courseId }
    relationships[index] = updated
    await writeJsonFile('relationships.json', relationships)
    res.json(updated)
  } catch (error) {
    res.status(500).json({ error: 'Failed to update relationship' })
  }
})

app.delete('/api/relationships/:id', async (req, res) => {
  try {
    const relationships = await readJsonFile<Relationship>('relationships.json')
    const filtered = relationships.filter(rel => rel.id !== req.params.id)
    if (filtered.length === relationships.length) {
      res.status(404).json({ error: 'Relationship not found' })
      return
    }
    await writeJsonFile('relationships.json', filtered)
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete relationship' })
  }
})

app.get('/api/users', async (_req, res) => {
  try {
    const users = await readJsonFile<User>('users.json')
    res.json(users)
  } catch (error) {
    res.status(500).json({ error: 'Failed to read users' })
  }
})

app.post('/api/users', async (req, res) => {
  try {
    const { name, role, courseId } = req.body
    if (!name || !role || !courseId) {
      res.status(400).json({ error: 'name, role, and courseId are required' })
      return
    }
    const users = await readJsonFile<User>('users.json')
    const newUser: User = {
      id: uuidv4(),
      name,
      role,
      courseId,
    }
    users.push(newUser)
    await writeJsonFile('users.json', users)
    res.status(201).json(newUser)
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user' })
  }
})

app.get('/api/users/:userId/scores', async (req, res) => {
  try {
    const scores = await readJsonFile<Score>('scores.json')
    const filtered = scores.filter(s => s.userId === req.params.userId)
    res.json(filtered)
  } catch (error) {
    res.status(500).json({ error: 'Failed to read scores' })
  }
})

app.post('/api/scores', async (req, res) => {
  try {
    const { userId, knowledgePointId, score } = req.body
    if (!userId || !knowledgePointId || score === undefined) {
      res.status(400).json({ error: 'userId, knowledgePointId, and score are required' })
      return
    }
    if (typeof score !== 'number' || score < 0 || score > 100) {
      res.status(400).json({ error: 'score must be a number between 0 and 100' })
      return
    }
    const scores = await readJsonFile<Score>('scores.json')
    const existingIndex = scores.findIndex(
      s => s.userId === userId && s.knowledgePointId === knowledgePointId
    )
    const scoreEntry: Score = { userId, knowledgePointId, score }
    if (existingIndex !== -1) {
      scores[existingIndex] = scoreEntry
    } else {
      scores.push(scoreEntry)
    }
    await writeJsonFile('scores.json', scores)
    res.json(scoreEntry)
  } catch (error) {
    res.status(500).json({ error: 'Failed to save score' })
  }
})

app.post('/api/review-path', async (req, res) => {
  try {
    const { userId, courseId } = req.body
    if (!userId || !courseId) {
      res.status(400).json({ error: 'userId and courseId are required' })
      return
    }

    const scores = await readJsonFile<Score>('scores.json')
    const relationships = await readJsonFile<Relationship>('relationships.json')
    const knowledgePoints = await readJsonFile<KnowledgePoint>('knowledge-points.json')

    const userScores = scores.filter(s => s.userId === userId)
    const courseRels = relationships.filter(r => r.courseId === courseId)
    const courseKps = knowledgePoints.filter(kp => kp.courseId === courseId)

    const scoreMap = new Map<string, number>()
    for (const s of userScores) {
      scoreMap.set(s.knowledgePointId, s.score)
    }

    const weakPointIds = new Set(
      courseKps
        .filter(kp => {
          const sc = scoreMap.get(kp.id)
          return sc !== undefined && sc < 60
        })
        .map(kp => kp.id)
    )

    if (weakPointIds.size === 0) {
      res.json([])
      return
    }

    const adjacency = new Map<string, string[]>()
    for (const rel of courseRels) {
      if (!adjacency.has(rel.sourceId)) {
        adjacency.set(rel.sourceId, [])
      }
      adjacency.get(rel.sourceId)!.push(rel.targetId)
    }

    function countReachable(startId: string, visited: Set<string>): number {
      visited.add(startId)
      let count = 0
      const neighbors = adjacency.get(startId) || []
      for (const neighbor of neighbors) {
        if (weakPointIds.has(neighbor) && !visited.has(neighbor)) {
          count += 1 + countReachable(neighbor, visited)
        }
      }
      return count
    }

    const weakWithReachable = Array.from(weakPointIds).map(id => ({
      id,
      reachable: countReachable(id, new Set<string>()),
    }))

    weakWithReachable.sort((a, b) => b.reachable - a.reachable)

    const prerequisites = new Map<string, string[]>()
    for (const rel of courseRels) {
      if (!prerequisites.has(rel.targetId)) {
        prerequisites.set(rel.targetId, [])
      }
      prerequisites.get(rel.targetId)!.push(rel.sourceId)
    }

    const path: string[] = []
    const visited = new Set<string>()

    function dfs(nodeId: string) {
      if (visited.has(nodeId)) return
      visited.add(nodeId)
      const pres = prerequisites.get(nodeId) || []
      for (const pre of pres) {
        if (weakPointIds.has(pre)) {
          dfs(pre)
        }
      }
      path.push(nodeId)
    }

    for (const item of weakWithReachable) {
      dfs(item.id)
    }

    res.json(path.slice(0, 5))
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate review path' })
  }
})

app.listen(port, () => {
  console.log('Server running on port 3001')
})
