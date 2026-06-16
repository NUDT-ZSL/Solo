export type PlantStatus = 'available' | 'adopted' | 'caring'

export interface Plant {
  id: string
  name: string
  species: string
  description: string
  lat: number
  lng: number
  status: PlantStatus
  adoptedBy?: string
  imageUrl?: string
  plantedDate?: string
  location: string
}

export interface User {
  id: string
  name: string
  avatar?: string
  points: number
  adoptedPlants: string[]
}

export interface CareLog {
  id: string
  plantId: string
  userId: string
  date: string
  content: string
  photoUrl?: string
  healthScore: number
}

export interface PlantWithAdoptionInfo {
  lastLogDate?: string
  consecutiveDays: number
}
