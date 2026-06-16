import { useStore } from '@/store/useStore'

export default function Toast() {
  const { toastMessage, toastType } = useStore()

  if (!toastMessage) return null

  const bgColor = toastType === 'success' ? '#4caf50' : '#ef5350'

  return (
    <div className="fixed top-0 left-1/2 -translate-x-1/2 z-[100] animate-slideDown">
      <div
        className="text-white px-8 py-3 rounded-b-lg"
        style={{ background: bgColor }}
      >
        {toastMessage}
      </div>
    </div>
  )
}
