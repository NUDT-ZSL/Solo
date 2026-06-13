import Datastore from 'nedb-promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { createHash, randomBytes } from 'crypto'
import { v4 as uuidv4 } from 'uuid'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = path.join(__dirname, '../data/users.db')

const userStore = Datastore.create({
  filename: dbPath,
  autoload: true
})

export interface User {
  _id?: string
  username: string
  email: string
  passwordHash: string
  salt: string
  preferences: string[]
  token?: string
  createdAt: number
}

export interface PublicUser {
  _id: string
  username: string
  email: string
  preferences: string[]
  token?: string
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
    preferences: user.preferences,
    token: user.token
  }
}

export const registerUser = async (
  username: string,
  email: string,
  password: string,
  preferences: string[]
): Promise<PublicUser | null> => {
  const existing = await userStore.findOne({ $or: [{ username }, { email }] })
  if (existing) return null

  const salt = randomBytes(16).toString('hex')
  const passwordHash = hashPassword(password, salt)
  const token = generateToken()

  const newUser: User = {
    username,
    email,
    passwordHash,
    salt,
    preferences,
    token,
    createdAt: Date.now()
  }

  const inserted = await userStore.insert(newUser)
  return toPublicUser(inserted as User)
}

export const loginUser = async (email: string, password: string): Promise<PublicUser | null> => {
  const user = await userStore.findOne({ email }) as User | null
  if (!user) return null

  const testHash = hashPassword(password, user.salt)
  if (testHash !== user.passwordHash) return null

  const token = generateToken()
  await userStore.update({ _id: user._id }, { $set: { token } }, {})

  const updatedUser = await userStore.findOne({ _id: user._id }) as User
  return toPublicUser(updatedUser)
}

export const getUserPreferences = async (id: string): Promise<string[] | null> => {
  const user = await userStore.findOne({ _id: id }) as User | null
  if (!user) return null
  return user.preferences
}

export const getUserByToken = async (token: string): Promise<PublicUser | null> => {
  const user = await userStore.findOne({ token }) as User | null
  if (!user) return null
  return toPublicUser(user)
}

export const updateUserPreferences = async (id: string, preferences: string[]): Promise<boolean> => {
  const numAffected = await userStore.update({ _id: id }, { $set: { preferences } }, {})
  return numAffected > 0
}

export default {
  registerUser,
  loginUser,
  getUserPreferences,
  getUserByToken,
  updateUserPreferences
}
