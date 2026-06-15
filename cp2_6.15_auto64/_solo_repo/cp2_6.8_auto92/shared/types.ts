export interface TimelineEvent {
  id: string
  date: string
  title: string
  description: string
  color: string
  x?: number
  y?: number
  lockedBy?: string
  lockedByName?: string
}

export interface Dependency {
  id: string
  from: string
  to: string
}

export interface Timeline {
  id: string
  title: string
  description: string
  shareCode: string
  events: TimelineEvent[]
  dependencies: Dependency[]
  createdAt: string
  updatedAt: string
}

export interface Collaborator {
  id: string
  name: string
  timelineId: string
}

export interface WSMessage {
  type:
    | 'join'
    | 'leave'
    | 'event_add'
    | 'event_update'
    | 'event_delete'
    | 'event_lock'
    | 'event_unlock'
    | 'dependency_add'
    | 'dependency_delete'
    | 'timeline_update'
  payload: any
  timelineId: string
  userId: string
  userName: string
}
