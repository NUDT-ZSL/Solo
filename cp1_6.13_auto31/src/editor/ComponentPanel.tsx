import { type ElementType } from '@/types'
import { useLevelStore } from '@/store/useLevelStore'

interface ComponentItem {
  type: ElementType
  label: string
  icon: string
  color: string
}

const components: ComponentItem[] = [
  { type: 'ground', label: '地面块', icon: '▬', color: '#4ade80' },
  { type: 'movingPlatform', label: '移动平台', icon: '◄►', color: '#fb923c' },
  { type: 'spike', label: '尖刺', icon: '▲', color: '#dc2626' },
  { type: 'flag', label: '终点旗', icon: '⚑', color: '#fbbf24' },
  { type: 'slime', label: '史莱姆', icon: '●', color: '#4ade80' },
  { type: 'dragon', label: '飞龙', icon: '◆', color: '#f97316' },
]

export default function ComponentPanel() {
  const leftPanelCollapsed = useLevelStore(s => s.leftPanelCollapsed)
  const setLeftPanelCollapsed = useLevelStore(s => s.setLeftPanelCollapsed)

  const handleDragStart = (e: React.DragEvent, type: ElementType) => {
    e.dataTransfer.setData('element-type', type)
    e.dataTransfer.effectAllowed = 'copy'
  }

  if (leftPanelCollapsed) {
    return (
      <div style={{
        width: 48,
        background: 'rgba(27, 27, 33, 0.85)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderRadius: 8,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '12px 0',
        gap: 8,
      }}>
        <button
          onClick={() => setLeftPanelCollapsed(false)}
          style={{
            background: 'none',
            border: 'none',
            color: '#888',
            cursor: 'pointer',
            fontSize: 18,
            padding: 4,
          }}
          title="展开组件面板"
        >
          ▶
        </button>
        {components.map(comp => (
          <div
            key={comp.type}
            draggable
            onDragStart={e => handleDragStart(e, comp.type)}
            style={{
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: 6,
              cursor: 'grab',
              color: comp.color,
              fontSize: 14,
              transition: 'all 0.2s',
            }}
            title={comp.label}
          >
            {comp.icon}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div style={{
      width: 240,
      background: 'rgba(27, 27, 33, 0.85)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      borderRadius: 8,
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      transition: 'all 0.2s',
      overflowY: 'auto',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
      }}>
        <span style={{
          color: '#e0e0e0',
          fontSize: 14,
          fontWeight: 600,
          fontFamily: '"Noto Sans SC", "Source Han Sans", system-ui, sans-serif',
        }}>
          组件面板
        </span>
        <button
          onClick={() => setLeftPanelCollapsed(true)}
          style={{
            background: 'none',
            border: 'none',
            color: '#888',
            cursor: 'pointer',
            fontSize: 14,
            padding: 2,
          }}
          title="折叠面板"
        >
          ◀
        </button>
      </div>

      <div style={{
        fontSize: 11,
        color: '#666',
        marginBottom: 4,
        fontFamily: '"Noto Sans SC", "Source Han Sans", system-ui, sans-serif',
      }}>
        拖拽组件到画布
      </div>

      {components.map(comp => (
        <div
          key={comp.type}
          draggable
          onDragStart={e => handleDragStart(e, comp.type)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 12px',
            background: 'rgba(255,255,255,0.04)',
            borderRadius: 8,
            cursor: 'grab',
            border: '1px solid rgba(255,255,255,0.06)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget
            el.style.background = 'rgba(255,255,255,0.08)'
            el.style.borderColor = 'rgba(255,255,255,0.12)'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget
            el.style.background = 'rgba(255,255,255,0.04)'
            el.style.borderColor = 'rgba(255,255,255,0.06)'
          }}
        >
          <div style={{
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `${comp.color}15`,
            borderRadius: 6,
            color: comp.color,
            fontSize: 16,
            flexShrink: 0,
          }}>
            {comp.icon}
          </div>
          <span style={{
            color: '#ccc',
            fontSize: 13,
            fontFamily: '"Noto Sans SC", "Source Han Sans", system-ui, sans-serif',
          }}>
            {comp.label}
          </span>
        </div>
      ))}
    </div>
  )
}
