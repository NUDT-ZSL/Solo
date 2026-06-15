import React, { useCallback, useEffect, useState } from 'react'
import type { MoodRecord } from './types'
import { MOOD_PRESETS } from './types'
import { fetchMoods, createMood, deleteLatestMood } from './api'
import { TrendChart } from './TrendChart'
import { CalendarTimeline } from './CalendarTimeline'
import { MoodModal } from './MoodModal'

type ShapeType = MoodRecord['shape']

const CUSTOM_PALETTE: string[] = [
  '#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF',
  '#C56CF0', '#FF8FAB', '#8892B0', '#6EDCD9',
]

function pickRandomColor(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  return CUSTOM_PALETTE[hash % CUSTOM_PALETTE.length]
}

function scoreFromRange(range: [number, number]): number {
  const [lo, hi] = range
  return Math.round((lo + Math.random() * (hi - lo)) * 10) / 10
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

interface SelectedMood {
  label: string
  emoji: string
  color: string
  shape: ShapeType
  score: number
}

export default function App() {
  const [moods, setMoods] = useState<MoodRecord[]>([])
  const [selected, setSelected] = useState<SelectedMood | null>(null)
  const [note, setNote] = useState('')
  const [customLabel, setCustomLabel] = useState('')
  const [loading, setLoading] = useState(false)
  const [modalMood, setModalMood] = useState<MoodRecord | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const data = await fetchMoods()
        setMoods(data)
      } catch (e) {
        console.error(e)
      }
    })()
  }, [])

  const pickPreset = useCallback((idx: number) => {
    const p = MOOD_PRESETS[idx]
    setSelected({
      label: p.label,
      emoji: p.emoji,
      color: p.color,
      shape: p.shape,
      score: scoreFromRange(p.scoreRange),
    })
  }, [])

  const applyCustom = useCallback(() => {
    const label = customLabel.trim()
    if (!label) return
    const color = pickRandomColor(label)
    const shapeList: ShapeType[] = ['circle', 'square', 'triangle', 'diamond', 'hexagon', 'star', 'heart', 'wave']
    let hash = 0
    for (let i = 0; i < label.length; i++) hash = (hash * 31 + label.charCodeAt(i)) >>> 0
    const shape = shapeList[hash % shapeList.length]
    const emoji = label.codePointAt(0) && /\p{Extended_Pictographic}/u.test(label.charAt(0))
      ? label.charAt(0)
      : '💭'
    setSelected({
      label: label.slice(0, 10),
      emoji,
      color,
      shape,
      score: 5,
    })
    setCustomLabel('')
  }, [customLabel])

  const submit = useCallback(async () => {
    if (!selected || loading) return
    setLoading(true)
    const now = new Date()
    const minutes = now.getHours() * 60 + now.getMinutes()
    const rotation = Math.round((minutes / 1440) * 360)
    const size = 48
    try {
      const data = await createMood({
        label: selected.label,
        emoji: selected.emoji,
        color: selected.color,
        shape: selected.shape,
        score: selected.score,
        note: note.trim().slice(0, 200),
        badgeParams: { rotation, size },
      })
      setMoods(data)
      setSelected(null)
      setNote('')
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [selected, note, loading])

  const removeLatest = useCallback(async () => {
    if (moods.length === 0 || loading) return
    if (!confirm('确定删除最近一条记录吗？')) return
    setLoading(true)
    try {
      const data = await deleteLatestMood()
      setMoods(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [moods.length, loading])

  const panelSize = 280
  const mq = window.matchMedia('(max-width: 768px)')
  const effectivePanelSize = mq.matches ? 240 : panelSize
  const radius = effectivePanelSize / 2 - 36
  const center = effectivePanelSize / 2

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
      if ((e.target as HTMLInputElement).id === 'custom-input') {
        e.preventDefault()
        applyCustom()
      }
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && selected) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div onKeyDown={onKeyDown}>
      <header className="app-header">🎨 情绪速写板 · Mood Sketchpad</header>

      <main className="app-container">
        <section className="mood-picker">
          <div className="picker-title">
            ✍️ 记录此刻情绪 · 选中：
            {selected ? (
              <span style={{ marginLeft: 8 }}>
                <span style={{ color: selected.color }}>●</span>{' '}
                <strong>{selected.emoji} {selected.label}</strong>
                <span style={{ color: '#8890A4', fontSize: 12, marginLeft: 6 }}>
                  {selected.score}分
                </span>
              </span>
            ) : (
              <span style={{ color: '#8890A4', fontWeight: 400, fontSize: 13 }}>（未选择）</span>
            )}
          </div>

          <div
            className="circle-panel"
            style={{ width: effectivePanelSize, height: effectivePanelSize }}
          >
            {MOOD_PRESETS.map((p, i) => {
              const angle = (Math.PI * 2 * i) / MOOD_PRESETS.length - Math.PI / 2
              const x = center + radius * Math.cos(angle) - 31
              const y = center + radius * Math.sin(angle) - 31
              const isSel = selected?.label === p.label
              const [r, g, b] = p.color.replace('#', '').match(/.{2}/g)!.map((h) => parseInt(h, 16))
              return (
                <button
                  key={p.label}
                  type="button"
                  className={`circle-btn ${isSel ? 'selected' : ''}`}
                  style={{
                    left: x,
                    top: y,
                    border: isSel ? `2px solid ${p.color}` : '1px solid rgba(60,70,90,0.06)',
                    // @ts-expect-error css var
                    '--mood-glow': `rgba(${r},${g},${b},0.45)`,
                    background: isSel
                      ? `linear-gradient(135deg, rgba(${r},${g},${b},0.22), rgba(${r},${g},${b},0.08))`
                      : '#F8F9FC',
                  }}
                  onClick={() => pickPreset(i)}
                  title={p.label}
                >
                  <span className="mood-emoji">{p.emoji}</span>
                  <span className="mood-label">{p.label}</span>
                </button>
              )
            })}
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: 74,
                height: 74,
                borderRadius: '50%',
                background: selected
                  ? `radial-gradient(circle at 30% 30%, white, ${selected.color}33 60%, ${selected.color}66)`
                  : 'radial-gradient(circle at 30% 30%, #FFFFFF, #EEF1F7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: selected ? 34 : 28,
                boxShadow: selected
                  ? `0 4px 18px ${selected.color}55`
                  : '0 2px 10px rgba(60,70,90,0.08)',
                transition: 'all 0.3s ease-out',
              }}
            >
              {selected ? selected.emoji : '🤔'}
            </div>
          </div>

          <div className="custom-mood-input">
            <input
              id="custom-input"
              type="text"
              placeholder="或输入自定义情绪，例如：「小确幸」「忐忑」"
              maxLength={10}
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  applyCustom()
                }
              }}
            />
            <button
              type="button"
              onClick={applyCustom}
              disabled={!customLabel.trim()}
            >
              使用
            </button>
          </div>

          <textarea
            className="note-input"
            placeholder="写下此刻的笔记（不超过200字）..."
            maxLength={200}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          <div className="picker-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={removeLatest}
              disabled={moods.length === 0 || loading}
            >
              🗑️ 删除最近一条
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={submit}
              disabled={!selected || loading}
            >
              {loading ? '保存中...' : `💾 记录此刻 · ${formatTime(Date.now())}`}
            </button>
          </div>
        </section>

        <TrendChart moods={moods} />

        <CalendarTimeline moods={moods} onBadgeClick={(m) => setModalMood(m)} />

        <footer style={{ marginTop: 32, textAlign: 'center', color: '#A0A8BA', fontSize: 12 }}>
          💡 小提示：拖动时间轴可左右滚动 · 点击徽章查看笔记与回放动画
        </footer>
      </main>

      <MoodModal mood={modalMood} onClose={() => setModalMood(null)} />
    </div>
  )
}
