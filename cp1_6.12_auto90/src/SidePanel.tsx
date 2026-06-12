import React, { useState, useMemo } from 'react'
import { TagCloudItem } from './types'

interface SidePanelProps {
  tagCloud: TagCloudItem[]
  selectedTags: string[]
  onTagClick: (tag: string) => void
  onClearTags: () => void
}

interface Ripple {
  id: number
  tag: string
  x: number
  y: number
}

export const SidePanel: React.FC<SidePanelProps> = ({
  tagCloud,
  selectedTags,
  onTagClick,
  onClearTags
}) => {
  const [isExpanded, setIsExpanded] = useState(true)
  const [tagsExpanded, setTagsExpanded] = useState(true)
  const [ripples, setRipples] = useState<Ripple[]>([])

  const handleTagClick = (tag: string, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const parentRect = (e.currentTarget as HTMLElement).offsetParent?.getBoundingClientRect()
    
    const x = rect.left - (parentRect?.left || 0) + rect.width / 2
    const y = rect.top - (parentRect?.top || 0) + rect.height / 2

    const newRipple: Ripple = {
      id: Date.now(),
      tag,
      x,
      y
    }

    setRipples((prev) => [...prev, newRipple])

    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id))
    }, 400)

    onTagClick(tag)
  }

  const visibleTags = useMemo(() => {
    return tagCloud.slice(0, 20)
  }, [tagCloud])

  return (
    <div className={`side-panel ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <button
        className="panel-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? '◀' : '▶'}
      </button>

      {isExpanded && (
        <div className="panel-content">
          <div className="panel-header">
            <h3 className="panel-title">关键词云</h3>
            {selectedTags.length > 0 && (
              <button className="clear-btn" onClick={onClearTags}>
                清除
              </button>
            )}
          </div>

          <button
            className="collapse-toggle"
            onClick={() => setTagsExpanded(!tagsExpanded)}
          >
            <span>{tagsExpanded ? '▼' : '▶'}</span>
            <span>高频关键词</span>
            <span className="tag-count">{tagCloud.length}</span>
          </button>

          {tagsExpanded && (
            <div className="tag-cloud">
              {visibleTags.map((item) => (
                <div
                  key={item.tag}
                  className={`tag-wrapper ${selectedTags.includes(item.tag) ? 'selected' : ''}`}
                  onClick={(e) => handleTagClick(item.tag, e)}
                >
                  <span
                    className="tag-text"
                    style={{ fontSize: `${item.size}px` }}
                  >
                    {item.tag}
                  </span>
                  <span className="tag-count-badge">{item.count}</span>
                  {ripples
                    .filter((r) => r.tag === item.tag)
                    .map((ripple) => (
                      <span
                        key={ripple.id}
                        className="ripple"
                        style={{
                          left: ripple.x,
                          top: ripple.y
                        }}
                      />
                    ))}
                </div>
              ))}
            </div>
          )}

          {selectedTags.length > 0 && (
            <div className="selected-tags-section">
              <div className="selected-tags-title">已选标签</div>
              <div className="selected-tags-list">
                {selectedTags.map((tag) => (
                  <span key={tag} className="selected-tag">
                    {tag}
                    <button
                      className="remove-tag"
                      onClick={() => onTagClick(tag)}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        .side-panel {
          position: relative;
          height: 100%;
          background: #2a2a3e;
          border-left: 0.5px solid rgba(205, 214, 244, 0.1);
          transition: width 300ms cubic-bezier(0.4, 0, 0.2, 1);
          overflow: hidden;
          flex-shrink: 0;
        }

        .side-panel.collapsed {
          width: 40px;
        }

        .side-panel.expanded {
          width: 320px;
        }

        .panel-toggle {
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 24px;
          height: 48px;
          background: linear-gradient(135deg, #89b4fa, #b4befe);
          border: none;
          border-radius: 0 8px 8px 0;
          color: #1e1e2e;
          cursor: pointer;
          font-size: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10;
          transition: transform 0.15s ease-out;
        }

        .panel-toggle:hover {
          transform: translateY(-50%) scale(1.05);
        }

        .panel-toggle:active {
          transform: translateY(-50%) scale(0.95);
          transition: transform 0.15s ease-out;
        }

        .panel-content {
          padding: 20px;
          padding-left: 32px;
          height: 100%;
          overflow-y: auto;
          animation: fadeIn 0.3s ease-out;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateX(10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .panel-content::-webkit-scrollbar {
          width: 4px;
        }

        .panel-content::-webkit-scrollbar-track {
          background: transparent;
        }

        .panel-content::-webkit-scrollbar-thumb {
          background: rgba(137, 180, 250, 0.3);
          border-radius: 2px;
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .panel-title {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #cdd6f4;
        }

        .clear-btn {
          background: transparent;
          border: 1px solid rgba(137, 180, 250, 0.3);
          color: #89b4fa;
          font-size: 11px;
          padding: 4px 10px;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.15s ease-out;
        }

        .clear-btn:hover {
          background: rgba(137, 180, 250, 0.15);
          border-color: #89b4fa;
        }

        .clear-btn:active {
          transform: scale(0.95);
          transition: transform 0.15s ease-out;
        }

        .collapse-toggle {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          background: rgba(205, 214, 244, 0.05);
          border: 1px solid rgba(205, 214, 244, 0.1);
          border-radius: 6px;
          color: #cdd6f4;
          font-size: 13px;
          cursor: pointer;
          margin-bottom: 12px;
          transition: background 0.2s ease-out;
        }

        .collapse-toggle:hover {
          background: rgba(205, 214, 244, 0.1);
        }

        .collapse-toggle span:first-child {
          font-size: 10px;
          color: #89b4fa;
        }

        .tag-count {
          margin-left: auto;
          background: rgba(137, 180, 250, 0.2);
          color: #89b4fa;
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 10px;
        }

        .tag-cloud {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 20px;
        }

        .tag-wrapper {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: rgba(205, 214, 244, 0.08);
          border: 1px solid rgba(205, 214, 244, 0.12);
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.2s ease-out;
          overflow: hidden;
        }

        .tag-wrapper:hover {
          background: rgba(137, 180, 250, 0.15);
          border-color: rgba(137, 180, 250, 0.4);
        }

        .tag-wrapper.selected {
          background: linear-gradient(135deg, rgba(137, 180, 250, 0.3), rgba(180, 190, 254, 0.3));
          border-color: #89b4fa;
        }

        .tag-wrapper.selected .tag-text {
          color: #89b4fa;
          font-weight: 500;
        }

        .tag-text {
          color: rgba(205, 214, 244, 0.9);
          transition: color 0.2s ease-out;
        }

        .tag-count-badge {
          font-size: 10px;
          color: rgba(205, 214, 244, 0.5);
          background: rgba(205, 214, 244, 0.1);
          padding: 2px 6px;
          border-radius: 10px;
        }

        .tag-wrapper.selected .tag-count-badge {
          background: rgba(137, 180, 250, 0.3);
          color: #89b4fa;
        }

        .ripple {
          position: absolute;
          width: 0;
          height: 0;
          border-radius: 50%;
          background: rgba(137, 180, 250, 0.5);
          transform: translate(-50%, -50%);
          pointer-events: none;
          animation: rippleExpand 400ms ease-out forwards;
        }

        @keyframes rippleExpand {
          0% {
            width: 0;
            height: 0;
            opacity: 1;
          }
          100% {
            width: 60px;
            height: 60px;
            opacity: 0;
          }
        }

        .selected-tags-section {
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid rgba(205, 214, 244, 0.1);
        }

        .selected-tags-title {
          font-size: 12px;
          color: rgba(205, 214, 244, 0.5);
          margin-bottom: 10px;
        }

        .selected-tags-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .selected-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          background: linear-gradient(135deg, rgba(137, 180, 250, 0.2), rgba(180, 190, 254, 0.2));
          border: 1px solid #89b4fa;
          border-radius: 16px;
          font-size: 12px;
          color: #89b4fa;
        }

        .remove-tag {
          background: none;
          border: none;
          color: #89b4fa;
          font-size: 16px;
          cursor: pointer;
          padding: 0;
          line-height: 1;
          transition: transform 0.15s ease-out;
        }

        .remove-tag:hover {
          transform: scale(1.2);
        }
      `}</style>
    </div>
  )
}
