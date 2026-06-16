import { useState } from 'react'
import { useStore } from '@/store/useStore'

export default function LogHoursModal() {
  const { logHoursModal, setLogHoursModal, logHours } = useStore()
  const [hours, setHours] = useState<number>(0.5)

  if (!logHoursModal?.show) return null

  const handleSubmit = async () => {
    if (hours <= 0) return
    await logHours(logHoursModal.activityId, hours)
    setLogHoursModal(null)
    setHours(0.5)
  }

  const handleCancel = () => {
    setLogHoursModal(null)
    setHours(0.5)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center animate-fadeIn"
      style={{ background: '#00000066' }}
      onClick={(e) => e.target === e.currentTarget && setLogHoursModal(null)}
    >
      <div
        className="rounded-2xl p-8 text-center mt-[20vh]"
        style={{ maxWidth: 300, width: '100%', background: '#1e1e2e' }}
      >
        <h2 className="text-white text-xl mb-6">记录服务时长</h2>

        <input
          type="number"
          min={0.5}
          max={24}
          step={0.5}
          value={hours}
          onChange={(e) => setHours(Number(e.target.value))}
          className="rounded-lg text-white text-center px-4 py-3 outline-none mb-6"
          style={{
            width: 200,
            background: '#333',
            border: '1px solid #555',
          }}
        />

        <div className="flex items-center justify-center gap-4">
          <button
            onClick={handleSubmit}
            className="px-6 py-2 rounded-lg font-medium transition-all duration-200"
            style={{ background: '#64ffda', color: '#000' }}
          >
            提交
          </button>
          <button
            onClick={handleCancel}
            className="px-6 py-2 rounded-lg text-white transition-all duration-200"
            style={{ background: '#757575' }}
          >
            取消
          </button>
        </div>
      </div>
    </div>
  )
}
