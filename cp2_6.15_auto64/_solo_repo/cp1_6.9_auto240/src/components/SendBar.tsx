import { useState, useRef, useEffect, KeyboardEvent } from 'react'

interface SendBarProps {
  onSend: (text: string, colorIndex: number) => void
  colorPresets: string[]
}

const MAX_CHARS = 50

export default function SendBar({ onSend, colorPresets }: SendBarProps) {
  const [text, setText] = useState('')
  const [selectedColor, setSelectedColor] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSend = () => {
    if (!text.trim()) return
    if (text.length > MAX_CHARS) return
    onSend(text, selectedColor)
    setText('')
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  return (
    <div className="send-bar">
      <div className="send-row">
        <input
          ref={inputRef}
          className="bullet-input"
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
          onKeyDown={handleKeyDown}
          placeholder="说点什么..."
          maxLength={MAX_CHARS}
        />
        <span className="char-count">
          {text.length}/{MAX_CHARS}
        </span>
        <button
          className="send-btn"
          onClick={handleSend}
          disabled={!text.trim()}
        >
          发送
        </button>
      </div>
      <div className="color-picker">
        {colorPresets.map((gradient, idx) => (
          <div
            key={idx}
            className={`color-option ${
              selectedColor === idx ? 'selected' : ''
            }`}
            style={{ background: gradient }}
            onClick={() => setSelectedColor(idx)}
          />
        ))}
      </div>
    </div>
  )
}
