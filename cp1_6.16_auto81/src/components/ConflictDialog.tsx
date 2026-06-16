import { useAppStore } from '@/store/useAppStore'
import { X, AlertTriangle } from 'lucide-react'

export default function ConflictDialog() {
  const { conflictDialog, hideConflictDialog } = useAppStore()

  if (!conflictDialog.visible) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30">
      <div
        className="relative w-full max-w-md mx-4 p-6"
        style={{
          borderRadius: '16px',
          background: '#FFF5F5',
          border: '2px solid #E74C3C',
          animation: 'shake 0.3s ease-in-out',
        }}
      >
        <button
          onClick={hideConflictDialog}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle size={24} color="#E74C3C" />
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#E74C3C' }}>
            课表时间冲突
          </h3>
        </div>

        <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
          以下课程与新排课时间冲突：
        </p>

        <div className="space-y-3">
          {conflictDialog.conflicts.map((conflict, index) => (
            <div
              key={index}
              className="p-3 rounded-lg bg-white/70"
              style={{ borderLeft: '3px solid #E74C3C' }}
            >
              <div style={{ fontSize: '14px', fontWeight: 500, color: '#333' }}>
                {conflict.courseName}
              </div>
              <div style={{ fontSize: '12px', color: '#999' }}>
                {conflict.time}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={hideConflictDialog}
          className="mt-6 w-full py-2.5 rounded-lg text-white text-sm font-medium transition-colors hover:opacity-90"
          style={{ backgroundColor: '#E74C3C' }}
        >
          知道了
        </button>
      </div>
    </div>
  )
}
