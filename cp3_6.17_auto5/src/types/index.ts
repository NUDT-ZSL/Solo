export type Difficulty = 'beginner' | 'intermediate' | 'advanced'

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
  difficulty: Difficulty
  tags: string[]
  x: number
  y: number
}

export interface Relation {
  id: string
  courseId: string
  from: string
  to: string
}

export interface User {
  id: string
  username: string
  name: string
  role: 'teacher' | 'student'
  email: string
}

export interface AssessmentRecord {
  score: number
  reviewed: boolean
}

export type AssessmentsMap = Record<string, AssessmentRecord>
