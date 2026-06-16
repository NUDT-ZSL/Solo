import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DATA_DIR = path.join(__dirname, '..', 'data')

export async function readJsonFile<T>(filename: string): Promise<T> {
  const filePath = path.join(DATA_DIR, filename)
  const data = await fs.readFile(filePath, 'utf-8')
  return JSON.parse(data) as T
}

export async function writeJsonFile<T>(filename: string, data: T): Promise<void> {
  const filePath = path.join(DATA_DIR, filename)
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
}
