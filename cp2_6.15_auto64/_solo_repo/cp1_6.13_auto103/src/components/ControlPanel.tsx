import { useMemo } from 'react'
import type { SoundSource } from './Scene'

interface ControlPanelProps {
  sources: SoundSource[]
  deletingIds: string[]
  onDeleteSource: (id: string) => void
}

function MixIndicator({ sources }: { sources: SoundSource[] }) {
  const avgVolume = useMemo(() => {
    if (sources.length === 0) return 0
    const total = sources.reduce((sum, s) => {
      const dist = Math.sqrt(s.position.x ** 2 + s.position.y ** 2 + s.position.z ** 2)
      const attenuation = Math.max(0.1, 1 / (1 + dist * 0.1))
      return sum + s.volume * attenuation
    }, 0)
    return Math.min(total / sources.length, 1)
  }, [sources])

  const fillHeight = avgVolume * 100

  return (
    <div style={{
      width: 60,
      height: 200,
      background: '#334155',
      borderRadius: 8,
      position: 'relative',
      overflow: 'hidden',
      flexShrink: 0,
    }}>
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: `${fillHeight}%`,
        background: 'linear-gradient(to top, #22c55e, #fbbf24)',
        borderRadius: '0 0 8px 8px',
        transition: 'height 200ms ease-in-out',
      }} />
      <div style={{
        position: 'absolute',
        top: 8,
        left: 0,
        right: 0,
        textAlign: 'center',
        fontSize: 11,
        color: '#94a3b8',
        fontWeight: 600,
      }}>
        MIX
      </div>
      <div style={{
        position: 'absolute',
        bottom: 8,
        left: 0,
        right: 0,
        textAlign: 'center',
        fontSize: 10,
        color: '#e2e8f0',
        fontWeight: 500,
      }}>
        {Math.round(avgVolume * 100)}%
      </div>
    </div>
  )
}

function SourceItem({
  index,
  source,
  isDeleting,
  onDelete,
}: {
  index: number
  source: SoundSource
  isDeleting: boolean
  onDelete: (id: string) => void
}) {
  const distance = Math.sqrt(
    source.position.x ** 2 + source.position.y ** 2 + source.position.z ** 2
  )

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 12px',
      background: isDeleting ? '#1e1b2e' : '#0f172a',
      borderRadius: 8,
      transition: 'all 200ms ease-in-out',
      opacity: isDeleting ? 0.5 : 1,
      transform: isDeleting ? 'scale(0.95)' : 'scale(1)',
    }}>
      <span style={{
        fontSize: 12,
        color: '#64748b',
        width: 20,
        textAlign: 'center',
        fontWeight: 600,
      }}>
        {index + 1}
      </span>
      <div style={{
        width: 12,
        height: 12,
        borderRadius: 3,
        background: source.color,
        flexShrink: 0,
        boxShadow: `0 0 6px ${source.color}40`,
      }} />
      <span style={{
        flex: 1,
        fontSize: 12,
        color: '#cbd5e1',
      }}>
        {distance.toFixed(1)} units
      </span>
      <button
        onClick={() => onDelete(source.id)}
        style={{
          width: 24,
          height: 24,
          borderRadius: 6,
          background: '#ef4444',
          color: '#fff',
          fontSize: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          lineHeight: 1,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#dc2626'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#ef4444'
        }}
      >
        ✕
      </button>
    </div>
  )
}

export default function ControlPanel({ sources, deletingIds, onDeleteSource }: ControlPanelProps) {
  return (
    <>
      <div style={{
        position: 'fixed',
        left: 20,
        top: 80,
        width: 280,
        maxHeight: 'calc(100vh - 160px)',
        background: 'rgba(30, 41, 59, 0.9)',
        borderRadius: 12,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        zIndex: 10,
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <h2 style={{
            fontSize: 14,
            fontWeight: 600,
            color: '#e2e8f0',
            margin: 0,
          }}>
            Sound Sources
          </h2>
          <span style={{
            fontSize: 11,
            color: '#64748b',
            background: '#0f172a',
            padding: '2px 8px',
            borderRadius: 10,
          }}>
            {sources.length} / 50
          </span>
        </div>

        <div style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          maxHeight: 'calc(100vh - 340px)',
          minHeight: 60,
        }}>
          {sources.length === 0 && (
            <div style={{
              fontSize: 12,
              color: '#475569',
              textAlign: 'center',
              padding: '20px 0',
            }}>
              Click the 3D scene to add sources
            </div>
          )}
          {sources.map((source, i) => (
            <SourceItem
              key={source.id}
              index={i}
              source={source}
              isDeleting={deletingIds.includes(source.id)}
              onDelete={onDeleteSource}
            />
          ))}
        </div>

        <div style={{
          borderTop: '1px solid #334155',
          paddingTop: 12,
          display: 'flex',
          justifyContent: 'center',
        }}>
          <MixIndicator sources={sources} />
        </div>
      </div>
    </>
  )
}
