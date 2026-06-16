import { create } from 'zustand'

interface AppState {
  currentUser: { id: string; name: string; role: string } | null
  selectedStudentId: string | null
  conflictDialog: {
    visible: boolean
    conflicts: { courseName: string; time: string }[]
  }
  setCurrentUser: (user: { id: string; name: string; role: string } | null) => void
  setSelectedStudentId: (id: string | null) => void
  showConflictDialog: (conflicts: { courseName: string; time: string }[]) => void
  hideConflictDialog: () => void
}

export const useAppStore = create<AppState>((set) => ({
  currentUser: null,
  selectedStudentId: null,
  conflictDialog: {
    visible: false,
    conflicts: [],
  },
  setCurrentUser: (user) => set({ currentUser: user }),
  setSelectedStudentId: (id) => set({ selectedStudentId: id }),
  showConflictDialog: (conflicts) =>
    set({ conflictDialog: { visible: true, conflicts } }),
  hideConflictDialog: () =>
    set({ conflictDialog: { visible: false, conflicts: [] } }),
}))
