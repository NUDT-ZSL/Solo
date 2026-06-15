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
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
      searchTimerRef.current = setTimeout(() => setSearchQuery(value), 300)
    },
    []
  )

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
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
    <div className="mb-app">
      <header className="mb-header">
        <div className="mb-header-left">
          <div className="mb-logo">
            <span className="mb-logo-icon">⏳</span>
            <span className="mb-logo-text">MomentBox</span>
          </div>
          <div className="mb-header-sub">时间轴浏览历史记录</div>
        </div>

        <div className="mb-search-box">
          <div className="mb-search-wrap">
            <span className="mb-search-ico">🔍</span>
            <input
              type="text"
              className="mb-search-input"
              placeholder="搜索标题或 URL..."
              value={searchInput}
              onChange={handleSearchInputChange}
            />
            {searchInput && (
              <button
                className="mb-search-rm"
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

      <div className="mb-timeline-row">
        <Timeline onTimeRangeChange={handleTimeRangeChange} totalDays={30} />
        <div className="mb-stats">
          <span className="mb-stats-num">{filteredEntries.length}</span>
          <span className="mb-stats-label">条记录</span>
        </div>
      </div>

      <div className="mb-main">
        <div className="mb-cards-area">
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
        *{margin:0;padding:0;box-sizing:border-box}
        body{
          font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;
          background:#1e1e2e;
          color:#cdd6f4;
          overflow:hidden;
        }

        .mb-app{
          width:100vw;height:100vh;
          display:flex;flex-direction:column;
          background:#1e1e2e;
        }

        .mb-header{
          display:flex;justify-content:space-between;align-items:center;
          padding:16px 24px;
          background:#2a2a3e;
          border-bottom:.5px solid rgba(205,214,244,.1);
        }
        .mb-header-left{display:flex;align-items:baseline;gap:16px}
        .mb-logo{display:flex;align-items:center;gap:8px}
        .mb-logo-icon{font-size:24px}
        .mb-logo-text{
          font-size:20px;font-weight:700;
          background:linear-gradient(135deg,#89b4fa,#b4befe);
          -webkit-background-clip:text;-webkit-text-fill-color:transparent;
          background-clip:text;
        }
        .mb-header-sub{font-size:13px;color:rgba(205,214,244,.5)}

        .mb-search-box{flex:0 0 400px}
        .mb-search-wrap{position:relative;display:flex;align-items:center}
        .mb-search-ico{position:absolute;left:12px;font-size:14px;opacity:.5;z-index:1}

        .mb-search-input{
          width:100%;
          padding:10px 40px 10px 36px;
          font-size:14px;
          background:rgba(30,30,46,.8);
          border:1.5px solid rgba(205,214,244,.15);
          border-radius:8px;
          color:#cdd6f4;
          outline:none;
          transition:border-color .2s ease-out;
        }
        .mb-search-input::placeholder{color:rgba(205,214,244,.3)}
        .mb-search-input:focus{
          animation:mb-border-glow 2s linear infinite;
          border-width:1.5px;
          border-style:solid;
        }
        @keyframes mb-border-glow{
          0%  {border-color:#89b4fa}
          50% {border-color:#b4befe}
          100%{border-color:#89b4fa}
        }

        .mb-search-rm{
          position:absolute;right:10px;
          background:none;border:none;
          color:rgba(205,214,244,.4);
          font-size:18px;cursor:pointer;
          padding:2px 6px;border-radius:4px;
          transition:all .15s ease-out;
        }
        .mb-search-rm:hover{background:rgba(205,214,244,.1);color:#cdd6f4}
        .mb-search-rm:active{transform:scale(.95)}

        .mb-timeline-row{
          display:flex;align-items:center;justify-content:center;gap:24px;
          padding:16px 24px;
          background:#1e1e2e;
          border-bottom:.5px solid rgba(205,214,244,.08);
        }
        .mb-stats{
          display:flex;flex-direction:column;align-items:center;
          padding:8px 20px;
          background:#2a2a3e;border-radius:8px;
          border:.5px solid rgba(205,214,244,.1);
        }
        .mb-stats-num{
          font-size:24px;font-weight:700;
          background:linear-gradient(135deg,#89b4fa,#b4befe);
          -webkit-background-clip:text;-webkit-text-fill-color:transparent;
          background-clip:text;
        }
        .mb-stats-label{font-size:11px;color:rgba(205,214,244,.5)}

        .mb-main{flex:1;display:flex;overflow:hidden}
        .mb-cards-area{flex:1;overflow:hidden}
      `}</style>
    </div>
  )
}
