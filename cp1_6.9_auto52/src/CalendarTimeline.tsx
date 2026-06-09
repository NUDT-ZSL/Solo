import React, { useRef, useState, useMemo, useEffect } from 'react'
import type { MoodRecord } from './types'
import { createBadgeDataURL } from './BadgeCanvas'

interface Props {
  moods: MoodRecord[]
  onBadgeClick: (mood: MoodRecord) => void
}

function dateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatDayLabel(key: string, todayKey: string): string {
  const d = new Date(key)
  const wd = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()]
  const md = `${d.getMonth() + 1}月${d.getDate()}日`
  if (key === todayKey) return `${md} · 今天 · ${wd}`
  return `${md} · ${wd}`
}

export const CalendarTimeline: React.FC<Props> = ({ moods, onBadgeClick }) => {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const dragState = useRef({ startX: 0, startScroll: 0, moved: false })

  const todayKey = dateKey(new Date())

  const grouped = useMemo(() => {
    const map = new Map<string, MoodRecord[]>()
    moods.forEach((m) => {
      const k = dateKey(new Date(m.timestamp))
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(m)
    })

    const days: string[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      days.push(dateKey(d))
    }

    const extras = Array.from(map.keys()).filter((k) => !days.includes(k))
    extras.sort()
    const allKeys = [...extras, ...days]

    return allKeys
      .filter((k) => map.has(k) || days.includes(k))
      .map((k) => ({
        key: k,
        items: (map.get(k) || []).sort((a, b) => a.timestamp - b.timestamp),
      }))
  }, [moods])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    requestAnimationFrame(() => {
      el.scrollLeft = el.scrollWidth
    })
  }, [grouped.length])

  const onMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    dragState.current = {
      startX: e.clientX,
      startScroll: scrollRef.current!.scrollLeft,
      moved: false,
    }
  }
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    const dx = e.clientX - dragState.current.startX
    if (Math.abs(dx) > 3) dragState.current.moved = true
    scrollRef.current!.scrollLeft = dragState.current.startScroll - dx
  }
  const onMouseUp = () => {
    setTimeout(() => setIsDragging(false), 50)
  }
  const onMouseLeave = () => setIsDragging(false)

  const badgeCache = useRef(new Map<string, string>())
  const getBadgeUrl = (m: MoodRecord) => {
    const k = m.id
    if (badgeCache.current.has(k)) return badgeCache.current.get(k)!
    const url = createBadgeDataURL({
      color: m.color,
      emoji: m.emoji,
      rotation: m.badgeParams.rotation,
      size: m.badgeParams.size,
      shape: m.shape,
    })
    badgeCache.current.set(k, url)
    return url
  }

  return (
    <>
      <div className="timeline-section-title">🗓️ 情绪时间轴</div>
      <div
        ref={scrollRef}
        className={`timeline-scroll ${isDragging ? 'dragging' : ''}`}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
      >
        <div className="day-cards">
          {grouped.map(({ key, items }) => {
            const isToday = key === todayKey
            return (
              <div
                key={key}
                className={`day-card ${isToday ? 'today' : ''}`}
              >
                <div className="day-header">
                  <span className="day-date">{formatDayLabel(key, todayKey)}</span>
                  <span className="day-count">{items.length} 条</span>
                </div>
                <div className="day-badges">
                  {items.length === 0 ? (
                    <span className="empty-day">暂无记录</span>
                  ) : (
                    items.map((m) => (
                      <div
                        key={m.id}
                        className="badge-item"
                        onClick={(e) => {
                          if (dragState.current.moved) {
                            e.preventDefault()
                            return
                          }
                          onBadgeClick(m)
                        }}
                        title={`${m.label} · ${new Date(m.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`}
                      >
                        <img
                          src={getBadgeUrl(m)}
                          alt={m.label}
                          width={m.badgeParams.size}
                          height={m.badgeParams.size}
                          draggable={false}
                        />
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
