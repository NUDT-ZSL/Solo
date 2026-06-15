import React, { useState, useCallback } from 'react'
import type { PuzzleConfig, SequencePuzzleData, MatchingPuzzleData, CipherPuzzleData, ArrangePuzzleData, RiddlePuzzleData } from '../data/levels'

interface PuzzleProps {
  puzzle: PuzzleConfig
  onSolved: () => void
  onClose: () => void
}

const puzzleContainerStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(30, 25, 20, 0.85)',
  backdropFilter: 'blur(4px)',
  zIndex: 100,
  animation: 'fadeIn 0.6s ease-out',
}

const puzzleCardStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #f5f0e8, #e8dcc8)',
  borderRadius: 12,
  padding: '32px 36px',
  maxWidth: 520,
  width: '90%',
  boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.3)',
  border: '1px solid rgba(180, 160, 130, 0.4)',
}

const puzzleTitleStyle: React.CSSProperties = {
  fontFamily: "'Georgia', 'SimSun', serif",
  fontSize: 22,
  fontWeight: 'bold',
  color: '#5a4a38',
  marginBottom: 6,
  textAlign: 'center',
}

const puzzleDescStyle: React.CSSProperties = {
  fontFamily: "'Georgia', 'SimSun', serif",
  fontSize: 14,
  color: '#8a7a68',
  marginBottom: 24,
  textAlign: 'center',
  lineHeight: 1.6,
}

