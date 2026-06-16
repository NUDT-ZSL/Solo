import { useState } from 'react'
import { useStore } from '@/store/useStore'
import { X } from 'lucide-react'

export default function ActivityForm() {
  const { createActivity, setShowCreateForm } = useStore()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')

  const today = new Date().toISOString().split('T')[0]
  const titleValid = title.length >= 5
  const descValid = description.length >= 20
  const dateValid = date >= today && date !== ''
  const formValid = titleValid && descValid && dateValid

  const handleSubmit = async () => {
    if (!formValid) return
    await createActivity(title, description, date)
    setShowCreateForm(false)
  }

  const inputStyle = {
    width: '100%',
    height: 48,
    borderRadius: 8,
    background: '#2a2a3e',
    border: '1px solid #4a4a5e',
    color: '#fff',
    padding: '0 16px',
    outline: 'none',
  } as React.CSSProperties

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center animate-fadeIn"
      style={{ background: '#00000080' }}
      onClick={(e) => e.target === e.currentTarget && setShowCreateForm(false)}
    >
      <div
        className="rounded-2xl p-8 mt-[10vh]"
        style={{ maxWidth: 480, width: '100%', height: 400, background: '#1e1e2e' }}
      >
        <button
          onClick={() => setShowCreateForm(false)}
          className="absolute top-4 right-4 text-[#78909c] hover:text-white transition"
        >
          <X size={20} />
        </button>

        <h2 className="text-white text-xl font-bold mb-6">创建新活动</h2>

        <div className="flex flex-col gap-4">
          <div>
            <input
              type="text"
              placeholder="活动标题（至少5个字）"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#64ffda')}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#4a4a5e')}
            />
            {title && !titleValid && (
              <p className="text-xs text-red-400 mt-1">标题至少5个字符</p>
            )}
          </div>

          <div>
            <textarea
              placeholder="活动描述（至少20个字）"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg p-4 text-white outline-none resize-none"
              style={{
                height: 96,
                background: '#2a2a3e',
                border: '1px solid #4a4a5e',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#64ffda')}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#4a4a5e')}
            />
            {description && !descValid && (
              <p className="text-xs text-red-400 mt-1">描述至少20个字符</p>
            )}
          </div>

          <div>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={today}
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#64ffda')}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#4a4a5e')}
            />
            {date && !dateValid && (
              <p className="text-xs text-red-400 mt-1">日期不能早于今天</p>
            )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={!formValid}
            className="w-full h-12 rounded-full font-bold transition-all duration-200"
            style={{
              background: formValid ? '#64ffda' : '#2a2a3e',
              color: formValid ? '#000' : '#757575',
              cursor: formValid ? 'pointer' : 'not-allowed',
            }}
            onMouseEnter={(e) => formValid && (e.currentTarget.style.filter = 'brightness(1.1)')}
            onMouseLeave={(e) => (e.currentTarget.style.filter = 'none')}
          >
            创建活动
          </button>
        </div>
      </div>
    </div>
  )
}
