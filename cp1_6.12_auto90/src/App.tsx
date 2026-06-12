import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { Timeline } from './TimeLine'
import { CardWall } from './CardWall'
import { SidePanel } from './SidePanel'
import { TimeRange } from './types'
import { dataStore, getTimeRangeForDays } from './dataStore'

export const App: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>(() =>
    getTimeRangeForDays(30)
  )
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleTimeRangeChange = useCallback((range: TimeRange) => {
    setTimeRange(range)
  }, [])

  const handleTagClick = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }, [])

  const handleClearTags = useCallback(() => {
    setSelectedTags([])
  }, [])

  const handleSearchInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setSearchInput(value)

      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current)
      }

      searchTimerRef.current = setTimeout(() => {
        setSearchQuery(value)
      }, 300)
    },
    []
  )

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current)
      }
    }
  }, [])

  const filteredEntries = useMemo(() => {
    let result = dataStore.filterByTimeRange(timeRange)
    result = dataStore.filterByTags(result, selectedTags)
    result = dataStore.fuzzySearch(result, searchQuery)
    return result
  }, [timeRange, selectedTags, searchQuery])

  const tagCloud = useMemo(() => {
    const timeFiltered = dataStore.filterByTimeRange(timeRange)
    return dataStore.getTagCloud(timeFiltered)
  }, [timeRange])

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-left">
          <div className="logo">
            <span className="logo-icon">⏳</span>
            <span className="logo-text">MomentBox</span>
          </div>
          <div className="header-subtitle">时间轴浏览历史记录</div>
        </div>

        <div className="search-container">
          <div className="search-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder="搜索标题或 URL..."
              value={searchInput}
              onChange={handleSearchInputChange}
            />
            {searchInput && (
              <button
                className="search-clear"
                onClick={() => {
                  setSearchInput('')
                  setSearchQuery('')
                }}
              >
                ×
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="timeline-section">
        <Timeline
          onTimeRangeChange={handleTimeRangeChange}
          totalDays={30}
        />
        <div className="stats-info">
          <span className="stats-count">{filteredEntries.length}</span>
          <span className="stats-label">条记录</span>
        </div>
      </div>

      <div className="main-content">
        <div className="cards-section">
          <CardWall entries={filteredEntries} searchQuery={searchQuery} />
        </div>
        <SidePanel
          tagCloud={tagCloud}
          selectedTags={selectedTags}
          onTagClick={handleTagClick}
          onClearTags={handleClearTags}
        />
      </div>

      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
            'Helvetica Neue', Arial, sans-serif;
          background: #1e1e2e;
          color: #cdd6f4;
          overflow: hidden;
        }

        .app-container {
          width: 100vw;
          height: 100vh;
          display: flex;
          flex-direction: column;
          background: #1e1e2e;
        }

        .app-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
          background: #2a2a3e;
          border-bottom: 0.5px solid rgba(205, 214, 244, 0.1);
        }

        .header-left {
          display: flex;
          align-items: baseline;
          gap: 16px;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .logo-icon {
          font-size: 24px;
        }

        .logo-text {
          font-size: 20px;
          font-weight: 700;
          background: linear-gradient(135deg, #89b4fa, #b4befe);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .header-subtitle {
          font-size: 13px;
          color: rgba(205, 214, 244, 0.5);
        }

        .search-container {
          flex: 0 0 400px;
        }

        .search-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-icon {
          position: absolute;
          left: 12px;
          font-size: 14px;
          opacity: 0.5;
          z-index: 1;
        }

        .search-input {
          width: 100%;
          padding: 10px 40px 10px 36px;
          font-size: 14px;
          background: rgba(30, 30, 46, 0.8);
          border: 1.5px solid rgba(205, 214, 244, 0.15);
          border-radius: 8px;
          color: #cdd6f4;
          outline: none;
          transition: border-color 0.2s ease-out;
        }

        .search-input::placeholder {
          color: rgba(205, 214, 244, 0.3);
        }

        .search-input:focus {
          animation: borderGradient 2s linear infinite;
          border-width: 1.5px;
          border-style: solid;
        }

        @keyframes borderGradient {
          0% {
            border-color: #89b4fa;
          }
          50% {
            border-color: #b4befe;
          }
          100% {
            border-color: #89b4fa;
          }
        }

        .search-clear {
          position: absolute;
          right: 10px;
          background: none;
          border: none;
          color: rgba(205, 214, 244, 0.4);
          font-size: 18px;
          cursor: pointer;
          padding: 2px 6px;
          border-radius: 4px;
          transition: all 0.15s ease-out;
        }

        .search-clear:hover {
          background: rgba(205, 214, 244, 0.1);
          color: #cdd6f4;
        }

        .search-clear:active {
          transform: scale(0.95);
        }

        .timeline-section {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 24px;
          padding: 16px 24px;
          background: #1e1e2e;
          border-bottom: 0.5px solid rgba(205, 214, 244, 0.08);
        }

        .stats-info {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 8px 20px;
          background: #2a2a3e;
          border-radius: 8px;
          border: 0.5px solid rgba(205, 214, 244, 0.1);
        }

        .stats-count {
          font-size: 24px;
          font-weight: 700;
          background: linear-gradient(135deg, #89b4fa, #b4befe);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .stats-label {
          font-size: 11px;
          color: rgba(205, 214, 244, 0.5);
        }

        .main-content {
          flex: 1;
          display: flex;
          overflow: hidden;
        }

        .cards-section {
          flex: 1;
          overflow: hidden;
        }
      `}</style>
    </div>
  )
}
