export interface Artwork {
  id: string
  name: string
  artist: string
  year: number
  material: string
  size: string
  description: string
  zone: string
  image: string
}

export interface Exhibition {
  id: string
  name: string
  startDate: string
  endDate: string
  status: 'upcoming' | 'ongoing' | 'ended'
  zones: string[]
  artworks: Artwork[]
  createdAt: string
}

export interface ExhibitionListItem {
  id: string
  name: string
  startDate: string
  endDate: string
  status: 'upcoming' | 'ongoing' | 'ended'
  zones: string[]
  artworkCount: number
}

export interface Feedback {
  id: string
  exhibitionId: string
  rating: number
  content: string
  visitorName: string
  createdAt: string
}
