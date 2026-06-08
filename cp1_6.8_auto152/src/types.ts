export type SmellType = 'food' | 'nature' | 'urban' | 'floral' | 'industrial' | 'other'
export type Sentiment = 'pleasant' | 'neutral' | 'unpleasant'

export interface Comment {
  id: string
  authorId: string
  authorName: string
  content: string
  rating: number
  createdAt: string
}

export interface SmellMark {
  id: string
  name: string
  type: SmellType
  emoji: string
  lat: number
  lng: number
  rating: number
  sentiment: Sentiment
  tags: string[]
  authorId: string
  createdAt: string
  comments: Comment[]
}

export interface HeatmapCell {
  lat: number
  lng: number
  density: number
  sentiment: number
}

export interface CreateSmellDTO {
  name: string
  type: SmellType
  emoji: string
  lat: number
  lng: number
  sentiment: Sentiment
  tags: string[]
  authorId: string
}

export interface UpdateSmellDTO {
  name?: string
  type?: SmellType
  emoji?: string
  sentiment?: Sentiment
  tags?: string[]
}

export interface CreateCommentDTO {
  authorId: string
  authorName: string
  content: string
  rating: number
}

export interface WSMessage {
  type: 'smell_created' | 'smell_updated' | 'smell_deleted' | 'comment_added'
  payload: SmellMark | Comment | { id: string }
}

export const SMELL_TYPE_CONFIG: Record<SmellType, { label: string; emoji: string; color: string }> = {
  food: { label: '美食', emoji: '🍽️', color: '#E8A87C' },
  nature: { label: '自然', emoji: '🌿', color: '#6B9E7A' },
  urban: { label: '城市', emoji: '🏙️', color: '#7B8FA1' },
  floral: { label: '花香', emoji: '🌸', color: '#D4A0B0' },
  industrial: { label: '工业', emoji: '🏭', color: '#8B8B83' },
  other: { label: '其他', emoji: '✨', color: '#B8A9C9' },
}

export const SENTIMENT_CONFIG: Record<Sentiment, { label: string; color: string; score: number }> = {
  pleasant: { label: '愉悦', color: '#2D6A3E', score: 1 },
  neutral: { label: '中性', color: '#856404', score: 0 },
  unpleasant: { label: '不悦', color: '#721C24', score: -1 },
}
