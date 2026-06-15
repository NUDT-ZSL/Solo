import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import type { Memo, DisplayMemo, DateRange } from './types'
import { toDisplayMemo } from './types'
import MapView from './components/MapView'
import MemoPanel from './components/MemoPanel'
import TimelineSlider from './components/TimelineSlider'
import Toolbar from './components/Toolbar'

const COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#FFEAA7',
  '#DDA0DD',
  '#98D8C8',
]

const FADE_DURATION = 300

function getColorByDate(timestamp: number): string {
  const date = new Date(timestamp)
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
  )
  return COLORS[dayOfYear % 7]
}

export default function App() {
  const [memos, setMemos] = useState<Memo[]>([])
  const [selectedMemoId, setSelectedMemoId] = useState<number | null>(null)
  const [dateRange, setDateRange] = useState<DateRange>('all')
  const [heatmapMode, setHeatmapMode] = useState(false)
  const [heatmapRadius, setHeatmapRadius] = useState(30)
  const [panelCollapsed, setPanelCollapsed] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [displayMemos, setDisplayMemos] = useState<DisplayMemo[]>([])

  const prevFilteredIdsRef = useRef<Set<number>>(new Set())
  const fadeTimerRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)

  const filteredMemos: Memo[] = useMemo(() => {
    if (dateRange === 'all') return memos

    const now = Date.now()
    const days = dateRange === '7days' ? 7 : 30
    const threshold = now - days * 24 * 60 * 60 * 1000

    return memos.filter((m: Memo) => m.timestamp >= threshold)
  }, [memos, dateRange])

  const selectedMemo: Memo | null = useMemo(
    () => memos.find((m: Memo) => m.id === selectedMemoId) || null,
    [memos, selectedMemoId]
  )

  useEffect(() => {
    let isStale = false

    const newIds = new Set(filteredMemos.map((m) => m.id))
    const prevIds = prevFilteredIdsRef.current

    const entering: number[] = []
    const staying: number[] = []
    const leaving: number[] = []

    newIds.forEach((id) => {
      if (prevIds.has(id)) {
        staying.push(id)
      } else {
        entering.push(id)
      }
    })

    prevIds.forEach((id) => {
      if (!newIds.has(id)) {
        leaving.push(id)
      }
    })

    const memoMap = new Map<number, Memo>()
    memos.forEach((m) => memoMap.set(m.id, m))

    const buildPhase = (
      stayingOpacity: number,
      enteringOpacity: number,
      leavingOpacity: number,
      includeLeaving: boolean
    ): DisplayMemo[] => {
      const result: DisplayMemo[] = []

      staying.forEach((id) => {
        const m = memoMap.get(id)
        if (m) result.push(toDisplayMemo(m, stayingOpacity))
      })

      entering.forEach((id) => {
        const m = memoMap.get(id)
        if (m) result.push(toDisplayMemo(m, enteringOpacity))
      })

      if (includeLeaving) {
        leaving.forEach((id) => {
          const m = memoMap.get(id)
          if (m) result.push(toDisplayMemo(m, leavingOpacity))
        })
      }

      return result
    }

    const phase1 = buildPhase(1, 0, 1, true)
    setDisplayMemos(phase1)

    if (fadeTimerRef.current !== null) {
      clearTimeout(fadeTimerRef.current)
      fadeTimerRef.current = null
    }
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }

    rafRef.current = requestAnimationFrame(() => {
      if (isStale) return

      const phase2 = buildPhase(1, 1, 0, true)
      setDisplayMemos(phase2)

      fadeTimerRef.current = window.setTimeout(() => {
        if (isStale) return

        const phase3 = buildPhase(1, 1, 1, false)
        setDisplayMemos(phase3)
        prevFilteredIdsRef.current = newIds

        fadeTimerRef.current = null
      }, FADE_DURATION)

      rafRef.current = null
    })

    return () => {
      isStale = true
      if (fadeTimerRef.current !== null) {
        clearTimeout(fadeTimerRef.current)
        fadeTimerRef.current = null
      }
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [filteredMemos, memos])

  const fetchMemos = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await fetch('/api/memos')
      if (res.ok) {
        const data = await res.json() as Memo[]
        setMemos(data)
      }
    } catch (error) {
      console.error('Failed to fetch memos:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMemos()
  }, [fetchMemos])

  useEffect(() => {
    return () => {
      if (fadeTimerRef.current !== null) {
        clearTimeout(fadeTimerRef.current)
      }
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [])

  const handleMemoAdd = useCallback(async (lng: number, lat: number) => {
    const content = window.prompt('请输入备忘内容（最多200字）：')
    if (!content || content.trim() === '') return
    if (content.length > 200) {
      alert('内容不能超过200字')
      return
    }

    try {
      const res = await fetch('/api/memos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lng,
          lat,
          content: content.trim(),
          timestamp: Date.now(),
        }),
      })
      if (res.ok) {
        const newMemo = await res.json() as Memo
        setMemos((prev) => [newMemo, ...prev])
      }
    } catch (error) {
      console.error('Failed to create memo:', error)
    }
  }, [])

  const handleMemoUpdate = useCallback(async (memoId: number, newContent: string) => {
    if (newContent.length > 200) {
      alert('内容不能超过200字')
      return
    }

    try {
      const res = await fetch(`/api/memos/${memoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newContent }),
      })
      if (res.ok) {
        const updatedMemo = await res.json() as Memo
        setMemos((prev) => prev.map((m: Memo) => (m.id === memoId ? updatedMemo : m)))
      }
    } catch (error) {
      console.error('Failed to update memo:', error)
    }
  }, [])

  const handleMemoDelete = useCallback(async (memoId: number) => {
    if (!window.confirm('确定要删除这条备忘吗？')) return

    try {
      const res = await fetch(`/api/memos/${memoId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setMemos((prev) => prev.filter((m: Memo) => m.id !== memoId))
        setSelectedMemoId(null)
      }
    } catch (error) {
      console.error('Failed to delete memo:', error)
    }
  }, [])

  const handleMemoSelect = useCallback((memoId: number | null) => {
    setSelectedMemoId(memoId)
  }, [])

  const useCanvas = filteredMemos.length > 200

  return (
    <div className="app-container">
      <div className="map-wrapper">
        <MapView
          memos={displayMemos}
          selectedMemoId={selectedMemoId}
          onMemoAdd={handleMemoAdd}
          onMemoSelect={handleMemoSelect}
          getColorByDate={getColorByDate}
          heatmapMode={heatmapMode}
          heatmapRadius={heatmapRadius}
          useCanvas={useCanvas}
        />

        <Toolbar
          heatmapMode={heatmapMode}
          onHeatmapToggle={() => setHeatmapMode((prev) => !prev)}
          heatmapRadius={heatmapRadius}
          onHeatmapRadiusChange={setHeatmapRadius}
        />

        <TimelineSlider
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          memoCount={filteredMemos.length}
        />
      </div>

      <MemoPanel
        memos={filteredMemos}
        selectedMemo={selectedMemo}
        onSelect={handleMemoSelect}
        onUpdate={handleMemoUpdate}
        onDelete={handleMemoDelete}
        getColorByDate={getColorByDate}
        collapsed={panelCollapsed}
        onToggleCollapse={() => setPanelCollapsed((prev) => !prev)}
      />
    </div>
  )
}
