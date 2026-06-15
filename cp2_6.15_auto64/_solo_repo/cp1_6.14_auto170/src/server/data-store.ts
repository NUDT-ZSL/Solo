import * as fs from 'fs'
import * as path from 'path'

export interface ItineraryItem {
  id: string
  time: string
  location: string
  description: string
  photos: string[]
  date: string
}

export interface Expense {
  id: string
  category: 'transport' | 'food' | 'accommodation' | 'ticket'
  amount: number
  note: string
  date: string
}

export interface Trip {
  id: string
  destination: string
  startDate: string
  endDate: string
  budget: number
  mood: string
  createdAt: string
  itinerary: ItineraryItem[]
  expenses: Expense[]
}

const DATA_DIR = path.join(__dirname, '..', '..', 'data')
const DATA_FILE = path.join(DATA_DIR, 'trips.json')

function ensureDataFile(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([]))
  }
}

function readTrips(): Trip[] {
  ensureDataFile()
  const data = fs.readFileSync(DATA_FILE, 'utf-8')
  return JSON.parse(data) as Trip[]
}

function writeTrips(trips: Trip[]): void {
  ensureDataFile()
  fs.writeFileSync(DATA_FILE, JSON.stringify(trips, null, 2))
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

export function getTrips(): Trip[] {
  return readTrips()
}

export function getTripById(id: string): Trip | undefined {
  const trips = readTrips()
  return trips.find(t => t.id === id)
}

export function createTrip(trip: Omit<Trip, 'id' | 'createdAt' | 'itinerary' | 'expenses'>): Trip {
  const trips = readTrips()
  const newTrip: Trip = {
    ...trip,
    id: generateId(),
    createdAt: new Date().toISOString(),
    itinerary: [],
    expenses: [],
  }
  trips.push(newTrip)
  writeTrips(trips)
  return newTrip
}

export function updateTrip(id: string, updates: Partial<Trip>): Trip | undefined {
  const trips = readTrips()
  const index = trips.findIndex(t => t.id === id)
  if (index === -1) return undefined
  trips[index] = { ...trips[index], ...updates }
  writeTrips(trips)
  return trips[index]
}

export function deleteTrip(id: string): boolean {
  const trips = readTrips()
  const index = trips.findIndex(t => t.id === id)
  if (index === -1) return false
  trips.splice(index, 1)
  writeTrips(trips)
  return true
}
