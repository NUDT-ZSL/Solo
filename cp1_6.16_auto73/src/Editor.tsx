import { useState, useRef, useEffect } from 'react'
import type { EmojiItem, JournalEntry } from './App'

interface EditorProps {
  date: string
  entry?: JournalEntry
  onSave: (entry: JournalEntry) => void
}

interface EmojiCategory {
  name: string
  emojis: string[]
}

interface ContextMenu {
  emojiId: string
  x: number
  y: number
}

const emojiCategories: EmojiCategory[] = [
  {
    name: '表情',
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐', '😕', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖']
  },
  {
    name: '动物',
    emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐻‍❄️', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🐺', '🦄', '🦝', '🦙', '🦒', '🦘', '🐃', '🐂', '🐄', '🐪', '🐫', '🦌', '🐏', '🐑', '🐐', '🐕', '🐩', '🦮', '🐕‍🦺', '🐈', '🐈‍⬛', '🐓', '🦃', '🦅', '🦆', '🦢', '🦉', '🦤', '🪶', '🦩', '🦚', '🦜', '🐊', '🐢', '🦎', '🦖', '🦕', '🐍', '🐲', '🌵', '🎄', '🌲', '🌳', '🌴', '🌱', '🌿', '☘️', '🍀', '🐘', '🦏', '🦛', '🐪', '🐫', '🦒', '🦘', '🐿️', '🦫', '🦨', '🦡', '🐾']
  },
  {
    name: '自然',
    emojis: ['🌵', '🎄', '🌲', '🌳', '🌴', '🌱', '🌿', '☘️', '🍀', '🍁', '🍂', '🍃', '🌾', '🌷', '🌹', '🥀', '🌺', '🌻', '🌼', '🌸', '💐', '🌞', '🌝', '🌚', '🌕', '🌖', '🌗', '🌘', '🌑', '🌒', '🌓', '🌔', '🌙', '🌛', '🌜', '☀️', '🌤️', '⛅', '🌥️', '☁️', '🌦️', '🌧️', '⛈️', '🌩️', '🌨️', '❄️', '☃️', '⛄', '🌬️', '💨', '🌪️', '🌫️', '🌊', '💧', '💦', '☔', '🌈', '⭐', '🌟', '✨', '💫', '🌠', '🌌', '🔥', '💥', '☄️', '🌍', '🌎', '🌏', '🪐', '🌙', '☀️', '⛅', '☁️', '⚡', '❄️', '☃️', '🌈', '💧', '🌊']
  },
  {
    name: '食物',
    emojis: ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🌽', '🥕', '🫑', '🌶️', '🥒', '🥬', '🥐', '🥯', '🍞', '🌭', '🍔', '🍟', '🍕', '🫓', '🥪', '🥙', '🧆', '🌮', '🌯', '🫔', '🥗', '🥘', '🫕', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🦪', '🍤', '🍙', '🍚', '🍘', '🥠', '🥮', '🍢', '🍡', '🍧', '🍨', '🍦', '🥧', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '🌰', '🥜', '🫘', '🍯', '🍳', '🥚', '🧈', '🧂', '☕', '🍵', '🧃', '🥤', '🧋', '🍶', '🍾', '🍷', '🍸', '🍹', '🍺', '🍻', '🥂', '🫗']
  },
  {
    name: '活动',
    emojis: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛼', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🪂', '🏋️', '🏋️‍♀️', '🤼', '🤸', '🤸‍♀️', '⛹️', '⛹️‍♀️', '🏌️', '🏌️‍♀️', '🏄', '🏄‍♀️', '🚣', '🚣‍♀️', '🏊', '🏊‍♀️', '🤽', '🤽‍♀️', '🚴', '🚴‍♀️', '🚵', '🚵‍♀️', '🎯', '🎪', '🎭', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🎷', '🎺', '🎸', '🪕', '🎻', '🎲', '🧩', '🎮', '🕹️', '🎰', '🎳', '🎯', '🎪', '🎭', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🎷', '🎺', '🎸', '🪕', '🎻', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟']
  }
]

