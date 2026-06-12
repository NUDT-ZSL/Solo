import { useState } from 'react'
import { type ElementType, ELEMENT_DEFAULTS } from '@/types'
import { useLevelStore } from '@/store/useLevelStore'

interface ComponentItem {
  type: ElementType
  label: string
  color: string
  description: string
}

const components: ComponentItem[] = [
  { type: 'ground', label: '地面块', color: '#4ade80', description: '绿色固定平台' },
  { type: 'movingPlatform', label: '移动平台', color: '#fb923c', description: '橙色水平/垂直移动' },
  { type: 'spike', label: '尖刺', color: '#dc2626', description: '触碰即死亡' },
  { type: 'flag', label: '终点旗', color: '#fbbf24', description: '关卡目标点' },
  { type: 'slime', label: '史莱姆', color: '#4ade80', description: '绿色巡逻敌人' },
  { type: 'dragon', label: '飞龙', color: '#f97316', description: '红色飞行敌人' },
]

function renderPreviewIcon(type: ElementType, color: string, size: number = 24) {
  const s = size
  switch (type) {
    case 'ground':
      return (
        <svg width={s} height={s} viewBox="0 0 40 12">
          <defs>
            <linearGradient id={`gg-${type}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4ade80" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="40" height="12" rx="2" fill={`url(#gg-${type})`} stroke="#16a34a" strokeWidth="1" />
        </svg>
      )
    case 'movingPlatform':
      return (
        <svg width={s} height={s} viewBox="0 0 40 8">
          <defs>
            <linearGradient id={`gg-${type}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fb923c" />
              <stop offset="100%" stopColor="#f97316" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="40" height="8" rx="2" fill={`url(#gg-${type})`} stroke="#ea580c" strokeWidth="1" />
        </svg>
      )
    case 'spike':
      return (
        <svg width={s} height={s} viewBox="0 0 20 16">
          <polygon points="0,16 10,0 20,16" fill="#dc2626" stroke="#991b1b" strokeWidth="1" />
        </svg>
      )
    case 'flag':
      return (
        <svg width={s} height={s} viewBox="0 0 16 28">
          <rect x="2" y="0" width="2" height="28" fill="#92400e" />
          <polygon points="4,0 16,6 4,12" fill="#fbbf24" stroke="#d97706" strokeWidth="1" />
        </svg>
      )
    case 'slime':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24">
          <circle cx="12" cy="14" r="10" fill="#4ade80" stroke="#16a34a" strokeWidth="1.5" />
          <circle cx="9" cy="12" r="2.5" fill="#fff" />
          <circle cx="15" cy="12" r="2.5" fill="#fff" />
          <circle cx="9.5" cy="12" r="1.2" fill="#1a1a2e" />
          <circle cx="15.5" cy="12" r="1.2" fill="#1a1a2e" />
        </svg>
      )
    case 'dragon':
      return (
        <svg width={s} height={s} viewBox="0 0 32 20">
          <ellipse cx="16" cy="12" rx="10" ry="6" fill="#ef4444" stroke="#b91c1c" strokeWidth="1.5" />
          <polygon points="6,10 0,4 8,8" fill="#f97316" />
          <polygon points="26,10 32,4 24,8" fill="#f97316" />
          <circle cx="13" cy="11" r="1.5" fill="#fef08a" />
          <circle cx="19" cy="11" r="1.5" fill="#fef08a" />
        </svg>
      )
    default:
      return <span style={{ color }}>■</span>
  }
}

export default function ComponentPanel() {
  const leftPanelCollapsed = useLevelStore(s => s.leftPanelCollapsed)
  const setLeftPanelCollapsed = useLevelStore(s => s.setLeftPanelCollapsed)
  const [draggingType, setDraggingType] = useState<ElementType | null>(null)

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, type: ElementType) => {
    e.dataTransfer.setData('text/plain', type)
    e.dataTransfer.setData('application/x-levelforge-type', type)
    e.dataTransfer.effectAllowed = 'copy'
    e.dataTransfer.dropEffect = 'copy'

    try {
      const preview = document.createElement('canvas')
      const defaults = ELEMENT_DEFAULTS[type]
      preview.width = Math.max(defaults.width, 60)
      preview.height = Math.max(defaults.height, 40)
      const pctx = preview.getContext('2d')
      if (pctx) {
        pctx.fillStyle = 'rgba(255,255,255,0.1)'
        pctx.fillRect(0, 0, preview.width, preview.height)
      }
      e.dataTransfer.setDragImage(preview, preview.width / 2, preview.height / 2)
    } catch (_err) {
      /* ignore */
    }

    setDraggingType(type)
  }

  const handleDragEnd = () => {
    setDraggingType(null)
  }

  const componentElements = components.map(comp => (
    <div
      key={comp.type}
      draggable
      onDragStart={e => handleDragStart(e, comp.type)}
      onDragEnd={handleDragEnd}
      data-element-type={comp.type}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 12px',
        background: draggingType === comp.type ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.04)',
        borderRadius: 8,
        cursor: 'grab',
        border: `1px solid ${draggingType === comp.type ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.06)'}`,
        transition: 'all 0.2s',
        userSelect: 'none',
        opacity: draggingType === comp.type ? 0.7 : 1,
      }}
      onMouseEnter={e => {
        const el = e.currentTarget
        if (draggingType !== comp.type) {
          el.style.background = 'rgba(255,255,255,0.08)'
          el.style.borderColor = 'rgba(255,255,255,0.12)'
        }
      }}
      onMouseLeave={e => {
        const el = e.currentTarget
        if (draggingType !== comp.type) {
          el.style.background = 'rgba(255,255,255,0.04)'
          el.style.borderColor = 'rgba(255,255,255,0.06)'
        }
      }}
      onDragOver={e => e.preventDefault()}
    >
      <div style={{
        width: 36,
        height: 36,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `${comp.color}18`,
        borderRadius: 6,
        flexShrink: 0,
      }}>
        {renderPreviewIcon(comp.type, comp.color, 24)}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <span style={{
          color: '#e0e0e0',
          fontSize: 13,
          fontWeight: 500,
          fontFamily: '"Noto Sans SC", "Source Han Sans", system-ui, sans-serif',
        }}>
          {comp.label}
        </span>
        <span style={{
          color: '#666',
          fontSize: 11,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {comp.description}
        </span>
      </div>
    </div>
  ))

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
        transition: 'all 0.2s',
      }}>
        <button
          onClick={() => setLeftPanelCollapsed(false)}
          style={{
            background: 'none',
            border: 'none',
            color: '#888',
            cursor: 'pointer',
            fontSize: 16,
            padding: 4,
            width: 32,
            height: 32,
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
          }}
          title="展开组件面板"
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'none'
          }}
        >
          ▶
        </button>
        <div style={{ height: 1, width: 32, background: 'rgba(255,255,255,0.08)' }} />
        {components.map(comp => (
          <div
            key={comp.type}
            draggable
            onDragStart={e => handleDragStart(e, comp.type)}
            onDragEnd={handleDragEnd}
            title={comp.label}
            style={{
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `${comp.color}15`,
              borderRadius: 6,
              cursor: 'grab',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = `${comp.color}30`
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = `${comp.color}15`
            }}
          >
            {renderPreviewIcon(comp.type, comp.color, 22)}
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
      maxHeight: 'calc(100vh - 80px)',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{
            color: '#e0e0e0',
            fontSize: 14,
            fontWeight: 600,
            fontFamily: '"Noto Sans SC", "Source Han Sans", system-ui, sans-serif',
          }}>
            组件面板
          </span>
          <span style={{
            fontSize: 11,
            color: '#666',
          }}>
            拖拽组件到画布放置
          </span>
        </div>
        <button
          onClick={() => setLeftPanelCollapsed(true)}
          style={{
            background: 'none',
            border: 'none',
            color: '#888',
            cursor: 'pointer',
            fontSize: 14,
            padding: 4,
            width: 28,
            height: 28,
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
          }}
          title="折叠面板"
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'none'
          }}
        >
          ◀
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{
          fontSize: 11,
          color: '#555',
          textTransform: 'uppercase',
          letterSpacing: 1,
          fontWeight: 500,
          marginTop: 4,
          fontFamily: '"Noto Sans SC", "Source Han Sans", system-ui, sans-serif',
        }}>
          平台元素
        </div>
        {componentElements.slice(0, 4)}
      </div>

      <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{
          fontSize: 11,
          color: '#555',
          textTransform: 'uppercase',
          letterSpacing: 1,
          fontWeight: 500,
          fontFamily: '"Noto Sans SC", "Source Han Sans", system-ui, sans-serif',
        }}>
          敌人实体
        </div>
        {componentElements.slice(4)}
      </div>
    </div>
  )
}
