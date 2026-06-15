export interface Work {
  id: number
  title: string
  description: string
  coverImage: string
  category: string
  createdAt: string
  viewCount: number
}

export interface Comment {
  id: number
  workId: number
  nickname: string
  content: string
  createdAt: string
}

export interface VisitTrendItem {
  date: string
  count: number
}

export interface StatsData {
  totalVisits: number
  todayVisits: number
  visitTrend: VisitTrendItem[]
  topWorks: Work[]
}

export interface ApiResponse<T> {
  code: number
  data: T
  message: string
}