function SequencePuzzle({ data, onSolved }: { data: SequencePuzzleData; onSolved: () => void }) {
  const [selected, setSelected] = useState<number[]>([])
  const [shuffled] = useState(() => {
    const arr = data.items.map((_, i) => i)
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  })

  const handleClick = useCallback(
    (idx: number) => {
      if (selected.includes(idx)) return
      const next = [...selected, idx]
      setSelected(next)
      if (next.length === data.correctOrder.length) {
        const isCorrect = next.every((s, i) => shuffled[s] === data.correctOrder[i])
        if (isCorrect) {
          setTimeout(onSolved, 300)
        } else {
          setTimeout(() => setSelected([]), 600)
        }
      }
    },
    [selected, shuffled, data.correctOrder, onSolved]
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
      <div style={{ fontSize: 13, color: '#8a7a68', marginBottom: 4 }}>按正确顺序点击物件</div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
        {shuffled.map((originalIdx, displayIdx) => {
          const isSelected = selected.includes(displayIdx)
          const orderNum = selected.indexOf(displayIdx) + 1
          return (
            <button
              key={displayIdx}
              onClick={() => handleClick(displayIdx)}
              style={{
                padding: '12px 20px',
                border: `2px solid ${isSelected ? '#c9a96e' : '#d4c8b0'}`,
                borderRadius: 8,
                background: isSelected
                  ? 'linear-gradient(135deg, #faf4e6, #f0e4c8)'
                  : 'rgba(255,255,255,0.6)',
                color: '#5a4a38',
                fontFamily: "'Georgia', 'SimSun', serif",
                fontSize: 15,
                cursor: isSelected ? 'default' : 'pointer',
                position: 'relative',
                transition: 'all 0.3s ease',
                transform: isSelected ? 'scale(0.95)' : 'scale(1)',
                boxShadow: isSelected
                  ? '0 2px 8px rgba(201,169,110,0.3)'
                  : '0 1px 4px rgba(0,0,0,0.1)',
              }}
            >
              {data.items[originalIdx]}
              {isSelected && (
                <span
                  style={{
                    position: 'absolute',
                    top: -8,
                    right: -8,
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: '#c9a96e',
                    color: '#fff',
                    fontSize: 11,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {orderNum}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function MatchingPuzzle({ data, onSolved }: { data: MatchingPuzzleData; onSolved: () => void }) {
  const [selected, setSelected] = useState<string | null>(null)
  const [matched, setMatched] = useState<Set<string>>(new Set())

  const allItems = data.pairs.flatMap(([a, b]) => [a, b])
  const [shuffledItems] = useState(() => {
    const arr = [...allItems]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  })

  const handleClick = useCallback(
    (item: string) => {
      if (matched.has(item)) return
      if (!selected) {
        setSelected(item)
        return
      }
      if (selected === item) {
        setSelected(null)
        return
      }
      const isPair = data.pairs.some(
        ([a, b]) =>
          (a === selected && b === item) || (b === selected && a === item)
      )
      if (isPair) {
        const next = new Set(matched)
        next.add(selected)
        next.add(item)
        setMatched(next)
        setSelected(null)
        if (next.size === allItems.length) {
          setTimeout(onSolved, 300)
        }
      } else {
        setSelected(null)
      }
    },
    [selected, matched, data.pairs, allItems.length, onSolved]
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
      <div style={{ fontSize: 13, color: '#8a7a68', marginBottom: 4 }}>点击两个相关联的物件进行配对</div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
        {shuffledItems.map((item) => {
          const isMatched = matched.has(item)
          const isSelected = selected === item
          return (
            <button
              key={item}
              onClick={() => handleClick(item)}
              style={{
                padding: '10px 18px',
                border: `2px solid ${isMatched ? '#9ab87a' : isSelected ? '#c9a96e' : '#d4c8b0'}`,
                borderRadius: 8,
                background: isMatched
                  ? 'linear-gradient(135deg, #e8f0e0, #d0e0c0)'
                  : isSelected
                  ? 'linear-gradient(135deg, #faf4e6, #f0e4c8)'
                  : 'rgba(255,255,255,0.6)',
                color: '#5a4a38',
                fontFamily: "'Georgia', 'SimSun', serif",
                fontSize: 14,
                cursor: isMatched ? 'default' : 'pointer',
                transition: 'all 0.3s ease',
                opacity: isMatched ? 0.6 : 1,
                transform: isMatched ? 'scale(0.95)' : 'scale(1)',
              }}
            >
              {item}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function CipherPuzzle({ data, onSolved }: { data: CipherPuzzleData; onSolved: () => void }) {
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)

  const decrypt = (text: string, shift: number): string => {
    return text
      .toUpperCase()
      .split('')
      .map((ch) => {
        if (ch >= 'A' && ch <= 'Z') {
          return String.fromCharCode(((ch.charCodeAt(0) - 65 - shift + 26) % 26) + 65)
        }
        return ch
      })
      .join('')
  }

  const handleSubmit = () => {
    const correct = decrypt(data.encrypted, data.shift)
    if (input.toUpperCase().trim() === correct) {
      onSolved()
    } else {
      setError(true)
      setTimeout(() => setError(false), 1000)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
      <div
        style={{
          padding: '16px 24px',
          background: 'rgba(160,120,90,0.15)',
          borderRadius: 8,
          fontFamily: 'monospace',
          fontSize: 20,
          letterSpacing: 4,
          color: '#5a4a38',
          textAlign: 'center',
          border: '1px dashed rgba(160,120,90,0.3)',
        }}
      >
        {data.encrypted}
      </div>
      <div style={{ fontSize: 12, color: '#8a7a68' }}>提示：{data.hint}</div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="输入解密结果..."
          style={{
            padding: '10px 16px',
            border: `2px solid ${error ? '#c0392b' : '#d4c8b0'}`,
            borderRadius: 8,
            background: 'rgba(255,255,255,0.8)',
            fontFamily: "'Georgia', 'SimSun', serif",
            fontSize: 16,
            color: '#5a4a38',
            outline: 'none',
            width: 220,
            transition: 'border-color 0.3s',
          }}
        />
        <button
          onClick={handleSubmit}
          style={{
            padding: '10px 20px',
            border: '2px solid #c9a96e',
            borderRadius: 8,
            background: 'linear-gradient(135deg, #faf4e6, #f0e4c8)',
            color: '#5a4a38',
            fontFamily: "'Georgia', 'SimSun', serif",
            fontSize: 14,
            cursor: 'pointer',
            transition: 'all 0.3s',
          }}
        >
          解密
        </button>
      </div>
      {error && (
        <div style={{ color: '#c0392b', fontSize: 13, animation: 'fadeIn 0.3s' }}>
          解密结果不正确，再试试...
        </div>
      )}
    </div>
  )
}

function ArrangePuzzle({ data, onSolved }: { data: ArrangePuzzleData; onSolved: () => void }) {
  const [items, setItems] = useState<string[]>(() => {
    const arr = [...data.pieces]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  })
  const [dragIdx, setDragIdx] = useState<number | null>(null)

  const handleDragStart = (idx: number) => setDragIdx(idx)

  const handleDrop = (targetIdx: number) => {
    if (dragIdx === null || dragIdx === targetIdx) return
    const next = [...items]
    ;[next[dragIdx], next[targetIdx]] = [next[targetIdx], next[dragIdx]]
    setItems(next)
    setDragIdx(null)

    const isCorrect = next.every((_, i) => {
      const originalIdx = data.pieces.indexOf(next[i])
      return data.correctPositions[originalIdx] === i
    })
    if (isCorrect) {
      setTimeout(onSolved, 400)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
      <div style={{ fontSize: 13, color: '#8a7a68', marginBottom: 4 }}>拖拽碎片到正确位置（点击交换）</div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
        {items.map((piece, idx) => (
          <button
            key={idx}
            draggable
            onDragStart={() => handleDragStart(idx)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(idx)}
            onClick={() => {
              if (dragIdx === null) {
                setDragIdx(idx)
              } else {
                handleDrop(idx)
              }
            }}
            style={{
              padding: '14px 22px',
              border: `2px solid ${dragIdx === idx ? '#c9a96e' : '#d4c8b0'}`,
              borderRadius: 8,
              background:
                dragIdx === idx
                  ? 'linear-gradient(135deg, #faf4e6, #f0e4c8)'
                  : 'rgba(255,255,255,0.6)',
              color: '#5a4a38',
              fontFamily: "'Georgia', 'SimSun', serif",
              fontSize: 15,
              cursor: 'grab',
              transition: 'all 0.3s ease',
              userSelect: 'none',
            }}
          >
            {piece}
          </button>
        ))}
      </div>
    </div>
  )
}

function RiddlePuzzle({ data, onSolved }: { data: RiddlePuzzleData; onSolved: () => void }) {
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)
  const [hintIdx, setHintIdx] = useState(-1)

  const handleSubmit = () => {
    if (input.trim() === data.answer) {
      onSolved()
    } else {
      setError(true)
      setTimeout(() => setError(false), 1000)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
      <div
        style={{
          padding: '20px 28px',
          background: 'rgba(212,168,84,0.1)',
          borderRadius: 10,
          border: '1px solid rgba(212,168,84,0.25)',
          color: '#5a4a38',
          fontFamily: "'Georgia', 'SimSun', serif",
          fontSize: 16,
          lineHeight: 2,
          textAlign: 'center',
          fontStyle: 'italic',
          maxWidth: 400,
        }}
      >
        {data.question}
      </div>
      {hintIdx >= 0 && (
        <div
          style={{
            fontSize: 13,
            color: '#b8860b',
            fontStyle: 'italic',
            animation: 'fadeIn 0.5s',
          }}
        >
          💡 {data.hints[hintIdx]}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="输入你的答案..."
          style={{
            padding: '10px 16px',
            border: `2px solid ${error ? '#c0392b' : '#d4c8b0'}`,
            borderRadius: 8,
            background: 'rgba(255,255,255,0.8)',
            fontFamily: "'Georgia', 'SimSun', serif",
            fontSize: 16,
            color: '#5a4a38',
            outline: 'none',
            width: 200,
            transition: 'border-color 0.3s',
          }}
        />
        <button
          onClick={handleSubmit}
          style={{
            padding: '10px 20px',
            border: '2px solid #d4a854',
            borderRadius: 8,
            background: 'linear-gradient(135deg, #faf4e6, #f0e4c8)',
            color: '#5a4a38',
            fontFamily: "'Georgia', 'SimSun', serif",
            fontSize: 14,
            cursor: 'pointer',
            transition: 'all 0.3s',
          }}
        >
          回答
        </button>
      </div>
      {hintIdx < data.hints.length - 1 && (
        <button
          onClick={() => setHintIdx((i) => i + 1)}
          style={{
            padding: '6px 14px',
            border: '1px solid rgba(180,160,130,0.4)',
            borderRadius: 6,
            background: 'transparent',
            color: '#8a7a68',
            fontSize: 12,
            cursor: 'pointer',
            fontFamily: "'Georgia', 'SimSun', serif",
          }}
        >
          获取提示 ({hintIdx + 1}/{data.hints.length})
        </button>
      )}
      {error && (
        <div style={{ color: '#c0392b', fontSize: 13, animation: 'fadeIn 0.3s' }}>
          答案不对，再想想...
        </div>
      )}
    </div>
  )
}

export default function Puzzle({ puzzle, onSolved, onClose }: PuzzleProps) {
  const renderPuzzle = () => {
    switch (puzzle.type) {
      case 'sequence':
        return <SequencePuzzle data={puzzle.data as SequencePuzzleData} onSolved={onSolved} />
      case 'matching':
        return <MatchingPuzzle data={puzzle.data as MatchingPuzzleData} onSolved={onSolved} />
      case 'cipher':
        return <CipherPuzzle data={puzzle.data as CipherPuzzleData} onSolved={onSolved} />
      case 'arrange':
        return <ArrangePuzzle data={puzzle.data as ArrangePuzzleData} onSolved={onSolved} />
      case 'riddle':
        return <RiddlePuzzle data={puzzle.data as RiddlePuzzleData} onSolved={onSolved} />
    }
  }

  return (
    <div style={puzzleContainerStyle} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={puzzleCardStyle}>
        <div style={puzzleTitleStyle}>{puzzle.title}</div>
        <div style={puzzleDescStyle}>{puzzle.description}</div>
        {renderPuzzle()}
        <button
          onClick={onClose}
          style={{
            display: 'block',
            margin: '20px auto 0',
            padding: '6px 16px',
            border: '1px solid rgba(180,160,130,0.4)',
            borderRadius: 6,
            background: 'transparent',
            color: '#8a7a68',
            fontSize: 12,
            cursor: 'pointer',
            fontFamily: "'Georgia', 'SimSun', serif",
          }}
        >
          返回场景
        </button>
      </div>
    </div>
  )
}
