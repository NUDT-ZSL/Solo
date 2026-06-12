import React, { useEffect, useState, useMemo } from 'react'
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
      const hours = date.getHours().toString().padStart(2, '0')
      const minutes = date.getMinutes().toString().padStart(2, '0')
      return `今天 ${hours}:${minutes}`
    } else if (diffDays === 1) {
      return '昨天'
    } else if (diffDays < 7) {
      return `${diffDays}天前`
    } else {
      const month = date.getMonth() + 1
      const day = date.getDate()
      return `${month}月${day}日`
    }
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
      className="card-item"
      style={{
        animationDelay: `${index * 80}ms`
      }}
    >
      <div className="card-inner">
        <div className="card-header">
          <img
            src={entry.favicon}
            alt=""
            className="card-favicon"
            onError={(e) => {
              ;(e.target as HTMLImageElement).src =
                'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" rx="3" fill="%2389b4fa"/><text x="8" y="11" text-anchor="middle" font-size="8" fill="white" font-family="Arial">W</text></svg>'
            }}
          />
          <div className="card-title">
            {highlightedTitle.map((part, i) => (
              <span
                key={i}
                className={part.highlighted ? 'highlight' : ''}
              >
                {part.text}
              </span>
            ))}
          </div>
        </div>

        <div className="card-url">
          {highlightedUrl.map((part, i) => (
            <span key={i} className={part.highlighted ? 'highlight' : ''}>
              {part.text}
            </span>
          ))}
        </div>

        <div className="card-footer">
          <div className="card-visits">
            <span className="visits-count">{entry.visitCount}</span>
            <span className="visits-label">次访问</span>
          </div>
          <div className="card-time">{formatTime(entry.timestamp)}</div>
        </div>

        <div className="card-tags">
          {entry.tags.map((tag) => (
            <span key={tag} className="card-tag">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export const CardWall: React.FC<CardWallProps> = ({ entries, searchQuery }) => {
  const [key, setKey] = useState(0)

  useEffect(() => {
    setKey((k) => k + 1)
  }, [entries.length])

  return (
    <div className="card-wall-container">
      {entries.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <div className="empty-text">没有找到匹配的历史记录</div>
        </div>
      ) : (
        <div key={key} className="card-wall">
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
        .card-wall-container {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          padding-right: 8px;
        }

        .card-wall-container::-webkit-scrollbar {
          width: 6px;
        }

        .card-wall-container::-webkit-scrollbar-track {
          background: transparent;
        }

        .card-wall-container::-webkit-scrollbar-thumb {
          background: rgba(137, 180, 250, 0.3);
          border-radius: 3px;
        }

        .card-wall-container::-webkit-scrollbar-thumb:hover {
          background: rgba(137, 180, 250, 0.5);
        }

        .card-wall {
          column-count: 3;
          column-gap: 16px;
        }

        @media (max-width: 1200px) {
          .card-wall {
            column-count: 2;
          }
        }

        @media (max-width: 768px) {
          .card-wall {
            column-count: 1;
          }
        }

        .card-item {
          break-inside: avoid;
          margin-bottom: 16px;
          animation: slideUp 300ms ease-out backwards;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .card-inner {
          background: #2a2a3e;
          border: 0.5px solid rgba(205, 214, 244, 0.15);
          border-radius: 8px;
          padding: 16px;
          transition: transform 200ms ease-out, box-shadow 200ms ease-out, border-color 200ms ease-out;
          cursor: pointer;
        }

        .card-inner:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
          border-color: rgba(137, 180, 250, 0.4);
        }

        .card-header {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 10px;
        }

        .card-favicon {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          flex-shrink: 0;
          background: rgba(205, 214, 244, 0.1);
        }

        .card-title {
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

        .card-url {
          font-size: 11px;
          color: rgba(205, 214, 244, 0.5);
          margin-bottom: 12px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-family: monospace;
        }

        .card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }

        .card-visits {
          display: flex;
          align-items: baseline;
          gap: 4px;
        }

        .visits-count {
          font-size: 16px;
          font-weight: 600;
          color: #89b4fa;
        }

        .visits-label {
          font-size: 11px;
          color: rgba(205, 214, 244, 0.5);
        }

        .card-time {
          font-size: 11px;
          color: rgba(205, 214, 244, 0.5);
        }

        .card-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .card-tag {
          font-size: 10px;
          padding: 3px 8px;
          background: rgba(137, 180, 250, 0.15);
          color: #89b4fa;
          border-radius: 4px;
        }

        .highlight {
          background: rgba(250, 204, 21, 0.3);
          color: #f9e2af;
          padding: 1px 2px;
          border-radius: 2px;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          color: rgba(205, 214, 244, 0.5);
        }

        .empty-icon {
          font-size: 48px;
          margin-bottom: 16px;
          opacity: 0.5;
        }

        .empty-text {
          font-size: 14px;
        }
      `}</style>
    </div>
  )
}
