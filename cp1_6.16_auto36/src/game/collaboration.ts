export interface User {
  id: string
  name: string
  avatarColor: string
  piecesCompleted: number
  isOnline: boolean
}

export interface CollaborationState {
  users: Map<string, User>
  roomId: string
}

const AVATAR_COLORS = [
  '#3498DB',
  '#E74C3C',
  '#2ECC71',
  '#F39C12',
  '#9B59B6',
  '#1ABC9C',
  '#E91E63',
  '#00BCD4',
]

function getRandomColor(): string {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase()
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

export function createUser(id: string, name: string): User {
  return {
    id,
    name,
    avatarColor: getRandomColor(),
    piecesCompleted: 0,
    isOnline: true,
  }
}

export function addUser(state: CollaborationState, user: User): CollaborationState {
  const newUsers = new Map(state.users)
  newUsers.set(user.id, user)
  return { ...state, users: newUsers }
}

export function removeUser(state: CollaborationState, userId: string): CollaborationState {
  const newUsers = new Map(state.users)
  const user = newUsers.get(userId)
  if (user) {
    newUsers.set(userId, { ...user, isOnline: false })
  }
  return { ...state, users: newUsers }
}

export function updateUserProgress(
  state: CollaborationState,
  userId: string,
  piecesCompleted: number
): CollaborationState {
  const newUsers = new Map(state.users)
  const user = newUsers.get(userId)
  if (user) {
    newUsers.set(userId, { ...user, piecesCompleted })
  }
  return { ...state, users: newUsers }
}

export function incrementUserProgress(
  state: CollaborationState,
  userId: string,
  increment: number = 1
): CollaborationState {
  const newUsers = new Map(state.users)
  const user = newUsers.get(userId)
  if (user) {
    newUsers.set(userId, { ...user, piecesCompleted: user.piecesCompleted + increment })
  }
  return { ...state, users: newUsers }
}

export function getUsersList(state: CollaborationState): User[] {
  return Array.from(state.users.values())
}

export function getOnlineUsers(state: CollaborationState): User[] {
  return getUsersList(state).filter((u) => u.isOnline)
}

export function getSortedUsersByProgress(state: CollaborationState): User[] {
  return getUsersList(state).sort((a, b) => b.piecesCompleted - a.piecesCompleted)
}

export function getTotalPiecesCompleted(state: CollaborationState): number {
  return getUsersList(state).reduce((sum, user) => sum + user.piecesCompleted, 0)
}

export function getUserRank(state: CollaborationState, userId: string): number {
  const sorted = getSortedUsersByProgress(state)
  const index = sorted.findIndex((u) => u.id === userId)
  return index >= 0 ? index + 1 : -1
}

export function createCollaborationState(roomId: string): CollaborationState {
  return {
    users: new Map(),
    roomId,
  }
}

export interface ChatMessage {
  id: string
  userId: string
  userName: string
  content: string
  timestamp: number
}

export function createChatMessage(
  id: string,
  userId: string,
  userName: string,
  content: string
): ChatMessage {
  return {
    id,
    userId,
    userName,
    content,
    timestamp: Date.now(),
  }
}
