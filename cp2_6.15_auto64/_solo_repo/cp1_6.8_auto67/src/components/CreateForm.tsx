import { useState, useCallback } from 'react'
import { X, Image, Music, CalendarDays } from 'lucide-react'
import { useCapsuleStore } from '../store/capsuleStore'
import { TimeCapsuleEngine } from '../utils/TimeCapsuleEngine'
import type { CreateCapsuleRequest } from '../../shared/types'

const PRESET_YEARS = [1, 3, 5, 10]

export default function CreateForm() {
  const { isFormOpen, closeForm, createCapsule } = useCapsuleStore()
  const [message, setMessage] = useState('')
  const [attachmentType, setAttachmentType] = useState<'image' | 'audio' | null>(null)
  const [attachmentName, setAttachmentName] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handlePreset = useCallback((years: number) => {
    const d = new Date()
    d.setFullYear(d.getFullYear() + years)
    setTargetDate(d.toISOString().split('T')[0])
  }, [])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type.startsWith('image/')) {
      setAttachmentType('image')
    } else if (file.type.startsWith('audio/')) {
      setAttachmentType('audio')
    } else {
      return
    }
    setAttachmentName(file.name)
  }, [])

  const handleSubmit = useCallback(async () => {
    const req: CreateCapsuleRequest = {
      message,
      attachmentUrl: attachmentName || undefined,
      attachmentType: attachmentType || undefined,
      targetDate: new Date(targetDate).toISOString(),
    }
    const validationError = TimeCapsuleEngine.validateCreateRequest(req)
    if (validationError) {
      setError(validationError)
      return
    }
    setError('')
    setSubmitting(true)
    const result = await createCapsule(req)
    setSubmitting(false)
    if (result) {
      setMessage('')
      setAttachmentType(null)
      setAttachmentName('')
      setTargetDate('')
      closeForm()
    }
  }, [message, attachmentName, attachmentType, targetDate, createCapsule, closeForm])

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) closeForm()
  }, [closeForm])

  if (!isFormOpen) return null

  return (
    <div
      className="fixed inset-0 z-40 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(5,5,30,0.6)', backdropFilter: 'blur(6px)' }}
      onClick={handleOverlayClick}
    >
      <div
        className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-6 text-white"
        style={{
          background: 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(24px)',
          border: '1px border-white/10',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          animation: 'slideUp 0.4s ease-out',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold" style={{ fontFamily: "'Cinzel', serif" }}>
            封存时间胶囊
          </h2>
          <button
            onClick={closeForm}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
          >
            <X size={18} className="text-white/60" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-white/50 mb-1.5">寄语（限500字）</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              maxLength={500}
              rows={4}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white/90 placeholder-white/30 resize-none focus:outline-none focus:border-amber-400/40 transition-colors"
              placeholder="写下你想对未来的自己或世界说的话…"
            />
            <div className="text-right text-xs text-white/30 mt-1">{message.length}/500</div>
          </div>

          <div>
            <label className="block text-xs text-white/50 mb-1.5">附件（可选）</label>
            <div className="flex gap-2">
              <label className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-white/10 hover:bg-white/5 cursor-pointer transition-colors text-sm text-white/60">
                <Image size={16} /> 图片
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              <label className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-white/10 hover:bg-white/5 cursor-pointer transition-colors text-sm text-white/60">
                <Music size={16} /> 音频
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
            {attachmentName && (
              <div className="text-xs text-amber-400/80 mt-1.5 truncate">
                已选择: {attachmentName}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs text-white/50 mb-1.5">
              <CalendarDays size={12} className="inline mr-1" />
              启封日期
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {PRESET_YEARS.map(y => (
                <button
                  key={y}
                  onClick={() => handlePreset(y)}
                  className="px-3 py-1.5 rounded-lg text-xs border border-white/10 text-white/60 hover:bg-white/5 hover:text-white/80 transition-colors"
                >
                  {y}年后
                </button>
              ))}
            </div>
            <input
              type="date"
              value={targetDate}
              onChange={e => setTargetDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white/90 focus:outline-none focus:border-amber-400/40 transition-colors"
            />
          </div>

          {error && (
            <div className="text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-3 rounded-xl text-sm font-semibold text-black/80 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #f0c878, #d4a574)',
              boxShadow: '0 4px 20px rgba(240,200,120,0.3)',
            }}
          >
            {submitting ? '封存中…' : '✨ 封存胶囊'}
          </button>
        </div>
      </div>
    </div>
  )
}
