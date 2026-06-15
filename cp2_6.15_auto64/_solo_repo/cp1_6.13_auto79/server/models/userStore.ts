import Datastore from 'nedb-promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { createHash, randomBytes } from 'crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = path.join(__dirname, '../data/users.db')

const userStore = Datastore.create({
  filename: dbPath,
  autoload: true
})

userStore.on('load', async () => {
  try {
    await (userStore as any).ensureIndex({ fieldName: 'email', unique: true })
    await (userStore as any).ensureIndex({ fieldName: 'username', unique: true })
    await (userStore as any).ensureIndex({ fieldName: 'token' })
    console.log('[UserDB] Indexes ensured successfully')
  } catch (err) {
    console.warn('[UserDB] Index warning (safe to ignore on first run):', (err as Error).message)
  }
})

export interface UserHistory {
  recipe_id: string
  action: 'view' | 'like' | 'upload'
  timestamp: number
}

export interface User {
  _id?: string
  username: string
  email: string
  password_hash: string
  password_salt: string
  preference_tags: string[]
  auth_token?: string
  created_at: number
  last_login_at?: number
  history: UserHistory[]
  liked_recipes: string[]
  uploaded_recipes: string[]
}

export interface PublicUser {
  _id: string
  username: string
  email: string
  preference_tags: string[]
  auth_token?: string
  created_at: number
}

const hashPassword = (password: string, salt: string): string => {
  return createHash('sha256').update(password + salt).digest('hex')
}

const generateToken = (): string => {
  return randomBytes(32).toString('hex')
}

const toPublicUser = (user: User): PublicUser => {
  return {
    _id: user._id!,
    username: user.username,
    email: user.email,
    preference_tags: user.preference_tags,
    auth_token: user.auth_token,
    created_at: user.created_at
  }
}

export const registerUser = async (
  username: string,
  email: string,
  password: string,
  preferenceTags: string[]
): Promise<PublicUser | null> => {
  const existing = await userStore.findOne({ $or: [{ username }, { email }] })
  if (existing) return null

  const salt = randomBytes(16).toString('hex')
  const passwordHash = hashPassword(password, salt)
  const token = generateToken()

  const newUser: User = {
    username,
    email,
    password_hash: passwordHash,
    password_salt: salt,
    preference_tags: preferenceTags,
    auth_token: token,
    created_at: Date.now(),
    last_login_at: Date.now(),
    history: [],
    liked_recipes: [],
    uploaded_recipes: []
  }

  const inserted = await userStore.insert(newUser)
  return toPublicUser(inserted as User)
}

export const loginUser = async (email: string, password: string): Promise<PublicUser | null> => {
  const user = await userStore.findOne({ email }) as User | null
  if (!user) return null

  const testHash = hashPassword(password, user.password_salt)
  if (testHash !== user.password_hash) return null

  const token = generateToken()
  await userStore.update(
    { _id: user._id },
    { $set: { auth_token: token, last_login_at: Date.now() } },
    {}
  )

  const updatedUser = await userStore.findOne({ _id: user._id }) as User
  return toPublicUser(updatedUser)
}

export const getUserPreferences = async (id: string): Promise<string[] | null> => {
  const user = await userStore.findOne({ _id: id }) as User | null
  if (!user) return null
  return user.preference_tags
}

export const getUserByToken = async (token: string): Promise<PublicUser | null> => {
  const user = await userStore.findOne({ auth_token: token }) as User | null
  if (!user) return null
  return toPublicUser(user)
}

export const updateUserPreferences = async (id: string, preferences: string[]): Promise<boolean> => {
  const numAffected = await userStore.update(
    { _id: id },
    { $set: { preference_tags: preferences } },
    {}
  )
  return numAffected > 0
}

export const addUserHistory = async (
  userId: string,
  recipeId: string,
  action: UserHistory['action']
): Promise<boolean> => {
  const history: UserHistory = {
    recipe_id: recipeId,
    action,
    timestamp: Date.now()
  }

  const updates: Record<string, any> = {
    $push: {
      history: {
        $each: [history],
        $slice: -100
      }
    }
  }

  if (action === 'like') {
    updates.$addToSet = { liked_recipes: recipeId }
  }
  if (action === 'upload') {
    updates.$addToSet = { uploaded_recipes: recipeId }
  }

  const numAffected = await userStore.update({ _id: userId }, updates, {})
  return numAffected > 0
}

export const getUserFullData = async (id: string): Promise<User | null> => {
  const user = await userStore.findOne({ _id: id }) as User | null
  return user
}

export default {
  registerUser,
  loginUser,
  getUserPreferences,
  getUserByToken,
  updateUserPreferences,
  addUserHistory,
  getUserFullData
}
