import { useStore } from '@/store/useStore'

export default function ConfirmModal() {
  const { confirmModal, setConfirmModal, claimTask } = useStore()

  if (!confirmModal?.show) return null

  const handleConfirm = async () => {
    await claimTask(confirmModal.activityId)
    setConfirmModal(null)
  }

  const handleCancel = () => {
    setConfirmModal(null)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center animate-fadeIn"
      style={{ background: '#00000066' }}
      onClick={(e) => e.target === e.currentTarget && setConfirmModal(null)}
    >
      <div
        className="rounded-2xl p-8 text-center mt-[20vh]"
        style={{ maxWidth: 400, width: '100%', background: '#1e1e2e' }}
      >
        <h2 className="text-white text-xl mb-3">确认认领任务</h2>
        <p className="text-[#b0bec5] mb-6">确定要认领此任务吗？</p>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={handleConfirm}
            className="px-6 py-2 rounded-lg text-white transition-all duration-200"
            style={{ background: '#4caf50' }}
            onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(1.1)')}
            onMouseLeave={(e) => (e.currentTarget.style.filter = 'none')}
          >
            确认
          </button>
          <button
            onClick={handleCancel}
            className="px-6 py-2 rounded-lg text-white transition-all duration-200"
            style={{ background: '#757575' }}
            onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(1.1)')}
            onMouseLeave={(e) => (e.currentTarget.style.filter = 'none')}
          >
            取消
          </button>
        </div>
      </div>
    </div>
  )
}