function Editor({ date, entry, onSave }: EditorProps) {
  const [activeCategory, setActiveCategory] = useState(0)
  const [prevCategory, setPrevCategory] = useState(0)
  const [emojis, setEmojis] = useState<EmojiItem[]>(entry?.emojis || [])
  const [note, setNote] = useState(entry?.note || '')
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null)
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)

  const handleEmojiClick = (emojiChar: string) => {
    const newEmoji: EmojiItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      emoji: emojiChar,
      x: 100,
      y: 100,
      scale: 1,
    }
    setEmojis([...emojis, newEmoji])
  }

  const handleMouseDown = (e: React.MouseEvent, emojiId: string) => {
    e.stopPropagation()
    const emoji = emojis.find(ei => ei.id === emojiId)
    if (!emoji || !canvasRef.current) return

    const rect = canvasRef.current.getBoundingClientRect()
    setDragOffset({
      x: e.clientX - rect.left - emoji.x,
      y: e.clientY - rect.top - emoji.y,
    })
    setDraggingId(emojiId)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingId || !canvasRef.current) return

    const rect = canvasRef.current.getBoundingClientRect()
    const newX = Math.max(0, Math.min(e.clientX - rect.left - dragOffset.x, rect.width - 40))
    const newY = Math.max(0, Math.min(e.clientY - rect.top - dragOffset.y, rect.height - 40))

    setEmojis(prev => prev.map(ei =>
      ei.id === draggingId ? { ...ei, x: newX, y: newY } : ei
    ))
  }

  const handleMouseUp = () => {
    setDraggingId(null)
  }

  const handleCanvasClick = () => {
    setContextMenu(null)
  }

  const handleLongPressStart = (e: React.MouseEvent | React.TouchEvent, emojiId: string) => {
    e.stopPropagation()
    const timer = setTimeout(() => {
      let clientX: number, clientY: number
      if ('touches' in e) {
        clientX = e.touches[0].clientX
        clientY = e.touches[0].clientY
      } else {
        clientX = e.clientX
        clientY = e.clientY
      }
      setContextMenu({
        emojiId,
        x: clientX,
        y: clientY,
      })
    }, 500)
    setLongPressTimer(timer)
  }

  const handleLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
    }
  }

  const handleScaleChange = (emojiId: string, newScale: number) => {
    setEmojis(prev => prev.map(ei =>
      ei.id === emojiId ? { ...ei, scale: newScale } : ei
    ))
  }

  const handleDeleteEmoji = (emojiId: string) => {
    setEmojis(prev => prev.filter(ei => ei.id !== emojiId))
    setContextMenu(null)
  }

  const handleSave = () => {
    const newEntry: JournalEntry = {
      date,
      emojis,
      note,
    }
    onSave(newEntry)
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenu) {
        setContextMenu(null)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [contextMenu])

  const [year, month, day] = date.split('-')
  const formattedDate = `${year}年${parseInt(month)}月${parseInt(day)}日`
  const activeEmoji = contextMenu ? emojis.find(e => e.id === contextMenu.emojiId) : null

  return (
    <div style={styles.editorContainer}>
      <div style={styles.editorHeader}>
        <h2 style={styles.editorTitle}>编辑心情 - {formattedDate}</h2>
      </div>
      <div style={styles.editorContent}>
        <div style={styles.emojiPanel}>
          <div style={styles.categoryTabs}>
            {emojiCategories.map((cat, idx) => (
              <button
                key={cat.name}
                className="category-tab"
                style={{
                  ...styles.categoryTab,
                  background: activeCategory === idx
                    ? 'linear-gradient(135deg, #FFE082 0%, #FFCC80 100%)'
                    : '#FFFFFF',
                  color: activeCategory === idx ? '#E65100' : '#5D6D7E',
                  fontWeight: activeCategory === idx ? 600 : 400,
                }}
                onClick={() => {
                  setPrevCategory(activeCategory)
                  setActiveCategory(idx)
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>
          <div
            className={activeCategory >= prevCategory ? 'emoji-panel-slide-right' : 'emoji-panel-slide-left'}
            key={activeCategory}
            style={styles.emojiGrid}
          >
            {emojiCategories[activeCategory].emojis.map((emojiChar, idx) => (
              <button
                key={idx}
                className="emoji-btn"
                style={styles.emojiButton}
                onClick={() => handleEmojiClick(emojiChar)}
              >
                {emojiChar}
              </button>
            ))}
          </div>
        </div>

        <div style={styles.canvasArea}>
          <div
            ref={canvasRef}
            className="canvas-grid"
            style={styles.canvas}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={handleCanvasClick}
          >
            {emojis.map((emojiItem) => (
              <div
                key={emojiItem.id}
                style={{
                  ...styles.emojiOnCanvas,
                  left: emojiItem.x,
                  top: emojiItem.y,
                  fontSize: '32px',
                  transform: `scale(${emojiItem.scale})`,
                  transformOrigin: 'top left',
                  boxShadow: draggingId === emojiItem.id
                    ? '0 8px 20px rgba(0, 0, 0, 0.3)'
                    : 'none',
                  cursor: draggingId === emojiItem.id ? 'grabbing' : 'grab',
                  zIndex: draggingId === emojiItem.id ? 10 : 1,
                }}
                onMouseDown={(e) => handleMouseDown(e, emojiItem.id)}
                onMouseDownCapture={(e) => handleLongPressStart(e, emojiItem.id)}
                onMouseUp={handleLongPressEnd}
                onMouseLeave={handleLongPressEnd}
                onTouchStart={(e) => handleLongPressStart(e, emojiItem.id)}
                onTouchEnd={handleLongPressEnd}
                onClick={(e) => e.stopPropagation()}
              >
                {emojiItem.emoji}
              </div>
            ))}

            {contextMenu && activeEmoji && (
              <div
                className="context-menu"
                style={{
                  ...styles.contextMenu,
                  left: contextMenu.x,
                  top: contextMenu.y,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="context-menu-item" style={styles.contextMenuItem}>
                  <span style={styles.contextMenuLabel}>缩放</span>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={activeEmoji.scale}
                    onChange={(e) => handleScaleChange(contextMenu.emojiId, parseFloat(e.target.value))}
                    style={styles.scaleSlider}
                  />
                  <span style={styles.scaleValue}>{Math.round(activeEmoji.scale * 100)}%</span>
                </div>
                <div
                  className="context-menu-item"
                  style={styles.contextMenuItem}
                  onClick={() => handleDeleteEmoji(contextMenu.emojiId)}
                >
                  <span style={styles.contextMenuLabel}>删除</span>
                </div>
              </div>
            )}
          </div>

          <div style={styles.noteArea}>
            <input
              type="text"
              className="note-input"
              placeholder="写下今天的心情备注..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={styles.noteInput}
            />
            <button className="save-btn" style={styles.saveButton} onClick={handleSave}>
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  editorContainer: {
    background: '#FFFFFF',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.05)',
  },
  editorHeader: {
    marginBottom: '20px',
  },
  editorTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#2C3E50',
    margin: 0,
  },
  editorContent: {
    display: 'flex',
    gap: '24px',
    minHeight: '600px',
  },
  emojiPanel: {
    width: '280px',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    background: '#F8F9FA',
    borderRadius: '12px',
    overflow: 'hidden',
  },
  categoryTabs: {
    display: 'flex',
    borderBottom: '1px solid #E1E8ED',
  },
  categoryTab: {
    flex: 1,
    padding: '12px 8px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '13px',
    transition: 'all 0.2s ease',
  },
  emojiGrid: {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    gap: '4px',
    padding: '12px',
    overflowY: 'auto',
    maxHeight: '500px',
  },
  emojiButton: {
    width: '36px',
    height: '36px',
    fontSize: '24px',
    border: 'none',
    background: 'transparent',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.15s ease',
  },
  canvasArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  canvas: {
    flex: 1,
    background: '#FFFFFF',
    borderRadius: '12px',
    position: 'relative',
    overflow: 'hidden',
    aspectRatio: '1 / 1.414',
    minHeight: '500px',
    border: '1px solid #E1E8ED',
  },
  emojiOnCanvas: {
    position: 'absolute',
    lineHeight: 1,
    userSelect: 'none',
    transition: 'box-shadow 0.2s ease',
  },
  noteArea: {
    display: 'flex',
    gap: '12px',
  },
  noteInput: {
    flex: 1,
    padding: '12px 16px',
    fontSize: '14px',
    borderRadius: '8px',
    border: '1px solid #CCD1D9',
    outline: 'none',
    transition: 'border-color 0.2s ease',
  },
  saveButton: {
    padding: '12px 32px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#FFFFFF',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'transform 0.1s ease',
  },
  contextMenu: {
    position: 'fixed',
    background: 'rgba(52, 73, 94, 0.9)',
    borderRadius: '8px',
    padding: '8px',
    minWidth: '200px',
    zIndex: 1000,
  },
  contextMenuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 12px',
    color: '#FFFFFF',
    fontSize: '13px',
    cursor: 'pointer',
    borderRadius: '6px',
    transition: 'background 0.15s ease',
  },
  contextMenuLabel: {
    color: '#FFFFFF',
    minWidth: '40px',
  },
  scaleSlider: {
    flex: 1,
    accentColor: '#FFE082',
  },
  scaleValue: {
    color: '#BDC3C7',
    fontSize: '12px',
    minWidth: '40px',
    textAlign: 'right',
  },
}

export default Editor
