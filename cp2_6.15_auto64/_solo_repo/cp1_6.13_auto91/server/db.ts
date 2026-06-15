import Datastore from 'nedb-promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export interface User {
  _id?: string
  id: string
  name: string
  avatar: string
  createdAt: number
}

export type SkillCategory = 'tech' | 'art' | 'life' | 'language'
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced'
export type SkillType = 'learn' | 'teach'

export interface Skill {
  _id?: string
  id: string
  userId: string
  name: string
  category: SkillCategory
  level: SkillLevel
  description: string
  type: SkillType
  createdAt: number
}

export interface Match {
  _id?: string
  id: string
  userIdA: string
  userIdB: string
  skillAId: string
  skillBId: string
  status: 'pending' | 'accepted' | 'rejected'
  createdAt: number
}

const dbDir = path.join(__dirname, '..', '.data')

const usersDb = Datastore.create({ filename: path.join(dbDir, 'users.db'), autoload: true })
const skillsDb = Datastore.create({ filename: path.join(dbDir, 'skills.db'), autoload: true })
const matchesDb = Datastore.create({ filename: path.join(dbDir, 'matches.db'), autoload: true })

export const db = {
  users: {
    async insert(user: User): Promise<User> {
      return usersDb.insert(user)
    },
    async findById(id: string): Promise<User | null> {
      return usersDb.findOne({ id })
    },
    async findAll(): Promise<User[]> {
      return usersDb.find({})
    },
    async update(id: string, update: Partial<User>): Promise<User | null> {
      await usersDb.update({ id }, { $set: update })
      return usersDb.findOne({ id })
    }
  },
  skills: {
    async insert(skill: Skill): Promise<Skill> {
      return skillsDb.insert(skill)
    },
    async findById(id: string): Promise<Skill | null> {
      return skillsDb.findOne({ id })
    },
    async findByUserId(userId: string): Promise<Skill[]> {
      return skillsDb.find({ userId }).sort({ createdAt: -1 })
    },
    async findAll(): Promise<Skill[]> {
      return skillsDb.find({}).sort({ createdAt: -1 })
    },
    async findByType(type: SkillType): Promise<Skill[]> {
      return skillsDb.find({ type }).sort({ createdAt: -1 })
    },
    async remove(id: string): Promise<number> {
      return skillsDb.remove({ id }, {})
    }
  },
  matches: {
    async insert(match: Match): Promise<Match> {
      return matchesDb.insert(match)
    },
    async findById(id: string): Promise<Match | null> {
      return matchesDb.findOne({ id })
    },
    async findByUserId(userId: string): Promise<Match[]> {
      return matchesDb.find({ $or: [{ userIdA: userId }, { userIdB: userId }] }).sort({ createdAt: -1 })
    },
    async findAll(): Promise<Match[]> {
      return matchesDb.find({}).sort({ createdAt: -1 })
    },
    async update(id: string, update: Partial<Match>): Promise<Match | null> {
      await matchesDb.update({ id }, { $set: update })
      return matchesDb.findOne({ id })
    }
  }
}
