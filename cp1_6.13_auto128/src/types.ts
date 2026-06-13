export interface Member {
  id: string
  name: string
  avatar: string
  role: string
}

export interface TimelineNode {
  stage: string
  date: string
  completed: boolean
}

export interface Project {
  _id: string
  name: string
  genres: string[]
  description: string
  status: '创作中' | '排练中' | '已发布'
  themeColor: string
  inviteCode: string
  leaderId: string
  members: Member[]
  timeline: TimelineNode[]
  createdAt: string
  updatedAt: string
  confirmations?: StageConfirmation[]
}

export interface Paragraph {
  _id: string
  projectId: string
  name: string
  rhythm: string
  notes: string
  order: number
  position: { x: number; y: number }
  connections: Connection[]
}

export interface Connection {
  targetId: string
  label?: string
}

export interface StageConfirmation {
  _id: string
  projectId: string
  stageIndex: number
  stageName: string
  confirmedBy: string[]
  allConfirmed: boolean
}

export interface AppState {
  user: {
    id: string
    name: string
    avatar: string
  } | null
  projects: Project[]
  currentProject: Project | null
  paragraphs: Paragraph[]
  sidebarCollapsed: boolean
  loading: boolean
}

export type AppAction =
  | { type: 'SET_USER'; payload: AppState['user'] }
  | { type: 'SET_PROJECTS'; payload: Project[] }
  | { type: 'ADD_PROJECT'; payload: Project }
  | { type: 'SET_CURRENT_PROJECT'; payload: Project | null }
  | { type: 'UPDATE_PROJECT'; payload: Project }
  | { type: 'SET_PARAGRAPHS'; payload: Paragraph[] }
  | { type: 'ADD_PARAGRAPH'; payload: Paragraph }
  | { type: 'UPDATE_PARAGRAPH'; payload: Paragraph }
  | { type: 'REMOVE_PARAGRAPH'; payload: string }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'ADD_MEMBER'; payload: { projectId: string; member: Member } }
  | { type: 'UPDATE_CONFIRMATIONS'; payload: StageConfirmation[] }
