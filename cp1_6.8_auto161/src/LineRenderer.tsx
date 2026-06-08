import { useEffect, useState, useRef } from 'react'
import type { ParsedLine } from './CoreEngine'
import { getEmotionLabel } from './CoreEngine'

interface LineRendererProps {
  line: ParsedLine
  animSpeed: number
}

export default function LineRenderer({ line, animSpeed }: LineRendererProps) {
  const [visible, setVisible] = useState(false)
  const [hovered, setHovered] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setVisible(true)
    }, line.layout.delay)
    return () => clearTimeout(timerRef.current)
  }, [line.layout.delay])

  const fadeDuration = 600 / animSpeed
  const floatDistance = 12

  return (
    <div
      style={{
        position: 'absolute',
        left: line.layout.x,
        top: line.layout.y,
        width: line.layout.width,
        height: line.layout.height,
        opacity: visible ? 1 : 0,
        transform: visible
          ? 'translateY(0px)'
          : `translateY(${floatDistance}px)`,
        transition: `opacity ${fadeDuration}ms cubic-bezier(0.25,0.46,0.45,0.94), transform ${fadeDuration}ms cubic-bezier(0.25,0.46,0.45,0.94)`,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          borderRadius: 16,
          background: hovered
            ? `${line.color.secondary}ee`
            : `${line.color.secondary}88`,
          backdropFilter: hovered ? 'blur(12px)' : 'blur(4px)',
          WebkitBackdropFilter: hovered ? 'blur(12px)' : 'blur(4px)',
          border: `1px solid ${line.color.primary}22`,
          boxShadow: hovered
            ? `0 4px 24px ${line.color.glow}, inset 0 0 0 1px ${line.color.primary}15`
            : `0 1px 4px ${line.color.glow}`,
          transition: 'all 0.35s cubic-bezier(0.25,0.46,0.45,0.94)',
          cursor: 'default',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: '15%',
            bottom: '15%',
            width: 3,
            borderRadius: 2,
            background: `linear-gradient(180deg, ${line.color.primary}cc, ${line.color.primary}44)`,
            transition: 'all 0.35s ease',
            boxShadow: hovered ? `0 0 8px ${line.color.glow}` : 'none',
          }}
        />

        <span
          style={{
            fontSize: 18,
            fontWeight: 400,
            letterSpacing: 1.5,
            lineHeight: 1.8,
            color: '#2c2c2c',
            paddingLeft: 12,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            transition: 'color 0.35s ease',
          }}
        >
          {line.text}
        </span>

        {hovered && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: '50%',
              transform: 'translateX(-50%)',
              minWidth: 220,
              padding: '14px 20px',
              borderRadius: 14,
              background: 'rgba(255,255,255,0.78)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: `1px solid ${line.color.primary}30`,
              boxShadow: `0 8px 32px ${line.color.glow}, 0 2px 8px rgba(0,0,0,0.04)`,
              zIndex: 100,
              animation: 'cardFadeIn 0.3s cubic-bezier(0.25,0.46,0.45,0.94) forwards',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: line.color.primary,
                  boxShadow: `0 0 6px ${line.color.glow}`,
                }}
              />
              <span style={{ fontSize: 13, fontWeight: 600, color: line.color.primary }}>
                {getEmotionLabel(line.emotion.emotion)}
              </span>
              <span style={{ fontSize: 11, color: '#999', marginLeft: 'auto' }}>
                浓度 {Math.round(line.emotion.intensity * 100)}%
              </span>
            </div>

            <div
              style={{
                height: 4,
                borderRadius: 2,
                background: '#eee',
                overflow: 'hidden',
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${line.emotion.intensity * 100}%`,
                  borderRadius: 2,
                  background: `linear-gradient(90deg, ${line.color.primary}, ${line.color.primary}88)`,
                  transition: 'width 0.6s cubic-bezier(0.25,0.46,0.45,0.94)',
                }}
              />
            </div>

            {line.emotion.keywords.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {line.emotion.keywords.map((kw) => (
                  <span
                    key={kw}
                    style={{
                      fontSize: 11,
                      padding: '2px 10px',
                      borderRadius: 10,
                      background: `${line.color.primary}15`,
                      color: line.color.primary,
                      border: `1px solid ${line.color.primary}25`,
                    }}
                  >
                    {kw}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
