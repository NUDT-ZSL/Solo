import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { timelineData } from './data'
import Timeline from './Timeline'
import WorkCard from './WorkCard'

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debouncedValue
}

export default function App() {
  const [activeYear, setActiveYear] = useState(timelineData[0]?.year ?? '')
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearch = useDebounce(searchQuery, 200)
  const inputRef = useRef<HTMLInputElement>(null)

  const filteredWorks = useMemo(() => {
    const yearNode = timelineData.find((n) => n.year === activeYear)
    if (!yearNode) return []
    if (!debouncedSearch.trim()) return yearNode.works
    const query = debouncedSearch.toLowerCase()
    return yearNode.works.filter(
      (w) =>
        w.title.toLowerCase().includes(query) ||
        w.description.toLowerCase().includes(query) ||
        w.tags.some((t) => t.toLowerCase().includes(query))
    )
  }, [activeYear, debouncedSearch])

  const handleSetActiveYear = useCallback((year: string) => {
    setActiveYear(year)
  }, [])

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header__brand">
          <h1 className="app-header__title">手作时光</h1>
          <p className="app-header__subtitle">工作室创作历程</p>
        </div>
        <div className="app-header__search">
          <svg className="app-header__search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            className="app-header__search-input"
            placeholder="搜索作品..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="app-header__search-clear"
              onClick={() => {
                setSearchQuery('')
                inputRef.current?.focus()
              }}
            >
              ✕
            </button>
          )}
        </div>
      </header>

      <div className="app-body">
        <Timeline
          years={timelineData}
          activeYear={activeYear}
          setActiveYear={handleSetActiveYear}
        />
        <main className="app-main">
          <div className="app-main__year-label">
            <span className="app-main__year">{activeYear}</span>
            <span className="app-main__year-title">
              {timelineData.find((n) => n.year === activeYear)?.title}
            </span>
          </div>
          <WorkCard works={filteredWorks} />
        </main>
      </div>
    </div>
  )
}
