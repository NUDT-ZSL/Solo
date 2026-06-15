import { useToast } from '../context/ToastContext'

const TOAST_ICONS: Record<string, string> = {
  success: '✓',
  error: '✕',
}

export default function ToastContainer() {
  const { toasts } = useToast()

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
