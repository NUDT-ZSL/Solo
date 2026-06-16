import { create } from 'zustand'

interface Activity {
  id: string
  title: string
  description: string
  date: string
  status: '进行中' | '已结束'
  registrations: string[]
  claimedBy: string[]
  hoursLogged: { userId: string; hours: number }[]
  createdAt: string
}

interface User {
  id: string
  name: string
  role: '管理员' | '普通用户' | '志愿者'
  registeredActivities: string[]
  claimedTasks: string[]
  totalHours: number
}

interface AppState {
  activities: Activity[]
  currentUser: User | null
  users: User[]
  loading: boolean
  error: string | null
  filter: '全部' | '进行中' | '已结束'
  showCreateForm: boolean
  toastMessage: string | null
  confirmModal: { show: boolean; activityId: string; userId: string } | null
  logHoursModal: { show: boolean; activityId: string; userId: string } | null

  fetchActivities: () => Promise<void>
  fetchUsers: () => Promise<void>
  createActivity: (title: string, description: string, date: string) => Promise<void>
  registerActivity: (activityId: string) => Promise<void>
  claimTask: (activityId: string) => Promise<void>
  logHours: (activityId: string, hours: number) => Promise<void>
  setCurrentUser: (user: User) => void
  setFilter: (filter: '全部' | '进行中' | '已结束') => void
  setShowCreateForm: (show: boolean) => void
  showToast: (message: string) => void
  setConfirmModal: (modal: { show: boolean; activityId: string; userId: string } | null) => void
  setLogHoursModal: (modal: { show: boolean; activityId: string; userId: string } | null) => void
}

export const useStore = create<AppState>((set, get) => ({
  activities: [],
  currentUser: null,
  users: [],
  loading: false,
  error: null,
  filter: '全部',
  showCreateForm: false,
  toastMessage: null,
  confirmModal: null,
  logHoursModal: null,

  fetchActivities: async () => {
    set({ loading: true, error: null })
    try {
      const res = await fetch('/api/activities')
      if (!res.ok) throw new Error('获取活动失败')
      const activities = await res.json()
      set({ activities, loading: false })
    } catch (err) {
      set({ error: (err as Error).message, loading: false })
    }
  },

  fetchUsers: async () => {
    try {
      const res = await fetch('/api/users')
      if (!res.ok) throw new Error('获取用户失败')
      const users = await res.json()
      set({ users })
    } catch {
      set({ users: [] })
    }
  },

  createActivity: async (title, description, date) => {
    try {
      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, date }),
      })
      if (!res.ok) throw new Error('创建活动失败')
      get().showToast('活动创建成功！')
      get().fetchActivities()
    } catch (err) {
      get().showToast((err as Error).message)
    }
  },

  registerActivity: async (activityId) => {
    const { currentUser } = get()
    if (!currentUser) return
    try {
      const res = await fetch(`/api/activities/${activityId}/register`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
      })
      if (!res.ok) throw new Error('报名失败')
      get().showToast('报名成功！')
      await get().fetchActivities()
      await get().fetchUsers()
      const updatedUsers = get().users
      const updated = updatedUsers.find((u) => u.id === currentUser.id)
      if (updated) set({ currentUser: updated })
    } catch (err) {
      get().showToast((err as Error).message)
    }
  },

  claimTask: async (activityId) => {
    const { currentUser } = get()
    if (!currentUser) return
    try {
      const res = await fetch(`/api/activities/${activityId}/claim`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
      })
      if (!res.ok) throw new Error('认领失败')
      get().showToast('任务认领成功！')
      await get().fetchActivities()
      await get().fetchUsers()
      const updatedUsers = get().users
      const updated = updatedUsers.find((u) => u.id === currentUser.id)
      if (updated) set({ currentUser: updated })
    } catch (err) {
      get().showToast((err as Error).message)
    }
  },

  logHours: async (activityId, hours) => {
    const { currentUser } = get()
    if (!currentUser) return
    try {
      const res = await fetch(`/api/activities/${activityId}/log-hours`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, hours }),
      })
      if (!res.ok) throw new Error('记录时长失败')
      get().showToast('时长记录成功！')
      await get().fetchActivities()
      await get().fetchUsers()
      const updatedUsers = get().users
      const updated = updatedUsers.find((u) => u.id === currentUser.id)
      if (updated) set({ currentUser: updated })
    } catch (err) {
      get().showToast((err as Error).message)
    }
  },

  setCurrentUser: (user) => set({ currentUser: user }),
  setFilter: (filter) => set({ filter }),
  setShowCreateForm: (show) => set({ showCreateForm: show }),
  showToast: (message) => {
    set({ toastMessage: message })
    setTimeout(() => set({ toastMessage: null }), 2000)
  },
  setConfirmModal: (modal) => set({ confirmModal: modal }),
  setLogHoursModal: (modal) => set({ logHoursModal: modal }),
}))

export type { Activity, User }
