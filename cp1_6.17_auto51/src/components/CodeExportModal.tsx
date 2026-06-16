import { useState, useRef } from 'react'
import { useStore } from '../store'
import { generateFullCSS } from '../engine'

export function CodeExportModal() {
  const {
    layoutType,
    flexContainer,
    gridContainer,
    items,
    showCodeModal,
    setShowCodeModal
  } = useStore()

  const [copied, setCopied] = useState(false)
  const codeRef = useRef<HTMLElement>(null)

  if (!showCodeModal) return null

  const cssCode = generateFullCSS(layoutType, flexContainer, gridContainer, items)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(cssCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('复制失败:', err)
    }
  }

  const handleClose = () => {
    setShowCodeModal(false)
  }

  return (
    <div
      onClick={handleClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        animation: 'fadeIn 0.3s ease forwards'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#1E1E2E',
          borderRadius: '16px',
          padding: '24px',
          maxWidth: '700px',
          width: '90%',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          animation: 'fadeIn 0.3s ease forwards'
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}
        >
          <h2 style={{ color: '#fff', fontSize: '18px', fontWeight: 600 }}>
            CSS 代码导出
          </h2>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#888',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '4px 8px',
              lineHeight: 1
            }}
          >
            ×
          </button>
        </div>

        <pre
          ref={codeRef}
          style={{
            flex: 1,
            overflow: 'auto',
            backgroundColor: '#11111B',
            padding: '16px',
            borderRadius: '8px',
            color: '#e0e0e0',
            fontSize: '13px',
            lineHeight: 1.6,
            fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
            marginBottom: '16px',
            maxHeight: '400px'
          }}
        >
          <code>{cssCode}</code>
        </pre>

        <button
          onClick={handleCopy}
          className="ripple-btn"
          style={{
            padding: '12px 24px',
            backgroundColor: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {copied ? '✓ 已复制' : '一键复制代码'}
        </button>
      </div>

      {copied && (
        <div className="toast">
          代码已复制
        </div>
      )}
    </div>
  )
}
