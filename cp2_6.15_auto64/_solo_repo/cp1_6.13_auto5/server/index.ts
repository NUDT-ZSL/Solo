import express from 'express'
import cors from 'cors'
import './database.js'
import recipesRouter from './routes/recipes.js'
import inventoryRouter from './routes/inventory.js'
import shoppingListRouter from './routes/shoppingList.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

app.get('/', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use('/api/recipes', recipesRouter)
app.use('/api/inventory', inventoryRouter)
app.use('/api/shopping-list', shoppingListRouter)

app.listen(PORT, () => {
  console.log(`Reciptify server running on http://localhost:${PORT}`)
})

export default app
