import { create } from 'zustand'
import { themes, Theme } from './theme'
import { parseMarkdown, Slide } from './parser'

export interface AppState {
  content: string
  themeIndex: number
  currentPage: number
  slides: Slide[]
  isFullscreen: boolean
  isExporting: boolean

  setContent: (content: string) => void
  setThemeIndex: (index: number) => void
  setCurrentPage: (page: number) => void
  nextPage: () => void
  prevPage: () => void
  setIsFullscreen: (v: boolean) => void
  setIsExporting: (v: boolean) => void
  getCurrentTheme: () => Theme
  getTotalPages: () => number
}

const DEFAULT_CONTENT = `# 欢迎使用 SlideMaker

这是一个 Markdown 转幻灯片的演示文稿编辑器

---

## 主要功能

- 左侧编辑 Markdown，右侧实时预览
- 多种主题色板一键切换
- 支持全屏演示和翻页动画
- 一键导出独立 HTML 文件

---

### 使用说明

使用 \`---\` 分隔幻灯片

使用 \`#\` \`##\` \`###\` 表示标题层级

Enjoy! 🎉
`

export const useAppStore = create<AppState>((set, get) => ({
  content: DEFAULT_CONTENT,
  themeIndex: 0,
  currentPage: 0,
  slides: parseMarkdown(DEFAULT_CONTENT),
  isFullscreen: false,
  isExporting: false,

  setContent: (content: string) => {
    const slides = parseMarkdown(content)
    const state = get()
    const newCurrentPage = Math.min(state.currentPage, Math.max(0, slides.length - 1))
    set({ content, slides, currentPage: newCurrentPage })
  },

  setThemeIndex: (index: number) => set({ themeIndex: index }),

  setCurrentPage: (page: number) => {
    const total = get().getTotalPages()
    set({ currentPage: Math.max(0, Math.min(page, total - 1)) })
  },

  nextPage: () => {
    const state = get()
    const total = state.getTotalPages()
    if (state.currentPage < total - 1) {
      set({ currentPage: state.currentPage + 1 })
    }
  },

  prevPage: () => {
    const state = get()
    if (state.currentPage > 0) {
      set({ currentPage: state.currentPage - 1 })
    }
  },

  setIsFullscreen: (v: boolean) => set({ isFullscreen: v }),
  setIsExporting: (v: boolean) => set({ isExporting: v }),

  getCurrentTheme: () => themes[get().themeIndex % themes.length],
  getTotalPages: () => get().slides.length
}))
