import type { ComponentMeta, StyleConfig, ReactNode } from '@/types'
import React from 'react'

type RenderFn = (props: Record<string, unknown>, style: React.CSSProperties) => React.ReactElement

const componentRenderers: Record<string, RenderFn> = {
  'comp-button': (props, style) => (
    <button style={{ ...style, border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}>
      {String(props.label || 'Click Me')}
    </button>
  ),
  'comp-card': (props, style) => (
    <div style={{ ...style, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: style.color, fontFamily: 'DM Sans, sans-serif' }}>
        {String(props.title || 'Card Title')}
      </div>
      <div style={{ fontSize: 13, color: '#888', fontFamily: 'DM Sans, sans-serif' }}>
        {String(props.subtitle || 'Card description here')}
      </div>
      <div style={{ marginTop: 'auto', display: 'flex', gap: 8 }}>
        <span style={{ padding: '6px 16px', background: '#4A90D9', color: '#fff', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>Action</span>
        <span style={{ padding: '6px 16px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>Cancel</span>
      </div>
    </div>
  ),
  'comp-input': (props, style) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: '#555', fontFamily: 'DM Sans, sans-serif' }}>
        {String(props.type || 'Text')} Field
      </label>
      <input
        type={String(props.type || 'text')}
        placeholder={String(props.placeholder || 'Enter text...')}
        style={{ ...style, border: '1px solid #ddd', outline: 'none', fontFamily: 'DM Sans, sans-serif' }}
        readOnly
      />
    </div>
  ),
  'comp-grid': (props, style) => {
    const cols = Number(props.columns || 3)
    return (
      <div style={{ ...style, display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: props.gap || 12 }}>
        {Array.from({ length: cols * 2 }, (_, i) => (
          <div key={i} style={{ background: '#e8f0fe', borderRadius: 6, padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 40, fontSize: 12, color: '#4A90D9', fontFamily: 'DM Sans, sans-serif' }}>
            Item {i + 1}
          </div>
        ))}
      </div>
    )
  },
  'comp-flex': (props, style) => (
    <div style={{ ...style, display: 'flex', flexDirection: String(props.direction || 'row') as 'row' | 'column', alignItems: String(props.align || 'center') as 'center', justifyContent: String(props.justify || 'start') as 'flex-start', gap: 12 }}>
      <div style={{ width: 60, height: 60, background: '#4A90D9', borderRadius: 8, opacity: 0.8 }} />
      <div style={{ width: 60, height: 60, background: '#50C878', borderRadius: 8, opacity: 0.8 }} />
      <div style={{ width: 60, height: 60, background: '#F5A623', borderRadius: 8, opacity: 0.8 }} />
    </div>
  ),
  'comp-modal': (props, style) => (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.2)', borderRadius: 12 }} />
      <div style={{ ...style, position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: 16, fontFamily: 'DM Sans, sans-serif' }}>{String(props.title || 'Modal Title')}</span>
          <span style={{ cursor: 'pointer', fontSize: 18, color: '#999' }}>×</span>
        </div>
        <div style={{ color: '#666', fontSize: 13, fontFamily: 'DM Sans, sans-serif' }}>Modal body content goes here...</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
          <span style={{ padding: '6px 16px', background: '#4A90D9', color: '#fff', borderRadius: 6, fontSize: 13 }}>Confirm</span>
          <span style={{ padding: '6px 16px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }}>Cancel</span>
        </div>
      </div>
    </div>
  ),
  'comp-alert': (props, style) => (
    <div style={{ ...style, display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 18 }}>ℹ️</span>
      <span style={{ flex: 1, fontSize: 14, fontFamily: 'DM Sans, sans-serif' }}>{String(props.message || 'This is an alert message')}</span>
      {props.closable && <span style={{ cursor: 'pointer', color: '#999', fontSize: 16 }}>×</span>}
    </div>
  ),
  'comp-tab': (props) => {
    const tabs = (props.tabs || ['Tab 1', 'Tab 2', 'Tab 3']) as string[]
    const active = Number(props.activeTab || 0)
    return (
      <div style={{ display: 'flex', borderBottom: '2px solid #e8e8e8', gap: 0 }}>
        {tabs.map((tab, i) => (
          <div key={i} style={{
            padding: '8px 20px',
            fontSize: 14,
            cursor: 'pointer',
            fontFamily: 'DM Sans, sans-serif',
            borderBottom: i === active ? '2px solid #4A90D9' : '2px solid transparent',
            marginBottom: -2,
            color: i === active ? '#4A90D9' : '#666',
            fontWeight: i === active ? 600 : 400,
            transition: 'all 0.2s ease',
          }}>
            {tab}
          </div>
        ))}
      </div>
    )
  },
  'comp-breadcrumb': (props) => {
    const items = (props.items || ['Home', 'Products', 'Detail']) as string[]
    const sep = String(props.separator || '/')
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontFamily: 'DM Sans, sans-serif' }}>
        {items.map((item, i) => (
          <React.Fragment key={i}>
            <span style={{ color: i === items.length - 1 ? '#333' : '#4A90D9', cursor: i < items.length - 1 ? 'pointer' : 'default' }}>{item}</span>
            {i < items.length - 1 && <span style={{ color: '#999' }}>{sep}</span>}
          </React.Fragment>
        ))}
      </div>
    )
  },
  'comp-table': (props) => {
    const columns = (props.columns || ['Name', 'Age', 'Role']) as string[]
    const rows = (props.rows || [['Alice', '28', 'Dev'], ['Bob', '32', 'Lead']]) as string[][]
    return (
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: 'DM Sans, sans-serif' }}>
        <thead>
          <tr>
            {columns.map((col, i) => (
              <th key={i} style={{ padding: '8px 12px', textAlign: 'left', background: '#f5f7fa', color: '#555', fontWeight: 600, borderBottom: '2px solid #e8e8e8' }}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 1 && props.striped ? '#f9fafb' : 'transparent' }}>
              {row.map((cell, j) => (
                <td key={j} style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0', color: '#333' }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    )
  },
}

export function renderComponent(
  componentId: string,
  defaultProps: Record<string, unknown>,
  styleConfig: StyleConfig
): React.ReactElement | null {
  const renderer = componentRenderers[componentId]
  if (!renderer) return <div style={{ color: '#999', fontSize: 14 }}>Component not found</div>

  const style: React.CSSProperties = {
    color: styleConfig.color,
    backgroundColor: styleConfig.backgroundColor,
    fontSize: styleConfig.fontSize,
    borderRadius: styleConfig.borderRadius,
    padding: styleConfig.padding,
    boxShadow: styleConfig.boxShadow,
    width: styleConfig.width,
    height: styleConfig.height,
    transition: 'all 0.2s ease-in-out',
  }

  return renderer(defaultProps, style)
}
