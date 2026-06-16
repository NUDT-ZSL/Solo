import { useStore } from '@/store/useStore'

export default function Toast() {
  const { toastMessage } = useStore()

  if (!toastMessage) return null

  return (
    <div className="fixed top-0 left-1/2 -translate-x-1/2 z-[100] animate-slideDown">
      <div
        className="text-white px-8 py-3 rounded-b-lg"
        style={{ background: '#4caf50' }}
      >
        {toastMessage}
      </div>
    </div>
  )
}
