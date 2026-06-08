import { useState } from 'react'
import { WEATHER_CONFIG, formatDisplayDate } from '../MoodEngine'
import { useMoodStore } from '../store'

export default function DiaryModal() {
  const { isModalOpen, selectedRecord, closeModal, openForm, deleteRecord } = useMoodStore()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  if (!isModalOpen || !selectedRecord) return null

  const config = WEATHER_CONFIG[selectedRecord.weather]

  const handleEdit = () => {
    closeModal()
    openForm(selectedRecord)
  }

  const handleDelete = async () => {
    await deleteRecord(selectedRecord.id)
    closeModal()
    setShowDeleteConfirm(false)
  }

  return (
    <div className="modal-overlay" onClick={closeModal}>
      <div
        className="modal-content relative overflow-hidden max-w-lg w-full mx-4"
        onClick={e => e.stopPropagation()}
      >
        <svg
          className="absolute bottom-0 left-0 w-full opacity-20"
          viewBox="0 0 400 80"
          preserveAspectRatio="none"
          style={{ height: 80 }}
        >
          <path
            d="M0,40 C100,80 200,0 300,40 C350,60 380,30 400,40 L400,80 L0,80 Z"
            fill={config.color}
          >
            <animate
              attributeName="d"
              dur="4s"
              repeatCount="indefinite"
              values="
                M0,40 C100,80 200,0 300,40 C350,60 380,30 400,40 L400,80 L0,80 Z;
                M0,50 C100,20 200,60 300,30 C350,50 380,60 400,35 L400,80 L0,80 Z;
                M0,40 C100,80 200,0 300,40 C350,60 380,30 400,40 L400,80 L0,80 Z
              "
            />
          </path>
          <path
            d="M0,50 C80,30 160,70 240,40 C320,10 360,50 400,45 L400,80 L0,80 Z"
            fill={config.gradientEnd}
            opacity="0.5"
          >
            <animate
              attributeName="d"
              dur="3s"
              repeatCount="indefinite"
              values="
                M0,50 C80,30 160,70 240,40 C320,10 360,50 400,45 L400,80 L0,80 Z;
                M0,45 C80,60 160,20 240,50 C320,70 360,30 400,40 L400,80 L0,80 Z;
                M0,50 C80,30 160,70 240,40 C320,10 360,50 400,45 L400,80 L0,80 Z
              "
            />
          </path>
        </svg>

        <div className="relative z-10 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{config.emoji}</span>
              <div>
                <h3 className="text-lg font-semibold text-white">{config.label}</h3>
                <p className="text-sm text-white/40">{formatDisplayDate(selectedRecord.date)}</p>
              </div>
            </div>
            <button
              onClick={closeModal}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>

          <div
            className="mb-6 p-4 rounded-xl"
            style={{
              background: `linear-gradient(135deg, ${config.color}11, ${config.gradientEnd}11)`,
              border: `1px solid ${config.color}22`,
            }}
          >
            <p className="text-white/80 leading-relaxed text-sm whitespace-pre-wrap">
              {selectedRecord.diary}
            </p>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs text-white/40">心情强度</span>
            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${selectedRecord.intensity * 10}%`,
                  background: `linear-gradient(90deg, ${config.gradientStart}, ${config.gradientEnd})`,
                }}
              />
            </div>
            <span className="text-xs text-white/50">{selectedRecord.intensity}/10</span>
          </div>

          {!showDeleteConfirm ? (
            <div className="flex gap-3">
              <button
                onClick={handleEdit}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/60 text-sm hover:bg-white/5 transition-colors"
              >
                编辑
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex-1 py-2.5 rounded-xl border border-red-500/30 text-red-400/70 text-sm hover:bg-red-500/10 transition-colors"
              >
                删除
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/60 text-sm hover:bg-white/5 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 text-sm hover:bg-red-500/30 transition-colors"
              >
                确认删除
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
