import { useToastStore } from '../store/toast'

const TOAST_ICONS: Record<string, string> = {
  success: '✓',
  error: '✕',
}

export default function ToastContainer() {
  const { toasts } = useToastStore()

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast ${toast.type} ${toast.leaving ? 'leaving' : ''}`}
        >
          <span className="toast-icon">{TOAST_ICONS[toast.type]}</span>
          <span>{toast.message}</span>
        </div>
      ))}
    </div>
  )
}
