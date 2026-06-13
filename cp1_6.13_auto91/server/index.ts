import express from 'express'
import cors from 'cors'
import routes from './routes.js'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

app.use(routes)

app.listen(PORT, () => {
  console.log(`SkillSwap server is running on http://localhost:${PORT}`)
})
