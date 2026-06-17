export interface Course {
  id: string
  title: string
  description: string
  coverUrl: string
}

export interface KnowledgePoint {
  id: string
  courseId: string
  title: string
  description: string
  difficulty: '初级' | '中级' | '高级'
  tags: string[]
  x: number
  y: number
}

export interface Relation {
  id: string
  sourceId: string
  targetId: string
  type: 'prerequisite'
}

export interface User {
  id: string
  name: string
  role: 'teacher' | 'student'
  scores: Record<string, number>
  reviewed: string[]
}

export const DIFFICULTY_COLORS: Record<KnowledgePoint['difficulty'], string> = {
  '初级': '#81c784',
  '中级': '#ffb74d',
  '高级': '#e57373'
}
