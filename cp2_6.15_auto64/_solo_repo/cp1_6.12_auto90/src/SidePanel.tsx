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
  const [ripples, setRipples] = useState<(Ripple & { tag: string })[]>([])

  const handleTagClick = (tag: string, e: React.MouseEvent) => {
    const wrapper = e.currentTarget as HTMLElement
    const rect = wrapper.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const id = Date.now() + Math.random()
    const ripple = { id, tag, x, y }
    setRipples((prev) => [...prev, ripple])
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id))
    }, 400)

    onTagClick(tag)
  }

  const visibleTags = useMemo(() => tagCloud.slice(0, 20), [tagCloud])

  return (
    <div className={`mb-side ${isExpanded ? 'mb-side-open' : 'mb-side-shut'}`}>
      <button
        className="mb-side-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? '◀' : '▶'}
      </button>

      {isExpanded && (
        <div className="mb-side-body">
          <div className="mb-side-head">
            <h3 className="mb-side-title">关键词云</h3>
            {selectedTags.length > 0 && (
              <button className="mb-side-clear" onClick={onClearTags}>
                清除
              </button>
            )}
          </div>

          <button
            className="mb-side-collapse"
            onClick={() => setTagsExpanded(!tagsExpanded)}
          >
            <span>{tagsExpanded ? '▼' : '▶'}</span>
            <span>高频关键词</span>
            <span className="mb-side-badge">{tagCloud.length}</span>
          </button>

          {tagsExpanded && (
            <div className="mb-tags">
              {visibleTags.map((item) => (
                <div
                  key={item.tag}
                  className={`mb-tag ${selectedTags.includes(item.tag) ? 'mb-tag-active' : ''}`}
                  onClick={(e) => handleTagClick(item.tag, e)}
                >
                  <span className="mb-tag-text" style={{ fontSize: `${item.size}px` }}>
                    {item.tag}
                  </span>
                  <span className="mb-tag-cnt">{item.count}</span>
                  {ripples
                    .filter((r) => r.tag === item.tag)
                    .map((r) => (
                      <span
                        key={r.id}
                        className="mb-ripple"
                        style={{ left: r.x, top: r.y }}
                      />
                    ))}
                </div>
              ))}
            </div>
          )}

          {selectedTags.length > 0 && (
            <div className="mb-sel-section">
              <div className="mb-sel-title">已选标签</div>
              <div className="mb-sel-list">
                {selectedTags.map((tag) => (
                  <span key={tag} className="mb-sel-tag">
                    {tag}
                    <button className="mb-sel-rm" onClick={() => onTagClick(tag)}>×</button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        .mb-side {
          position: relative;
          height: 100%;
          background: #2a2a3e;
          border-left: 0.5px solid rgba(205,214,244,.1);
          overflow: hidden;
          flex-shrink: 0;
          transition: width 300ms cubic-bezier(.4,0,.2,1);
        }
        .mb-side-shut { width: 40px; }
        .mb-side-open { width: 320px; }

        .mb-side-toggle {
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 24px;
          height: 48px;
          background: linear-gradient(135deg,#89b4fa,#b4befe);
          border: none;
          border-radius: 0 8px 8px 0;
          color: #1e1e2e;
          cursor: pointer;
          font-size: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10;
          transition: transform .15s ease-out;
        }
        .mb-side-toggle:hover { transform: translateY(-50%) scale(1.05); }
        .mb-side-toggle:active { transform: translateY(-50%) scale(.95); transition: transform .15s ease-out; }

        .mb-side-body {
          padding: 20px 20px 20px 32px;
          height: 100%;
          overflow-y: auto;
          animation: mb-side-in .3s ease-out;
        }
        @keyframes mb-side-in {
          from { opacity: 0; transform: translateX(10px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .mb-side-body::-webkit-scrollbar { width: 4px; }
        .mb-side-body::-webkit-scrollbar-track { background: transparent; }
        .mb-side-body::-webkit-scrollbar-thumb { background: rgba(137,180,250,.3); border-radius: 2px; }

        .mb-side-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .mb-side-title { margin: 0; font-size: 16px; font-weight: 600; color: #cdd6f4; }

        .mb-side-clear {
          background: transparent;
          border: 1px solid rgba(137,180,250,.3);
          color: #89b4fa;
          font-size: 11px;
          padding: 4px 10px;
          border-radius: 4px;
          cursor: pointer;
          transition: all .15s ease-out;
        }
        .mb-side-clear:hover { background: rgba(137,180,250,.15); border-color: #89b4fa; }
        .mb-side-clear:active { transform: scale(.95); transition: transform .15s ease-out; }

        .mb-side-collapse {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          background: rgba(205,214,244,.05);
          border: 1px solid rgba(205,214,244,.1);
          border-radius: 6px;
          color: #cdd6f4;
          font-size: 13px;
          cursor: pointer;
          margin-bottom: 12px;
          transition: background .2s ease-out;
        }
        .mb-side-collapse:hover { background: rgba(205,214,244,.1); }
        .mb-side-collapse span:first-child { font-size: 10px; color: #89b4fa; }
        .mb-side-badge {
          margin-left: auto;
          background: rgba(137,180,250,.2);
          color: #89b4fa;
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 10px;
        }

        .mb-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 20px;
        }

        .mb-tag {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: rgba(205,214,244,.08);
          border: 1px solid rgba(205,214,244,.12);
          border-radius: 20px;
          cursor: pointer;
          transition: all .2s ease-out;
          overflow: hidden;
        }
        .mb-tag:hover { background: rgba(137,180,250,.15); border-color: rgba(137,180,250,.4); }
        .mb-tag-active {
          background: linear-gradient(135deg,rgba(137,180,250,.3),rgba(180,190,254,.3));
          border-color: #89b4fa;
        }
        .mb-tag-active .mb-tag-text { color: #89b4fa; font-weight: 500; }
        .mb-tag-text { color: rgba(205,214,244,.9); transition: color .2s ease-out; }
        .mb-tag-cnt {
          font-size: 10px;
          color: rgba(205,214,244,.5);
          background: rgba(205,214,244,.1);
          padding: 2px 6px;
          border-radius: 10px;
        }
        .mb-tag-active .mb-tag-cnt { background: rgba(137,180,250,.3); color: #89b4fa; }

        .mb-ripple {
          position: absolute;
          width: 0;
          height: 0;
          border-radius: 50%;
          background: rgba(137,180,250,.45);
          transform: translate(-50%,-50%);
          pointer-events: none;
          animation: mb-ripple-grow 400ms ease-out forwards;
        }
        @keyframes mb-ripple-grow {
          0%   { width: 0;    height: 0;    opacity: 1; }
          100% { width: 60px; height: 60px; opacity: 0; }
        }

        .mb-sel-section {
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid rgba(205,214,244,.1);
        }
        .mb-sel-title { font-size: 12px; color: rgba(205,214,244,.5); margin-bottom: 10px; }
        .mb-sel-list { display: flex; flex-wrap: wrap; gap: 8px; }
        .mb-sel-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          background: linear-gradient(135deg,rgba(137,180,250,.2),rgba(180,190,254,.2));
          border: 1px solid #89b4fa;
          border-radius: 16px;
          font-size: 12px;
          color: #89b4fa;
        }
        .mb-sel-rm {
          background: none;
          border: none;
          color: #89b4fa;
          font-size: 16px;
          cursor: pointer;
          padding: 0;
          line-height: 1;
          transition: transform .15s ease-out;
        }
        .mb-sel-rm:hover { transform: scale(1.2); }
      `}</style>
    </div>
  )
}
