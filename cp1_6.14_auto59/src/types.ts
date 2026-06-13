export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done'

export type Priority = 'high' | 'medium' | 'low'

export interface Member {
  id: string
  name: string
  avatar: string
  color: string
}

export interface Task {
  id: string
  title: string
  status: TaskStatus
  assigneeId: string
  priority: Priority
  milestone: string
  description: string
  createdAt: number
  estimatedHours: number
  isNew?: boolean
}

export interface AppState {
  tasks: Task[]
  members: Member[]
  searchKeyword: string
}

export type ActionType =
  | 'INIT_DATA'
  | 'ADD_TASK'
  | 'CLEAR_NEW_FLAG'
  | 'UPDATE_TASK_STATUS'
  | 'UPDATE_TASK'
  | 'DELETE_TASK'
  | 'SET_SEARCH_KEYWORD'

export interface Action {
  type: ActionType
  payload?: any
}
