import Datastore from 'nedb-promises'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dbPath = path.resolve(__dirname, 'data')

if (!fs.existsSync(dbPath)) {
  fs.mkdirSync(dbPath, { recursive: true })
}

export const photosDB = Datastore.create({
  filename: path.resolve(dbPath, 'photos.db'),
  autoload: true,
  timestampData: true
})

export const memoriesDB = Datastore.create({
  filename: path.resolve(dbPath, 'memories.db'),
  autoload: true,
  timestampData: true
})

export interface Photo {
  _id?: string
  id: string
  filename: string
  originalName: string
  dataUrl: string
  latitude?: number
  longitude?: number
  takenAt: string
  uploadedAt: string
  exif?: Record<string, unknown>
}

export interface Memory {
  _id?: string
  id: string
  photoId: string
  content: string
  createdAt: string
  updatedAt: string
}
