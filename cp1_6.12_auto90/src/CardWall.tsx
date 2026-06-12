import React, { useEffect, useState, useMemo, useRef } from 'react'
import { HistoryEntry } from './types'
import { dataStore } from './dataStore'

interface CardWallProps {
  entries: HistoryEntry[]
  searchQuery: string
}

interface CardProps {
  entry: HistoryEntry
  index: number
  searchQuery: string
}

const Card: React.FC<CardProps> = ({ entry, index, searchQuery }) => {
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    )
    if (diffDays === 0) {
      const h = date.getHours().toString().padStart(2, '0')
      const m = date.getMinutes().toString().padStart(2, '0')
      return `今天 ${h}:${m}`
    }
    if (diffDays === 1) return '昨天'
    if (diffDays < 7) return `${diffDays}天前`
    return `${date.getMonth() + 1}月${date.getDate()}日`
  }

  const highlightedTitle = useMemo(
    () => dataStore.getHighlightedText(entry.title, searchQuery),
    [entry.title, searchQuery]
  )

  const highlightedUrl = useMemo(
    () => dataStore.getHighlightedText(entry.url, searchQuery),
    [entry.url, searchQuery]
  )

  return (
    <div
      className="mb-card"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="mb-card-inner">
        <div className="mb-card-head">
          <img
            src={entry.favicon}
            alt=""
            className="mb-card-icon"
            onError={(e) => {
              ;(e.target as HTMLImageElement).src =
                'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" rx="3" fill="%2389b4fa"/><text x="8" y="11" text-anchor="middle" font-size="8" fill="white" font-family="Arial">W</text></svg>'
            }}
          />
          <div className="mb-card-title">
            {highlightedTitle.map((part, i) => (
              <span key={i} className={part.highlighted ? 'mb-hl' : ''}>
                {part.text}
              </span>
            ))}
          </div>
        </div>

        <div className="mb-card-url">
          {highlightedUrl.map((part, i) => (
            <span key={i} className={part.highlighted ? 'mb-hl' : ''}>
              {part.text}
            </span>
          ))}
        </div>

        <div className="mb-card-foot">
          <div className="mb-card-visits">
            <span className="mb-card-visits-num">{entry.visitCount}</span>
            <span className="mb-card-visits-label">次访问</span>
          </div>
          <div className="mb-card-time">{formatTime(entry.timestamp)}</div>
        </div>

        <div className="mb-card-tags">
          {entry.tags.map((tag) => (
            <span key={tag} className="mb-card-tag">{tag}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

export const CardWall: React.FC<CardWallProps> = ({ entries, searchQuery }) => {
  const [animKey, setAnimKey] = useState(0)
  const prevIdsRef = useRef('')

  useEffect(() => {
    const idSig = entries.map((e) => e.id).join(',')
    if (idSig !== prevIdsRef.current) {
      prevIdsRef.current = idSig
      setAnimKey((k) => k + 1)
    }
  }, [entries])

  return (
    <div className="mb-wall-wrap">
      {entries.length === 0 ? (
        <div className="mb-wall-empty">
          <div className="mb-wall-empty-icon">🔍</div>
          <div className="mb-wall-empty-text">没有找到匹配的历史记录</div>
        </div>
      ) : (
        <div key={animKey} className="mb-wall">
          {entries.map((entry, index) => (
            <Card
              key={entry.id}
              entry={entry}
              index={index}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      )}

      <style>{`
        .mb-wall-wrap {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          padding-right: 8px;
        }
        .mb-wall-wrap::-webkit-scrollbar {
          width: 6px;
        }
        .mb-wall-wrap::-webkit-scrollbar-track {
          background: transparent;
        }
        .mb-wall-wrap::-webkit-scrollbar-thumb {
          background: rgba(137,180,250,.3);
          border-radius: 3px;
        }
        .mb-wall-wrap::-webkit-scrollbar-thumb:hover {
          background: rgba(137,180,250,.5);
        }

        .mb-wall {
          column-count: 3;
          column-gap: 16px;
        }
        @media (max-width: 1200px) {
          .mb-wall { column-count: 2; }
        }
        @media (max-width: 768px) {
          .mb-wall { column-count: 1; }
        }

        .mb-card {
          break-inside: avoid;
          margin-bottom: 16px;
          animation: mb-slide-up 300ms ease-out backwards;
        }

        @keyframes mb-slide-up {
          from {
            opacity: 0;
            transform: translateY(24px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .mb-card-inner {
          background: #2a2a3e;
          border: 0.5px solid rgba(205,214,244,.15);
          border-radius: 8px;
          padding: 16px;
          transition: transform 200ms ease-out, box-shadow 200ms ease-out, border-color 200ms ease-out;
          cursor: pointer;
        }
        .mb-card-inner:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0,0,0,.3);
          border-color: rgba(137,180,250,.4);
        }

        .mb-card-head {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 10px;
        }
        .mb-card-icon {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          flex-shrink: 0;
          background: rgba(205,214,244,.1);
        }
        .mb-card-title {
          flex: 1;
          font-size: 14px;
          font-weight: 500;
          color: #cdd6f4;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          word-break: break-all;
        }
        .mb-card-url {
          font-size: 11px;
          color: rgba(205,214,244,.5);
          margin-bottom: 12px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-family: monospace;
        }
        .mb-card-foot {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        .mb-card-visits {
          display: flex;
          align-items: baseline;
          gap: 4px;
        }
        .mb-card-visits-num {
          font-size: 16px;
          font-weight: 600;
          color: #89b4fa;
        }
        .mb-card-visits-label {
          font-size: 11px;
          color: rgba(205,214,244,.5);
        }
        .mb-card-time {
          font-size: 11px;
          color: rgba(205,214,244,.5);
        }
        .mb-card-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .mb-card-tag {
          font-size: 10px;
          padding: 3px 8px;
          background: rgba(137,180,250,.15);
          color: #89b4fa;
          border-radius: 4px;
        }

        .mb-hl {
          background: rgba(250,204,21,.3);
          color: #f9e2af;
          padding: 1px 2px;
          border-radius: 2px;
        }

        .mb-wall-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          color: rgba(205,214,244,.5);
        }
        .mb-wall-empty-icon {
          font-size: 48px;
          margin-bottom: 16px;
          opacity: .5;
        }
        .mb-wall-empty-text {
          font-size: 14px;
        }
      `}</style>
    </div>
  )
}
