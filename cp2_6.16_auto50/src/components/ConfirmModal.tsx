import { useState } from 'react'
import { useStore } from '@/store/useStore'
import { Loader2 } from 'lucide-react'

export default function ConfirmModal() {
  const { confirmModal, setConfirmModal, claimTask } = useStore()
  const [submitting, setSubmitting] = useState(false)

  if (!confirmModal?.show) return null

  const handleConfirm = async () => {
    setSubmitting(true)
    try {
      const success = await claimTask(confirmModal.activityId)
      if (success) {
        setConfirmModal(null)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = () => {
    if (!submitting) {
      setConfirmModal(null)
    }
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
            disabled={submitting}
            className="px-6 py-2 rounded-lg text-white transition-all duration-200 flex items-center gap-2"
            style={{
              background: '#4caf50',
              opacity: submitting ? 0.7 : 1,
              cursor: submitting ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={(e) => !submitting && (e.currentTarget.style.filter = 'brightness(1.1)')}
            onMouseLeave={(e) => (e.currentTarget.style.filter = 'none')}
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {submitting ? '认领中...' : '确认'}
          </button>
          <button
            onClick={handleCancel}
            disabled={submitting}
            className="px-6 py-2 rounded-lg text-white transition-all duration-200"
            style={{
              background: '#757575',
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.7 : 1,
            }}
            onMouseEnter={(e) => !submitting && (e.currentTarget.style.filter = 'brightness(1.1)')}
            onMouseLeave={(e) => (e.currentTarget.style.filter = 'none')}
          >
            取消
          </button>
        </div>
      </div>
    </div>
  )
}
