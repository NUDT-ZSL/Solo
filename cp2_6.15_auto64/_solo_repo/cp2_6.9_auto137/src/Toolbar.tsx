import { useState, useRef, useEffect, CSSProperties } from 'react'
import type { Tag } from './types'
import { MAX_TEXT_LENGTH, MAX_VOTES } from './constants'
import { getTagColor } from './utils'

interface ToolbarProps {
  onAddTag: (text: string) => void
  onClearAll: () => void
  showVotes: boolean
  onToggleVotes: () => void
  votingTag: Tag | null
  onVote: (id: string) => void
  onCloseVotePanel: () => void
}

const toolbarStyle: CSSProperties = {
  position: 'absolute',
  left: '20px',
  top: '50%',
  transform: 'translateY(-50%)',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  padding: '16px',
  background: 'rgba(0, 0, 0, 0.55)',
  borderRadius: '10px',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
  zIndex: 10,
  minWidth: '200px',
  backdropFilter: 'blur(8px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
}

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  background: 'rgba(255, 255, 255, 0.1)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '14px',
  outline: 'none',
  transition: 'all 0.3s ease-in-out',
  boxSizing: 'border-box',
}

const buttonBaseStyle: CSSProperties = {
  padding: '10px 16px',
  border: 'none',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.3s ease-in-out',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  width: '100%',
}

const primaryBtnStyle: CSSProperties = {
  ...buttonBaseStyle,
  background: '#3498DB',
}

const dangerBtnStyle: CSSProperties = {
  ...buttonBaseStyle,
  background: '#E74C3C',
}

const secondaryBtnStyle: CSSProperties = {
  ...buttonBaseStyle,
  background: 'rgba(255, 255, 255, 0.15)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
}

const votePanelStyle: CSSProperties = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  background: 'rgba(255, 255, 255, 0.15)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.4)',
  borderRadius: '12px',
  padding: '20px 24px',
  zIndex: 20,
  minWidth: '240px',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
  color: '#ffffff',
}

const confirmDialogStyle: CSSProperties = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  background: 'rgba(44, 62, 80, 0.95)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  borderRadius: '12px',
  padding: '24px',
  zIndex: 30,
  minWidth: '280px',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
  color: '#ffffff',
}

const mobileToolbarStyle: CSSProperties = {
  ...toolbarStyle,
  left: '50%',
  top: 'auto',
  bottom: '16px',
  transform: 'translateX(-50%)',
  flexDirection: 'row',
  minWidth: 'auto',
  padding: '10px 12px',
  gap: '8px',
  width: 'calc(100% - 32px)',
  maxWidth: '500px',
  overflowX: 'auto',
}

