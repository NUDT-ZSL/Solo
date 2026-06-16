import { create } from 'zustand'

export type LayoutType = 'flex' | 'grid'

export interface FlexContainerProps {
  flexDirection: 'row' | 'row-reverse' | 'column' | 'column-reverse'
  justifyContent: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly'
  alignItems: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline'
  flexWrap: 'nowrap' | 'wrap' | 'wrap-reverse'
  gap: number
}

export interface GridContainerProps {
  gridTemplateColumns: string
  gridTemplateRows: string
  justifyItems: 'start' | 'end' | 'center' | 'stretch'
  alignItems: 'start' | 'end' | 'center' | 'stretch'
  justifyContent: 'start' | 'end' | 'center' | 'space-between' | 'space-around' | 'space-evenly'
  alignContent: 'start' | 'end' | 'center' | 'space-between' | 'space-around' | 'space-evenly' | 'stretch'
  gap: number
}

export interface FlexItemProps {
  width: number | string
  height: number | string
  alignSelf: 'auto' | 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline'
  order: number
  flexGrow: number
  flexShrink: number
}

export interface GridItemProps {
  width: number | string
  height: number | string
  alignSelf: 'auto' | 'start' | 'end' | 'center' | 'stretch'
  justifySelf: 'auto' | 'start' | 'end' | 'center' | 'stretch'
  order: number
  gridColumn: string
  gridRow: string
}

export interface LayoutItem {
  id: string
  color: string
  flexProps: FlexItemProps
  gridProps: GridItemProps
}

export interface ThemeState {
  isDark: boolean
  toggleTheme: () => void
}

export interface LayoutState {
  layoutType: LayoutType
  flexContainer: FlexContainerProps
  gridContainer: GridContainerProps
  items: LayoutItem[]
  selectedItemId: string | null
  showCodeModal: boolean
  setLayoutType: (type: LayoutType) => void
  setFlexContainerProp: <K extends keyof FlexContainerProps>(key: K, value: FlexContainerProps[K]) => void
  setGridContainerProp: <K extends keyof GridContainerProps>(key: K, value: GridContainerProps[K]) => void
  setItemProp: (itemId: string, propType: 'flex' | 'grid', key: string, value: any) => void
  setSelectedItem: (id: string | null) => void
  loadPreset: (preset: Preset) => void
  reorderItem: (activeId: string, overId: string) => void
  resetLayout: () => void
  setShowCodeModal: (show: boolean) => void
}

export interface Preset {
  name: string
  layoutType: LayoutType
  flexContainer?: Partial<FlexContainerProps>
  gridContainer?: Partial<GridContainerProps>
  items: Array<{
    color: string
    flexProps?: Partial<FlexItemProps>
    gridProps?: Partial<GridItemProps>
  }>
}

const COLORS = ['#FF5252', '#448AFF', '#69F0AE', '#FFD740', '#AB47BC']

const createDefaultFlexItem = (id: string, color: string): LayoutItem => ({
  id,
  color,
  flexProps: {
    width: 120,
    height: 120,
    alignSelf: 'auto',
    order: 0,
    flexGrow: 0,
    flexShrink: 1
  },
  gridProps: {
    width: 120,
    height: 120,
    alignSelf: 'auto',
    justifySelf: 'auto',
    order: 0,
    gridColumn: 'auto',
    gridRow: 'auto'
  }
})

const createDefaultItems = (count: number = 6): LayoutItem[] => {
  return Array.from({ length: count }, (_, i) => 
    createDefaultFlexItem(`item-${i}`, COLORS[i % COLORS.length])
  )
}

const defaultFlexContainer: FlexContainerProps = {
  flexDirection: 'row',
  justifyContent: 'flex-start',
  alignItems: 'stretch',
  flexWrap: 'nowrap',
  gap: 16
}

const defaultGridContainer: GridContainerProps = {
  gridTemplateColumns: 'repeat(3, 1fr)',
  gridTemplateRows: 'auto',
  justifyItems: 'stretch',
  alignItems: 'stretch',
  justifyContent: 'start',
  alignContent: 'start',
  gap: 16
}

export const useStore = create<LayoutState & ThemeState>((set) => ({
  layoutType: 'flex',
  flexContainer: defaultFlexContainer,
  gridContainer: defaultGridContainer,
  items: createDefaultItems(6),
  selectedItemId: null,
  isDark: false,
  showCodeModal: false,

  toggleTheme: () => set((state) => ({ isDark: !state.isDark })),

  setLayoutType: (type) => set({ layoutType: type }),

  setFlexContainerProp: (key, value) =>
    set((state) => ({
      flexContainer: { ...state.flexContainer, [key]: value }
    })),

  setGridContainerProp: (key, value) =>
    set((state) => ({
      gridContainer: { ...state.gridContainer, [key]: value }
    })),

  setItemProp: (itemId, propType, key, value) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              [propType === 'flex' ? 'flexProps' : 'gridProps']: {
                ...item[propType === 'flex' ? 'flexProps' : 'gridProps'],
                [key]: value
              }
            }
          : item
      )
    })),

  setSelectedItem: (id) => set({ selectedItemId: id }),

  loadPreset: (preset) =>
    set(() => {
      const newItems = preset.items.map((item, index) => {
        const baseItem = createDefaultFlexItem(`item-${index}`, item.color)
        if (item.flexProps) {
          baseItem.flexProps = { ...baseItem.flexProps, ...item.flexProps }
        }
        if (item.gridProps) {
          baseItem.gridProps = { ...baseItem.gridProps, ...item.gridProps }
        }
        return baseItem
      })
      return {
        layoutType: preset.layoutType,
        items: newItems,
        flexContainer: { ...defaultFlexContainer, ...preset.flexContainer },
        gridContainer: { ...defaultGridContainer, ...preset.gridContainer },
        selectedItemId: null
      }
    }),

  reorderItem: (activeId, overId) =>
    set((state) => {
      const items = [...state.items]
      const oldIndex = items.findIndex((item) => item.id === activeId)
      const newIndex = items.findIndex((item) => item.id === overId)
      if (oldIndex !== -1 && newIndex !== -1) {
        const [removed] = items.splice(oldIndex, 1)
        items.splice(newIndex, 0, removed)
      }
      return { items }
    }),

  resetLayout: () =>
    set({
      layoutType: 'flex',
      flexContainer: defaultFlexContainer,
      gridContainer: defaultGridContainer,
      items: createDefaultItems(6),
      selectedItemId: null
    }),

  setShowCodeModal: (show) => set({ showCodeModal: show })
}))
