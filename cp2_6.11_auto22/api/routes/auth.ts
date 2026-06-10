import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { users } from '../store.js'

const router = Router()

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' })
    return
  }

  for (const user of users.values()) {
    if (user.email === email) {
      res.status(409).json({ error: 'User already exists' })
      return
    }
  }

  const id = uuidv4()
  const user = { id, email, password }
  users.set(id, user)

  const token = Buffer.from(JSON.stringify({ userId: id, email })).toString('base64')

  res.status(201).json({ user: { id, email }, token })
})

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' })
    return
  }

  let foundUser = null
  for (const user of users.values()) {
    if (user.email === email) {
      foundUser = user
      break
    }
  }

  if (!foundUser || foundUser.password !== password) {
    res.status(401).json({ error: 'Invalid email or password' })
    return
  }

  const token = Buffer.from(JSON.stringify({ userId: foundUser.id, email: foundUser.email })).toString('base64')

  res.json({ user: { id: foundUser.id, email: foundUser.email }, token })
})

export default router
