import { useState, useCallback, useEffect } from 'react'
import CaptureOverlay from './components/CaptureOverlay'
import EditorPanel from './components/EditorPanel'

export interface SelectionRect {
  x: number
  y: number
  width: number
  height: number
}

function App() {
  const [isCaptureMode, setIsCaptureMode] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [selection, setSelection] = useState<SelectionRect | null>(null)
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | null>(null)
  const [selectionHistory, setSelectionHistory] = useState<SelectionRect[]>([])

  const startCapture = useCallback(() => {
    setIsCaptureMode(true)
    setSelection(null)
    setSelectionHistory([])
  }, [])

  const exitCapture = useCallback(() => {
    setIsCaptureMode(false)
    setSelection(null)
    setSelectionHistory([])
  }, [])

  const handleSelectionChange = useCallback((rect: SelectionRect) => {
    setSelection(rect)
  }, [])

  const handleSelectionCommit = useCallback((rect: SelectionRect) => {
    setSelection(rect)
    setSelectionHistory(prev => [...prev, rect])
  }, [])

  const handleCaptureComplete = useCallback((dataUrl: string) => {
    setScreenshotDataUrl(dataUrl)
    setIsEditing(true)
    setIsCaptureMode(false)
  }, [])

  const closeEditor = useCallback(() => {
    setIsEditing(false)
    setScreenshotDataUrl(null)
  }, [])

  const undoSelection = useCallback(() => {
    if (selectionHistory.length > 1) {
      const newHistory = [...selectionHistory]
      newHistory.pop()
      setSelectionHistory(newHistory)
      setSelection(newHistory[newHistory.length - 1])
    } else if (selectionHistory.length === 1) {
      setSelectionHistory([])
      setSelection(null)
    }
  }, [selectionHistory])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isEditing) {
          closeEditor()
        } else if (isCaptureMode) {
          exitCapture()
        }
      }
      if (e.ctrlKey && e.key === 'z' && isCaptureMode && selection) {
        e.preventDefault()
        undoSelection()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isEditing, isCaptureMode, selection, closeEditor, exitCapture, undoSelection])

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      {/* 演示页面内容 */}
      <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ 
            fontSize: '32px', 
            color: '#2196f3', 
            marginBottom: '12px',
            fontWeight: 600
          }}>
            网页截图增强工具
          </h1>
          <p style={{ color: '#666', fontSize: '16px', marginBottom: '24px' }}>
            框选网页区域，添加个性化水印和边框，一键导出高清截图
          </p>
          <button
            onClick={startCapture}
            style={{
              padding: '12px 32px',
              fontSize: '16px',
              fontWeight: 500,
              color: '#ffffff',
              background: 'linear-gradient(135deg, #2196f3, #4caf50)',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 12px rgba(33, 150, 243, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)'
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(33, 150, 243, 0.4)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(33, 150, 243, 0.3)'
            }}
          >
            开始截图
          </button>
        </div>

        {/* 演示内容区域 */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '32px',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
          marginBottom: '24px'
        }}>
          <h2 style={{ fontSize: '20px', color: '#333', marginBottom: '16px' }}>
            使用说明
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
            <div style={{
              padding: '20px',
              background: '#f8f9fa',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>📐</div>
              <h3 style={{ fontSize: '16px', color: '#333', marginBottom: '8px' }}>框选区域</h3>
              <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.5 }}>
                点击开始截图，拖拽鼠标选择网页区域，四角手柄可微调
              </p>
            </div>
            <div style={{
              padding: '20px',
              background: '#f8f9fa',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>🎨</div>
              <h3 style={{ fontSize: '16px', color: '#333', marginBottom: '8px' }}>个性编辑</h3>
              <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.5 }}>
                添加自定义水印文字，调整边框样式和颜色
              </p>
            </div>
            <div style={{
              padding: '20px',
              background: '#f8f9fa',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>💾</div>
              <h3 style={{ fontSize: '16px', color: '#333', marginBottom: '8px' }}>导出下载</h3>
              <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.5 }}>
                支持 PNG、JPG、WebP 多种格式高清导出
              </p>
            </div>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: '24px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)'
          }}>
            <h2 style={{ fontSize: '18px', color: '#333', marginBottom: '16px' }}>
              功能特性
            </h2>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {[
                '精准选区，四角手柄支持二次微调',
                '自定义水印文字、位置和透明度',
                '16种预设边框颜色 + 自定义拾色器',
                '支持 PNG / JPG / WebP 多格式导出',
                '快捷键支持：Esc 退出，Ctrl+Z 撤销'
              ].map((item, index) => (
                <li key={index} style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '10px 0',
                  borderBottom: index < 4 ? '1px solid #f0f0f0' : 'none'
                }}>
                  <span style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: '#e8f5e9',
                    color: '#4caf50',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    marginRight: '12px'
                  }}>✓</span>
                  <span style={{ color: '#444', fontSize: '14px' }}>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)'
          }}>
            <h2 style={{ fontSize: '18px', color: '#333', marginBottom: '16px' }}>
              快捷键
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { key: 'Esc', desc: '退出截图 / 关闭编辑器' },
                { key: 'Enter', desc: '快速下载截图' },
                { key: 'Ctrl+Z', desc: '撤销选框调整' }
              ].map((item, index) => (
                <div key={index} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  background: '#f8f9fa',
                  borderRadius: '6px'
                }}>
                  <kbd style={{
                    padding: '4px 10px',
                    background: '#ffffff',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                  }}>{item.key}</kbd>
                  <span style={{ fontSize: '13px', color: '#666' }}>{item.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 截图覆盖层 */}
      {isCaptureMode && (
        <CaptureOverlay
          onCaptureComplete={handleCaptureComplete}
          onExit={exitCapture}
          onSelectionChange={handleSelectionChange}
          onSelectionCommit={handleSelectionCommit}
          selection={selection}
        />
      )}

      {/* 编辑器面板 */}
      {isEditing && screenshotDataUrl && (
        <EditorPanel
          imageDataUrl={screenshotDataUrl}
          onClose={closeEditor}
        />
      )}
    </div>
  )
}

export default App
