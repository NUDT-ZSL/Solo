import { create } from 'zustand'
import type { ComponentMeta, StyleConfig } from '@/types'

interface AppState {
  components: ComponentMeta[]
  selectedComponentId: string | null
  styleConfig: StyleConfig
  isDrawerOpen: boolean
  toastMessage: string | null
  setComponents: (components: ComponentMeta[]) => void
  selectComponent: (id: string) => void
  updateStyleConfig: (config: Partial<StyleConfig>) => void
  resetStyleConfig: (config: StyleConfig) => void
  setDrawerOpen: (open: boolean) => void
  showToast: (message: string) => void
  hideToast: () => void
}

const defaultStyleConfig: StyleConfig = {
  color: '#333333',
  backgroundColor: '#ffffff',
  fontSize: 14,
  borderRadius: 8,
  padding: 12,
  boxShadow: 'none',
  width: 200,
  height: 100,
}

export const useAppStore = create<AppState>((set) => ({
  components: [],
  selectedComponentId: null,
  styleConfig: { ...defaultStyleConfig },
  isDrawerOpen: false,
  toastMessage: null,
  setComponents: (components) => set({ components }),
  selectComponent: (id) => set({ selectedComponentId: id }),
  updateStyleConfig: (config) =>
    set((state) => ({ styleConfig: { ...state.styleConfig, ...config } })),
  resetStyleConfig: (config) => set({ styleConfig: { ...config } }),
  setDrawerOpen: (open) => set({ isDrawerOpen: open }),
  showToast: (message) => set({ toastMessage: message }),
  hideToast: () => set({ toastMessage: null }),
}))
