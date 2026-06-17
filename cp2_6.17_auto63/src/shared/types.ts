export interface Song {
  id: string
  title: string
  duration: number
  key: string
  tags: string[]
}

export interface City {
  id: string
  tourId: string
  name: string
  date: string
  venue: string
  latitude: number
  longitude: number
  notes: string
  songIds: string[]
  targetDuration: number
  audienceCount?: number
}

export interface Tour {
  id: string
  name: string
  musicianId: string
  createdAt: string
}

export interface SongChangeLog {
  cityId: string
  cityName: string
  timestamp: string
  action: 'add' | 'remove' | 'reorder'
  songTitle: string
}

export interface TourReport {
  tourId: string
  tourName: string
  totalDistance: number
  songChanges: SongChangeLog[]
  totalAudience: number
  cityReports: {
    cityName: string
    audienceCount: number
    songCount: number
  }[]
}

export interface DataStore {
  tours: Tour[]
  cities: City[]
  songs: Song[]
}
