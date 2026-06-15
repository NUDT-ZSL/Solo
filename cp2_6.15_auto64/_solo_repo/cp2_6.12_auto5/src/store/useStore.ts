import { create } from 'zustand'

type Language = 'javascript' | 'python'
type Theme = 'dark' | 'light'

interface AppState {
  code: string
  language: Language
  theme: Theme
  title: string
  description: string
  output: string
  outputType: 'success' | 'error' | 'timeout' | 'idle'
  isRunning: boolean
  leftWidth: number
  setCode: (code: string) => void
  setLanguage: (lang: Language) => void
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  setTitle: (title: string) => void
  setDescription: (desc: string) => void
  setOutput: (output: string, type: 'success' | 'error' | 'timeout') => void
  setIsRunning: (running: boolean) => void
  setLeftWidth: (width: number) => void
  resetCode: () => void
}

const DEFAULT_CODE_JS = `// Write your JavaScript code here\nconsole.log("Hello, CodeSnap!");\n`
const DEFAULT_CODE_PY = `# Write your Python code here\nprint("Hello, CodeSnap!")\n`

export const useStore = create<AppState>((set, get) => ({
  code: DEFAULT_CODE_JS,
  language: 'javascript',
  theme: 'dark',
  title: '',
  description: '',
  output: '',
  outputType: 'idle',
  isRunning: false,
  leftWidth: 65,
  setCode: (code) => set({ code }),
  setLanguage: (language) => {
    const state = get()
    const isDefaultJs = state.code.trim() === DEFAULT_CODE_JS.trim()
    const isDefaultPy = state.code.trim() === DEFAULT_CODE_PY.trim()
    const code = isDefaultJs && language === 'python' ? DEFAULT_CODE_PY
      : isDefaultPy && language === 'javascript' ? DEFAULT_CODE_JS
      : state.code
    set({ language, code })
  },
  setTheme: (theme) => set({ theme }),
  toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
  setTitle: (title) => set({ title }),
  setDescription: (description) => set({ description }),
  setOutput: (output, outputType) => set({ output, outputType, isRunning: false }),
  setIsRunning: (isRunning) => set({ isRunning }),
  setLeftWidth: (leftWidth) => set({ leftWidth }),
  resetCode: () => set({
    code: DEFAULT_CODE_JS,
    language: 'javascript',
    title: '',
    description: '',
    output: '',
    outputType: 'idle',
  }),
}))
