import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type FC,
  type ReactNode,
} from 'react'

type ToastType = 'success' | 'error'

interface ToastItem {
  id: number
  message: string
  type: ToastType
  leaving: boolean
}

interface ToastContextValue {
  toasts: ToastItem[]
  showToast: (message: string, type: ToastType) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

let toastId = 0

export const ToastProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const showToast = useCallback((message: string, type: ToastType) => {
    const id = ++toastId
    setToasts((prev) => [...prev, { id, message, type, leaving: false }])

    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)),
      )
    }, 2000)

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3000)
  }, [])

  const value = useMemo(() => ({ toasts, showToast }), [toasts, showToast])

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
