import { v4 as uuidv4 } from 'uuid'

export interface Note {
  pitch: number
  time: number
  duration: number
  velocity: number
}

export interface Composition {
  id: string
  notes: Note[]
  velocities: number[]
  createdAt: number
  likes: number
  hash: string
}

const compositions: Map<string, Composition> = new Map()
const hashToId: Map<string, string> = new Map()

function generateShortHash(): string {
  return Math.random().toString(36).substring(2, 10)
}

export function createComposition(notes: Note[], velocities: number[]): Composition {
  const id = uuidv4()
  let hash = generateShortHash()
  while (hashToId.has(hash)) {
    hash = generateShortHash()
  }

  const composition: Composition = {
    id,
    notes,
    velocities,
    createdAt: Date.now(),
    likes: 0,
    hash
  }

  compositions.set(id, composition)
  hashToId.set(hash, id)
  return composition
}

export function getCompositionById(id: string): Composition | undefined {
  return compositions.get(id)
}

export function getCompositionByHash(hash: string): Composition | undefined {
  const id = hashToId.get(hash)
  return id ? compositions.get(id) : undefined
}

export function listCompositions(page: number = 1, pageSize: number = 6): {
  items: Composition[]
  total: number
  page: number
  pageSize: number
  totalPages: number
} {
  const all = Array.from(compositions.values()).sort((a, b) => b.likes - a.likes)
  const total = all.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = (safePage - 1) * pageSize
  const items = all.slice(start, start + pageSize)

  return {
    items,
    total,
    page: safePage,
    pageSize,
    totalPages
  }
}

export function likeComposition(id: string): Composition | undefined {
  const comp = compositions.get(id)
  if (comp) {
    comp.likes += 1
    compositions.set(id, comp)
    return comp
  }
  return undefined
}
