import { create } from 'zustand'
import type { NotificationItem } from '@/types'

interface AppState {
  theme: 'light' | 'dark'
  notifications: NotificationItem[]
  toggleTheme: () => void
  addNotification: (notification: Omit<NotificationItem, 'id'>) => void
  removeNotification: (id: string) => void
}

export const useAppStore = create<AppState>((set) => ({
  theme: 'light',
  notifications: [],
  toggleTheme: () =>
    set((state) => ({
      theme: state.theme === 'light' ? 'dark' : 'light'
    })),
  addNotification: (notification) => {
    const id = Math.random().toString(36).slice(2)
    set((state) => ({
      notifications: [...state.notifications, { ...notification, id }]
    }))
    setTimeout(() => {
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id)
      }))
    }, 3000)
  },
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id)
    }))
}))
