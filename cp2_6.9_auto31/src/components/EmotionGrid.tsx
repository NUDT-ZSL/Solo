import { useState } from 'react'
import { EMOTIONS, getEmotionColor, getComplementaryColor } from '../utils/calendar'

interface EmotionGridProps {
  selectedIndex: number | null
  onSelect: (index: number) => void
}

export default function EmotionGrid({ selectedIndex, onSelect }: EmotionGridProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [animatingIndex, setAnimatingIndex] = useState<number | null>(null)

  const handleClick = (index: number) => {
    setAnimatingIndex(index)
    onSelect(index)
    setTimeout(() => setAnimatingIndex(null), 300)
  }

  return (
    <div className="emotion-grid-wrapper">
      <div className="emotion-grid">
        {EMOTIONS.map((emotion, index) => {
          const isSelected = selectedIndex === index
          const isHovered = hoveredIndex === index
          const isAnimating = animatingIndex === index
          const bgColor = getEmotionColor(emotion.hue, 55, isHovered ? 70 : 60)
          const borderColor = `hsl(${getComplementaryColor(emotion.hue)}, 70%, 45%)`

          return (
            <div
              key={index}
              className={`emotion-cell${isSelected ? ' selected' : ''}${isAnimating ? ' animating' : ''}`}
              style={{ backgroundColor: bgColor }}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={() => handleClick(index)}
            >
              <span className="emoji">{emotion.emoji}</span>
              {isHovered && (
                <div className="tooltip-bubble">{emotion.name}</div>
              )}
              {isSelected && (
                <div className="selected-border" style={{ borderColor }} />
              )}
            </div>
          )
        })}
      </div>
      <style>{`
        .emotion-grid-wrapper {
          display: flex;
          justify-content: center;
          padding: 20px;
        }
        .emotion-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 8px;
          max-width: 600px;
          width: 100%;
        }
        @media (max-width: 600px) {
          .emotion-grid {
            grid-template-columns: repeat(5, 1fr);
          }
        }
        .emotion-cell {
          position: relative;
          aspect-ratio: 1;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: filter 0.2s ease, transform 0.2s ease;
          overflow: visible;
        }
        .emotion-cell:hover {
          filter: brightness(1.1);
        }
        .emotion-cell:active {
          transform: translateY(1px);
          transition: transform 0.1s ease;
        }
        .emotion-cell.animating .emoji {
          animation: scalePulse 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes scalePulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.3); }
          100% { transform: scale(1); }
        }
        .emoji {
          font-size: 1.8rem;
          user-select: none;
          pointer-events: none;
        }
        @media (max-width: 600px) {
          .emoji {
            font-size: 1.4rem;
          }
        }
        .tooltip-bubble {
          position: absolute;
          bottom: calc(100% + 6px);
          left: 50%;
          transform: translateX(-50%);
          background: rgba(30, 30, 30, 0.9);
          color: white;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 0.75rem;
          white-space: nowrap;
          pointer-events: none;
          z-index: 10;
          transition: opacity 0.2s ease;
          animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(-50%) translateY(4px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        .selected-border {
          position: absolute;
          inset: 0;
          border-radius: 8px;
          border: 2px solid;
          pointer-events: none;
        }
      `}</style>
    </div>
  )
}
