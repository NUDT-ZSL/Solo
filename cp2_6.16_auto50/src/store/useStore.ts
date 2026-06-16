import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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
  authToken: string | null
  loading: boolean
  error: string | null
  filter: '全部' | '进行中' | '已结束'
  showCreateForm: boolean
  toastMessage: string | null
  toastType: 'success' | 'error'
  confirmModal: { show: boolean; activityId: string; userId: string } | null
  logHoursModal: { show: boolean; activityId: string; userId: string } | null

  fetchActivities: () => Promise<boolean>
  fetchUsers: () => Promise<boolean>
  authenticate: (userId: string) => Promise<boolean>
  setCurrentUser: (user: User) => void
  createActivity: (title: string, description: string, date: string) => Promise<boolean>
  registerActivity: (activityId: string) => Promise<boolean>
  claimTask: (activityId: string) => Promise<boolean>
  logHours: (activityId: string, hours: number) => Promise<boolean>
  setFilter: (filter: '全部' | '进行中' | '已结束') => void
  setShowCreateForm: (show: boolean) => void
  showToast: (message: string, type?: 'success' | 'error') => void
  setConfirmModal: (modal: { show: boolean; activityId: string; userId: string } | null) => void
  setLogHoursModal: (modal: { show: boolean; activityId: string; userId: string } | null) => void
  clearError: () => void
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      activities: [],
      currentUser: null,
      users: [],
      authToken: null,
      loading: false,
      error: null,
      filter: '全部',
      showCreateForm: false,
      toastMessage: null,
      toastType: 'success',
      confirmModal: null,
      logHoursModal: null,

      fetchActivities: async () => {
        set({ loading: true, error: null })
        try {
          const res = await fetch('/api/activities', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          })

          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}))
            throw new Error(errorData.error || `获取活动失败 (${res.status})`)
          }

          const data = await res.json()
          set({ activities: data.activities || [], loading: false, error: null })
          return true
        } catch (err) {
          const message = err instanceof Error ? err.message : '网络连接失败，请检查服务器是否启动'
          set({ error: message, loading: false })
          get().showToast(message, 'error')
          return false
        }
      },

      fetchUsers: async () => {
        try {
          const res = await fetch('/api/activities/users')
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}))
            throw new Error(errorData.error || `获取用户失败 (${res.status})`)
          }
          const data = await res.json()
          set({ users: data.users || [] })
          return true
        } catch (err) {
          const message = err instanceof Error ? err.message : '获取用户列表失败'
          set({ error: message })
          return false
        }
      },

      authenticate: async (userId: string) => {
        try {
          const res = await fetch(`/api/activities/auth/token?userId=${encodeURIComponent(userId)}`)
          if (!res.ok) {
            throw new Error('认证失败')
          }
          const data = await res.json()
          set({ authToken: data.token })

          const users = get().users
          const user = users.find((u) => u.id === userId)
          if (user) {
            set({ currentUser: user })
            get().showToast(`欢迎，${user.name}！`, 'success')
          }
          return true
        } catch (err) {
          const message = err instanceof Error ? err.message : '认证失败'
          get().showToast(message, 'error')
          return false
        }
      },

      createActivity: async (title, description, date) => {
        const { authToken } = get()
        if (!authToken) {
          get().showToast('请先登录', 'error')
          return false
        }

        try {
          const res = await fetch('/api/activities', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`,
            },
            body: JSON.stringify({ title, description, date }),
          })

          const errorData = await res.json().catch(() => ({}))
          if (!res.ok) {
            throw new Error(errorData.error || `创建活动失败 (${res.status})`)
          }

          const success = await get().fetchActivities()
          if (success) {
            get().showToast('活动创建成功！', 'success')
          }
          return success
        } catch (err) {
          const message = err instanceof Error ? err.message : '创建活动失败'
          get().showToast(message, 'error')
          return false
        }
      },

      registerActivity: async (activityId) => {
        const { authToken, currentUser, activities } = get()
        if (!authToken || !currentUser) {
          get().showToast('请先登录', 'error')
          return false
        }

        const activity = activities.find((a) => a.id === activityId)
        const expectedVersion = activity ? (activity as any).version : undefined

        try {
          const res = await fetch(`/api/activities/${activityId}/register`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`,
            },
            body: JSON.stringify({ userId: currentUser.id, expectedVersion }),
          })

          if (res.status === 401) {
            set({ authToken: null, currentUser: null })
            get().showToast('登录已过期，请重新登录', 'error')
            return false
          }

          const data = await res.json().catch(() => ({}))
          if (!res.ok) {
            throw new Error(data.error || `报名失败 (${res.status})`)
          }

          const [activitiesSuccess, usersSuccess] = await Promise.all([
            get().fetchActivities(),
            get().fetchUsers(),
          ])

          if (activitiesSuccess && usersSuccess) {
            const updatedUsers = get().users
            const updated = updatedUsers.find((u) => u.id === currentUser.id)
            if (updated) set({ currentUser: updated })
            get().showToast('报名成功！', 'success')
          }
          return activitiesSuccess && usersSuccess
        } catch (err) {
          const message = err instanceof Error ? err.message : '报名失败'
          get().showToast(message, 'error')
          return false
        }
      },

      claimTask: async (activityId) => {
        const { authToken, currentUser } = get()
        if (!authToken || !currentUser) {
          get().showToast('请先登录', 'error')
          return false
        }

        try {
          const res = await fetch(`/api/activities/${activityId}/claim`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`,
            },
            body: JSON.stringify({ userId: currentUser.id }),
          })

          if (res.status === 401) {
            set({ authToken: null, currentUser: null })
            get().showToast('登录已过期，请重新登录', 'error')
            return false
          }

          const data = await res.json().catch(() => ({}))
          if (!res.ok) {
            throw new Error(data.error || `认领失败 (${res.status})`)
          }

          const [activitiesSuccess, usersSuccess] = await Promise.all([
            get().fetchActivities(),
            get().fetchUsers(),
          ])

          if (activitiesSuccess && usersSuccess) {
            const updatedUsers = get().users
            const updated = updatedUsers.find((u) => u.id === currentUser.id)
            if (updated) set({ currentUser: updated })
            get().showToast('任务认领成功！', 'success')
          }
          return activitiesSuccess && usersSuccess
        } catch (err) {
          const message = err instanceof Error ? err.message : '认领失败'
          get().showToast(message, 'error')
          return false
        }
      },

      logHours: async (activityId, hours) => {
        const { authToken, currentUser } = get()
        if (!authToken || !currentUser) {
          get().showToast('请先登录', 'error')
          return false
        }

        try {
          const res = await fetch(`/api/activities/${activityId}/logHours`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`,
            },
            body: JSON.stringify({ userId: currentUser.id, hours }),
          })

          const data = await res.json().catch(() => ({}))
          if (!res.ok) {
            throw new Error(data.error || `记录时长失败 (${res.status})`)
          }

          const [activitiesSuccess, usersSuccess] = await Promise.all([
            get().fetchActivities(),
            get().fetchUsers(),
          ])

          if (activitiesSuccess && usersSuccess) {
            const updatedUsers = get().users
            const updated = updatedUsers.find((u) => u.id === currentUser.id)
            if (updated) set({ currentUser: updated })
            get().showToast('时长记录成功！', 'success')
          }
          return activitiesSuccess && usersSuccess
        } catch (err) {
          const message = err instanceof Error ? err.message : '记录时长失败'
          get().showToast(message, 'error')
          return false
        }
      },

      setCurrentUser: async (user) => {
        set({ currentUser: user, authToken: null })
        await get().authenticate(user.id)
      },

      setFilter: (filter) => set({ filter }),
      setShowCreateForm: (show) => set({ showCreateForm: show }),

      showToast: (message, type = 'success') => {
        set({ toastMessage: message, toastType: type })
        setTimeout(() => set({ toastMessage: null }), 2000)
      },

      setConfirmModal: (modal) => set({ confirmModal: modal }),
      setLogHoursModal: (modal) => set({ logHoursModal: modal }),
      clearError: () => set({ error: null }),
    }),
    {
      name: 'charity-app-storage',
      partialize: (state) => ({
        currentUser: state.currentUser,
        authToken: state.authToken,
      }),
    }
  )
)

export type { Activity, User }
