import { useState, useCallback, useRef, useEffect } from 'react'
import { analyzePoem, type ParsedLine } from './CoreEngine'
import ParticleBackground from './ParticleBackground'
import LineRenderer from './LineRenderer'
import ControlPanel from './ControlPanel'

const SAMPLE_POEM = `春眠不觉晓
处处闻啼鸟
夜来风雨声
花落知多少`

export default function App() {
  const [lines, setLines] = useState<ParsedLine[]>([])
  const [animSpeed, setAnimSpeed] = useState(1)
  const [fadeIn, setFadeIn] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(window.innerWidth)

  useEffect(() => {
    setFadeIn(true)
    const handleResize = () => setContainerWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleSubmit = useCallback(
    (text: string, palette: string, speed: number) => {
      setAnimSpeed(speed)
      const result = analyzePoem(text, palette, containerWidth, speed)
      setLines([])
      requestAnimationFrame(() => {
        setLines(result)
      })
    },
    [containerWidth],
  )

  const totalHeight = lines.length > 0
    ? Math.max(...lines.map((l) => l.layout.y + l.layout.height)) + 40
    : 0

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        opacity: fadeIn ? 1 : 0,
        transition: 'opacity 0.8s cubic-bezier(0.25,0.46,0.45,0.94)',
      }}
    >
      <ParticleBackground speed={animSpeed} />

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          height: '100%',
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingBottom: 140,
        }}
      >
        <div
          style={{
            maxWidth: 960,
            margin: '0 auto',
            padding: '60px 24px 24px',
          }}
        >
          {lines.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                paddingTop: '18vh',
                userSelect: 'none',
              }}
            >
              <h1
                style={{
                  fontSize: 32,
                  fontWeight: 300,
                  letterSpacing: 6,
                  color: '#555',
                  marginBottom: 12,
                }}
              >
                光影诗谱
              </h1>
              <p
                style={{
                  fontSize: 14,
                  color: '#aaa',
                  letterSpacing: 2,
                  lineHeight: 2,
                }}
              >
                输入一首短诗，让文字与光影共舞
              </p>
              <p
                style={{
                  fontSize: 12,
                  color: '#ccc',
                  marginTop: 24,
                  cursor: 'pointer',
                  transition: 'color 0.2s ease',
                }}
                onClick={() =>
                  handleSubmit(SAMPLE_POEM, 'default', 1)
                }
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#999'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#ccc'
                }}
              >
                ▸ 试试示例
              </p>
            </div>
          )}

          {lines.length > 0 && (
            <div
              ref={containerRef}
              style={{
                position: 'relative',
                width: '100%',
                height: totalHeight,
                transition: 'height 0.5s cubic-bezier(0.25,0.46,0.45,0.94)',
              }}
            >
              {lines.map((line) => (
                <LineRenderer
                  key={`${line.index}-${line.text}`}
                  line={line}
                  animSpeed={animSpeed}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <ControlPanel onSubmit={handleSubmit} />

      <style>{`
        @keyframes cardFadeIn {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }

        ::-webkit-scrollbar {
          width: 4px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(0,0,0,0.1);
          border-radius: 2px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(0,0,0,0.18);
        }

        textarea:focus {
          border-color: rgba(0,0,0,0.18) !important;
        }

        input[type="range"] {
          -webkit-appearance: none;
          height: 3px;
          background: rgba(0,0,0,0.1);
          border-radius: 2px;
          outline: none;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #888;
          cursor: pointer;
          transition: transform 0.15s ease;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }
      `}</style>
    </div>
  )
}