function Toolbar({
  onAddTag,
  onClearAll,
  showVotes,
  onToggleVotes,
  votingTag,
  onVote,
  onCloseVotePanel,
}: ToolbarProps) {
  const [inputValue, setInputValue] = useState('')
  const [isMobile, setIsMobile] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null)
  const [pressedBtn, setPressedBtn] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showConfirmDialog || votingTag) return
      if (document.activeElement === inputRef.current) return
      if (e.key === 'Enter' || e.key === ' ') return
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showConfirmDialog, votingTag])

  const handleSubmit = () => {
    const text = inputValue.trim()
    if (text && text.length <= MAX_TEXT_LENGTH) {
      onAddTag(text)
      setInputValue('')
    }
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit()
    }
  }

  const handleExportPNG = () => {
    const canvas = document.querySelector('canvas')
    if (!canvas) return
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = 1920
    tempCanvas.height = 1080
    const ctx = tempCanvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#2C3E50'
    ctx.fillRect(0, 0, 1920, 1080)
    ctx.drawImage(canvas, 0, 0, 1920, 1080)
    const link = document.createElement('a')
    link.download = `word-cloud-${Date.now()}.png`
    link.href = tempCanvas.toDataURL('image/png')
    link.click()
  }

  const getButtonStyle = (id: string, base: CSSProperties): CSSProperties => {
    const isHovered = hoveredBtn === id
    const isPressed = pressedBtn === id
    let bgColor = base.background as string
    if (isHovered) {
      if (id.startsWith('btn-primary')) bgColor = '#5DADE2'
      else if (id.startsWith('btn-danger')) bgColor = '#EC7063'
      else if (id.startsWith('btn-secondary')) bgColor = 'rgba(255, 255, 255, 0.25)'
      else if (id.startsWith('btn-export')) bgColor = '#48C9B0'
    }
    return {
      ...base,
      background: bgColor,
      transform: isPressed ? 'scale(0.95)' : isHovered ? 'translateY(-2px)' : 'none',
    }
  }

  const toolbarFinalStyle = isMobile ? mobileToolbarStyle : toolbarStyle

  return (
    <>
      <div style={toolbarFinalStyle}>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value.slice(0, MAX_TEXT_LENGTH))}
          onKeyDown={handleInputKeyDown}
          placeholder={isMobile ? '添加文字...' : '输入文字（最多10字）'}
          style={inputStyle}
          maxLength={MAX_TEXT_LENGTH}
        />

        <button
          style={getButtonStyle('btn-primary-add', primaryBtnStyle)}
          onMouseEnter={() => setHoveredBtn('btn-primary-add')}
          onMouseLeave={() => setHoveredBtn(null)}
          onMouseDown={() => setPressedBtn('btn-primary-add')}
          onMouseUp={() => setPressedBtn(null)}
          onClick={handleSubmit}
        >
          {isMobile ? '➕' : '➕ 添加'}
        </button>

        <button
          style={getButtonStyle('btn-secondary-votes', secondaryBtnStyle)}
          onMouseEnter={() => setHoveredBtn('btn-secondary-votes')}
          onMouseLeave={() => setHoveredBtn(null)}
          onMouseDown={() => setPressedBtn('btn-secondary-votes')}
          onMouseUp={() => setPressedBtn(null)}
          onClick={onToggleVotes}
        >
          {showVotes
            ? (isMobile ? '👁️' : '👁️ 隐藏票数')
            : (isMobile ? '👁️‍🗨️' : '👁️‍🗨️ 显示票数')}
        </button>

        <button
          style={getButtonStyle('btn-export', { ...secondaryBtnStyle, background: '#1ABC9C' })}
          onMouseEnter={() => setHoveredBtn('btn-export')}
          onMouseLeave={() => setHoveredBtn(null)}
          onMouseDown={() => setPressedBtn('btn-export')}
          onMouseUp={() => setPressedBtn(null)}
          onClick={handleExportPNG}
        >
          {isMobile ? '📷' : '📷 导出PNG'}
        </button>

        <button
          style={getButtonStyle('btn-danger-clear', dangerBtnStyle)}
          onMouseEnter={() => setHoveredBtn('btn-danger-clear')}
          onMouseLeave={() => setHoveredBtn(null)}
          onMouseDown={() => setPressedBtn('btn-danger-clear')}
          onMouseUp={() => setPressedBtn(null)}
          onClick={() => setShowConfirmDialog(true)}
        >
          {isMobile ? '🗑️' : '🗑️ 清空所有'}
        </button>
      </div>

      {votingTag && (
        <div style={votePanelStyle}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}>
            <h3 style={{
              margin: 0,
              fontSize: '18px',
              color: getTagColor(votingTag.color, votingTag.votes),
              fontWeight: 700,
            }}>
              {votingTag.text}
            </h3>
            <button
              onClick={onCloseVotePanel}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                fontSize: '20px',
                cursor: 'pointer',
                padding: '0 4px',
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
          <div style={{
            fontSize: '32px',
            fontWeight: 800,
            textAlign: 'center',
            marginBottom: '16px',
            color: votingTag.votes >= 21 ? '#FFD700' : '#ffffff',
          }}>
            {votingTag.votes} / {MAX_VOTES}
          </div>
          <div style={{
            width: '100%',
            height: '8px',
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '4px',
            overflow: 'hidden',
            marginBottom: '16px',
          }}>
            <div style={{
              width: `${(votingTag.votes / MAX_VOTES) * 100}%`,
              height: '100%',
              background: votingTag.votes >= 21
                ? 'linear-gradient(90deg, #FFD700, #FFA500)'
                : votingTag.votes >= 11
                ? 'linear-gradient(90deg, #3498DB, #2ECC71)'
                : '#3498DB',
              transition: 'width 0.3s ease-in-out',
            }} />
          </div>
          <button
            style={{
              ...primaryBtnStyle,
              background: votingTag.votes >= MAX_VOTES ? '#95A5A6' : '#2ECC71',
              cursor: votingTag.votes >= MAX_VOTES ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              padding: '12px',
            }}
            onClick={() => onVote(votingTag.id)}
            disabled={votingTag.votes >= MAX_VOTES}
          >
            {votingTag.votes >= MAX_VOTES ? '已达上限' : '👍 +1 投票'}
          </button>
        </div>
      )}

      {showConfirmDialog && (
        <div style={confirmDialogStyle}>
          <h3 style={{ margin: 0, marginBottom: '12px', fontSize: '18px' }}>
            ⚠️ 确认清空
          </h3>
          <p style={{ margin: 0, marginBottom: '20px', fontSize: '14px', color: '#BDC3C7', lineHeight: 1.5 }}>
            此操作将删除所有标签，且无法恢复。确定继续吗？
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              style={getButtonStyle('btn-dialog-cancel', { ...secondaryBtnStyle, flex: 1 })}
              onMouseEnter={() => setHoveredBtn('btn-dialog-cancel')}
              onMouseLeave={() => setHoveredBtn(null)}
              onMouseDown={() => setPressedBtn('btn-dialog-cancel')}
              onMouseUp={() => setPressedBtn(null)}
              onClick={() => setShowConfirmDialog(false)}
            >
              取消
            </button>
            <button
              style={getButtonStyle('btn-dialog-confirm', { ...dangerBtnStyle, flex: 1 })}
              onMouseEnter={() => setHoveredBtn('btn-dialog-confirm')}
              onMouseLeave={() => setHoveredBtn(null)}
              onMouseDown={() => setPressedBtn('btn-dialog-confirm')}
              onMouseUp={() => setPressedBtn(null)}
              onClick={() => {
                onClearAll()
                setShowConfirmDialog(false)
              }}
            >
              确认
            </button>
          </div>
        </div>
      )}

      {(votingTag || showConfirmDialog) && (
        <div
          onClick={() => {
            onCloseVotePanel()
            setShowConfirmDialog(false)
          }}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.4)',
            zIndex: 15,
          }}
        />
      )}
    </>
  )
}

export default Toolbar
