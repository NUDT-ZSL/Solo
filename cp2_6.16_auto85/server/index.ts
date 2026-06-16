import express from 'express'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 3001

const dataDir = path.join(__dirname, '..', 'data')
const recipesFile = path.join(dataDir, 'recipes.json')
const versionsFile = path.join(dataDir, 'versions.json')

app.use(cors())
app.use(express.json({ limit: '10mb' }))

function readJSON<T>(filePath: string): T[] {
  if (!fs.existsSync(filePath)) {
    return []
  }
  const content = fs.readFileSync(filePath, 'utf-8')
  return content ? JSON.parse(content) : []
}

function writeJSON<T>(filePath: string, data: T[]): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

interface Ingredient {
  id: string
  name: string
  quantity: string
  unit: string
}

interface Step {
  id: string
  text: string
  image?: string
}

interface Recipe {
  id: string
  name: string
  description: string
  cookTime: number
  cuisine: 'chinese' | 'western' | 'japanese' | 'fusion'
  ingredients: Ingredient[]
  steps: Step[]
  createdAt: string
  updatedAt: string
}

interface Version {
  id: string
  recipeId: string
  timestamp: string
  summary: string
  snapshot: Recipe
  restoredFrom?: string
}

function generateVersionSummary(oldRecipe: Recipe | null, newRecipe: Recipe): string {
  const changes: string[] = []

  if (!oldRecipe) {
    return '创建初始版本'
  }

  if (oldRecipe.name !== newRecipe.name) {
    changes.push('修改菜名')
  }
  if (oldRecipe.description !== newRecipe.description) {
    changes.push('修改描述')
  }
  if (oldRecipe.cookTime !== newRecipe.cookTime) {
    changes.push('修改预估耗时')
  }
  if (oldRecipe.cuisine !== newRecipe.cuisine) {
    changes.push('修改菜系')
  }
  if (oldRecipe.ingredients.length !== newRecipe.ingredients.length) {
    changes.push('调整食材列表')
  }
  if (oldRecipe.steps.length !== newRecipe.steps.length) {
    changes.push('调整步骤数量')
  } else {
    const stepTextsChanged = oldRecipe.steps.some(
      (s, i) => s.text !== newRecipe.steps[i]?.text
    )
    if (stepTextsChanged) {
      changes.push('修改步骤内容')
    }
  }

  return changes.length > 0 ? changes.join('、') : '微调配方'
}

app.get('/api/recipes', (req, res) => {
  const recipes = readJSON<Recipe>(recipesFile)
  const sorted = recipes.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )
  res.json(sorted)
})

app.get('/api/recipes/:id', (req, res) => {
  const recipes = readJSON<Recipe>(recipesFile)
  const recipe = recipes.find((r) => r.id === req.params.id)
  if (!recipe) {
    res.status(404).json({ error: '配方不存在' })
    return
  }
  res.json(recipe)
})

app.post('/api/recipes', (req, res) => {
  const recipes = readJSON<Recipe>(recipesFile)
  const versions = readJSON<Version>(versionsFile)

  const now = new Date().toISOString()
  const newRecipe: Recipe = {
    id: uuidv4(),
    name: req.body.name,
    description: req.body.description,
    cookTime: req.body.cookTime,
    cuisine: req.body.cuisine,
    ingredients: req.body.ingredients || [],
    steps: req.body.steps || [],
    createdAt: now,
    updatedAt: now
  }

  recipes.push(newRecipe)
  writeJSON(recipesFile, recipes)

  const initialVersion: Version = {
    id: uuidv4(),
    recipeId: newRecipe.id,
    timestamp: now,
    summary: '创建初始版本',
    snapshot: { ...newRecipe }
  }
  versions.push(initialVersion)
  writeJSON(versionsFile, versions)

  res.status(201).json(newRecipe)
})

app.put('/api/recipes/:id', (req, res) => {
  const recipes = readJSON<Recipe>(recipesFile)
  const versions = readJSON<Version>(versionsFile)

  const index = recipes.findIndex((r) => r.id === req.params.id)
  if (index === -1) {
    res.status(404).json({ error: '配方不存在' })
    return
  }

  const oldRecipe = recipes[index]
  const now = new Date().toISOString()

  const updatedRecipe: Recipe = {
    ...oldRecipe,
    name: req.body.name ?? oldRecipe.name,
    description: req.body.description ?? oldRecipe.description,
    cookTime: req.body.cookTime ?? oldRecipe.cookTime,
    cuisine: req.body.cuisine ?? oldRecipe.cuisine,
    ingredients: req.body.ingredients ?? oldRecipe.ingredients,
    steps: req.body.steps ?? oldRecipe.steps,
    updatedAt: now
  }

  recipes[index] = updatedRecipe
  writeJSON(recipesFile, recipes)

  const summary = generateVersionSummary(oldRecipe, updatedRecipe)
  const newVersion: Version = {
    id: uuidv4(),
    recipeId: updatedRecipe.id,
    timestamp: now,
    summary,
    snapshot: { ...updatedRecipe }
  }
  versions.push(newVersion)
  writeJSON(versionsFile, versions)

  res.json(updatedRecipe)
})

app.delete('/api/recipes/:id', (req, res) => {
  let recipes = readJSON<Recipe>(recipesFile)
  let versions = readJSON<Version>(versionsFile)

  const index = recipes.findIndex((r) => r.id === req.params.id)
  if (index === -1) {
    res.status(404).json({ error: '配方不存在' })
    return
  }

  recipes = recipes.filter((r) => r.id !== req.params.id)
  versions = versions.filter((v) => v.recipeId !== req.params.id)

  writeJSON(recipesFile, recipes)
  writeJSON(versionsFile, versions)

  res.json({ success: true })
})

app.get('/api/versions/:recipeId', (req, res) => {
  const versions = readJSON<Version>(versionsFile)
  const recipeVersions = versions
    .filter((v) => v.recipeId === req.params.recipeId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  res.json(recipeVersions)
})

app.post('/api/versions/:recipeId/restore/:versionId', (req, res) => {
  const recipes = readJSON<Recipe>(recipesFile)
  const versions = readJSON<Version>(versionsFile)

  const recipeIndex = recipes.findIndex((r) => r.id === req.params.recipeId)
  if (recipeIndex === -1) {
    res.status(404).json({ error: '配方不存在' })
    return
  }

  const targetVersion = versions.find(
    (v) => v.id === req.params.versionId && v.recipeId === req.params.recipeId
  )
  if (!targetVersion) {
    res.status(404).json({ error: '版本不存在' })
    return
  }

  const oldRecipe = recipes[recipeIndex]
  const now = new Date().toISOString()
  const versionNumber =
    versions.filter(
      (v) =>
        v.recipeId === req.params.recipeId &&
        new Date(v.timestamp).getTime() <= new Date(targetVersion.timestamp).getTime()
    ).length || 1

  const restoredRecipe: Recipe = {
    ...targetVersion.snapshot,
    id: oldRecipe.id,
    createdAt: oldRecipe.createdAt,
    updatedAt: now
  }

  recipes[recipeIndex] = restoredRecipe
  writeJSON(recipesFile, recipes)

  const restoreVersion: Version = {
    id: uuidv4(),
    recipeId: restoredRecipe.id,
    timestamp: now,
    summary: `从版本 ${versionNumber} 恢复`,
    snapshot: { ...restoredRecipe },
    restoredFrom: targetVersion.id
  }
  versions.push(restoreVersion)
  writeJSON(versionsFile, versions)

  res.json({ recipe: restoredRecipe, version: restoreVersion })
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
