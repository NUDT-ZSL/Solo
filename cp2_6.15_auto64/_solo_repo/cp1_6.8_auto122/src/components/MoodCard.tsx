import { useState } from 'react'
import type { MoodRecord, WeatherType } from '../MoodEngine'
import { WEATHER_CONFIG, WEATHER_TYPES, formatDate, truncateDiary, formatDisplayDate } from '../MoodEngine'
import { useMoodStore } from '../store'

interface Props {
  record: MoodRecord
  onClick: () => void
}

export default function MoodCard({ record, onClick }: Props) {
  const [hovered, setHovered] = useState(false)
  const config = WEATHER_CONFIG[record.weather]

  return (
    <div
      className="mood-card group cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      style={{
        transform: hovered ? 'scale(1.05)' : 'scale(1)',
        transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)',
      }}
    >
      <div className="flex items-start gap-3">
        <span className="text-3xl" role="img" aria-label={config.label}>
          {config.emoji}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: config.color + '33',
                color: config.color,
              }}
            >
              {config.label}
            </span>
            <span className="text-xs text-white/40">
              {formatDisplayDate(record.date)}
            </span>
          </div>
          <p className="text-sm text-white/70 leading-relaxed">
            {truncateDiary(record.diary, 80)}
          </p>
        </div>
      </div>
      <div
        className="mt-3 h-1 rounded-full overflow-hidden"
        style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${record.intensity * 10}%`,
            background: `linear-gradient(90deg, ${config.gradientStart}, ${config.gradientEnd})`,
          }}
        />
      </div>
    </div>
  )
}

export function MoodCardList() {
  const { records, filterWeather, openModal } = useMoodStore()
  const filtered = filterWeather
    ? records.filter(r => r.weather === filterWeather)
    : records

  if (filtered.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-white/30 text-lg">暂无心情记录</p>
        <p className="text-white/20 text-sm mt-2">点击上方「添加心情」开始记录吧</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[30px]">
      {filtered.map((record, i) => (
        <div
          key={record.id}
          className="animate-fadeIn"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <MoodCard record={record} onClick={() => openModal(record)} />
        </div>
      ))}
    </div>
  )
}

export function AddMoodForm() {
  const { closeForm, addRecord, updateRecord, editingRecord } = useMoodStore()
  const isEdit = !!editingRecord

  const [weather, setWeather] = useState<WeatherType>(editingRecord?.weather ?? 'sunny')
  const [diary, setDiary] = useState(editingRecord?.diary ?? '')
  const [intensity, setIntensity] = useState(editingRecord?.intensity ?? 5)
  const [date, setDate] = useState(editingRecord?.date ?? formatDate(new Date()))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (diary.trim().length === 0) return

    const data = { date, weather, diary: diary.trim(), intensity }
    if (isEdit && editingRecord) {
      await updateRecord(editingRecord.id, data)
    } else {
      await addRecord(data)
    }
    closeForm()
  }

  const handleDiaryChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (e.target.value.length <= 200) {
      setDiary(e.target.value)
    }
  }

  return (
    <div className="modal-overlay" onClick={closeForm}>
      <div
        className="modal-content p-6 max-w-md w-full mx-4"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-xl font-semibold text-white mb-6">
          {isEdit ? '编辑心情' : '添加心情'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm text-white/60 mb-2">日期</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30"
            />
          </div>

          <div>
            <label className="block text-sm text-white/60 mb-2">天气符号</label>
            <div className="flex gap-2">
              {WEATHER_TYPES.map(w => {
                const cfg = WEATHER_CONFIG[w]
                const selected = weather === w
                return (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setWeather(w)}
                    className="flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-200"
                    style={{
                      background: selected ? cfg.color + '33' : 'rgba(255,255,255,0.05)',
                      border: selected ? `2px solid ${cfg.color}` : '2px solid transparent',
                      transform: selected ? 'scale(1.1)' : 'scale(1)',
                    }}
                  >
                    <span className="text-2xl">{cfg.emoji}</span>
                    <span className="text-[10px] text-white/60">{cfg.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm text-white/60 mb-2">
              心情强度: {intensity}/10
            </label>
            <input
              type="range"
              min={1}
              max={10}
              value={intensity}
              onChange={e => setIntensity(Number(e.target.value))}
              className="w-full accent-purple-400"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-white/60">日记</label>
              <span className="text-xs text-white/30">{diary.length}/200</span>
            </div>
            <textarea
              value={diary}
              onChange={handleDiaryChange}
              placeholder="记录今天的心情..."
              rows={3}
              className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30 resize-none placeholder:text-white/20"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={closeForm}
              className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/60 text-sm hover:bg-white/5 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-medium transition-all duration-200 hover:-translate-y-0.5"
              style={{
                background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              }}
            >
              {isEdit ? '保存' : '记录'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
