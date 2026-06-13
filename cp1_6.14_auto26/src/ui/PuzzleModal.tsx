import React, { useState, useEffect } from 'react'
import { FONT_FAMILY, FONT_SIZE, COLORS } from '../game/constants'
import { Puzzle, MechanicalPuzzleData, PasswordPuzzleData, MemoryPuzzleData } from '../game/types'

interface PuzzleModalProps {
  puzzle: Puzzle
  onSolve: () => void
  onClose: () => void
  puzzleManager: any
}

export const PuzzleModal: React.FC<PuzzleModalProps> = ({ puzzle, onSolve, onClose, puzzleManager }) => {
  const [fadeIn, setFadeIn] = useState(false)
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    setTimeout(() => setFadeIn(true), 10)
  }, [])

  const handleClose = () => {
    setFadeIn(false)
    setTimeout(onClose, 300)
  }

  const renderPuzzle = () => {
    switch (puzzle.type) {
      case 'mechanical':
        return (
          <MechanicalPuzzle
            puzzle={puzzle}
            puzzleManager={puzzleManager}
            onSolve={() => {
              onSolve()
              forceUpdate((x) => x + 1)
            }}
          />
        )
      case 'password':
        return (
          <PasswordPuzzle
            puzzle={puzzle}
            puzzleManager={puzzleManager}
            onSolve={() => {
              onSolve()
              forceUpdate((x) => x + 1)
            }}
          />
        )
      case 'memory':
        return (
          <MemoryPuzzle
            puzzle={puzzle}
            puzzleManager={puzzleManager}
            onSolve={() => {
              onSolve()
              forceUpdate((x) => x + 1)
            }}
          />
        )
      default:
        return null
    }
  }

  const puzzleNames: { [key: string]: string } = {
    mechanical: '机械谜题',
    password: '密码谜题',
    memory: '记忆谜题',
  }

  return (
    <div
      style={{
        ...styles.overlay,
        opacity: fadeIn ? 1 : 0,
        transition: 'opacity 0.3s ease',
      }}
    >
      <div style={styles.modal}>
        <div style={styles.title}>{puzzleNames[puzzle.type] || '谜题'}</div>
        {renderPuzzle()}
        <button style={styles.closeButton} onClick={handleClose}>
          关闭 (ESC)
        </button>
      </div>
    </div>
  )
}

const MechanicalPuzzle: React.FC<{ puzzle: Puzzle; puzzleManager: any; onSolve: () => void }> = ({
  puzzle,
  puzzleManager,
  onSolve,
}) => {
  const data = puzzle.data as MechanicalPuzzleData

  const handleTileClick = (row: number, col: number) => {
    if (puzzle.solved) return
    const solved = puzzleManager.toggleMechanicalTile(puzzle.id, row, col)
    if (solved) {
      onSolve()
    }
  }

  return (
    <div style={styles.mechanicalContainer}>
      <div style={styles.puzzleLabel}>目标图案</div>
      <div style={styles.patternGrid}>
        {data.targetPattern.map((row, i) =>
          row.map((cell, j) => (
            <div
              key={`target-${i}-${j}`}
              style={{
                ...styles.patternCell,
                backgroundColor: cell === 1 ? COLORS.gold : COLORS.wall,
              }}
            />
          )),
        )}
      </div>
      <div style={styles.puzzleLabel}>当前图案 (点击切换)</div>
      <div style={styles.patternGrid}>
        {data.currentPattern.map((row, i) =>
          row.map((cell, j) => (
            <div
              key={`current-${i}-${j}`}
              style={{
                ...styles.patternCell,
                backgroundColor: cell === 1 ? COLORS.teal : COLORS.wall,
                cursor: puzzle.solved ? 'default' : 'pointer',
              }}
              onClick={() => handleTileClick(i, j)}
            />
          )),
        )}
      </div>
      {puzzle.solved && <div style={styles.solvedText}>谜题已解开！</div>}
    </div>
  )
}

const PasswordPuzzle: React.FC<{ puzzle: Puzzle; puzzleManager: any; onSolve: () => void }> = ({
  puzzle,
  puzzleManager,
  onSolve,
}) => {
  const data = puzzle.data as PasswordPuzzleData
  const [shake, setShake] = useState(false)

  const handleDigit = (digit: string) => {
    if (puzzle.solved) return
    const result = puzzleManager.inputPasswordDigit(puzzle.id, digit)
    if (result.complete && !result.correct) {
      setShake(true)
      setTimeout(() => {
        setShake(false)
        puzzleManager.clearPassword(puzzle.id)
      }, 500)
    } else if (result.correct) {
      onSolve()
    }
  }

  const handleClear = () => {
    puzzleManager.clearPassword(puzzle.id)
  }

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']

  return (
    <div style={styles.passwordContainer}>
      <div style={styles.hintText}>提示：{data.hint}</div>
      <div
        style={{
          ...styles.passwordDisplay,
          animation: shake ? 'shake 0.3s' : 'none',
        }}
      >
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={styles.passwordDigit}>
            {data.currentInput[i] || '_'}
          </div>
        ))}
      </div>
      <div style={styles.keypad}>
        {digits.map((digit) => (
          <button key={digit} style={styles.keyButton} onClick={() => handleDigit(digit)}>
            {digit}
          </button>
        ))}
      </div>
      <button style={styles.clearButton} onClick={handleClear}>
        清除
      </button>
      {puzzle.solved && <div style={styles.solvedText}>密码正确！</div>}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
      `}</style>
    </div>
  )
}

const MemoryPuzzle: React.FC<{ puzzle: Puzzle; puzzleManager: any; onSolve: () => void }> = ({
  puzzle,
  puzzleManager,
  onSolve,
}) => {
  const data = puzzle.data as MemoryPuzzleData
  const [, forceUpdate] = useState(0)

  const handleCardClick = (index: number) => {
    if (puzzle.solved) return
    const card = data.cards[index]
    if (card.flipped || card.matched) return
    if (data.flippedIndices.length >= 2) return

    const result = puzzleManager.flipMemoryCard(puzzle.id, index)
    forceUpdate((x) => x + 1)

    if (result.shouldFlipBack) {
      setTimeout(() => {
        puzzleManager.flipBackMemoryCards(puzzle.id)
        forceUpdate((x) => x + 1)
      }, 1000)
    }

    if (result.allMatched) {
      onSolve()
    }
  }

  const colors = [COLORS.magenta, COLORS.teal, COLORS.goldBright, '#ff6b6b', '#4ecdc4', '#45b7d1']

  return (
    <div style={styles.memoryContainer}>
      <div style={styles.memoryGrid}>
        {data.cards.map((card, index) => (
          <div
            key={card.id}
            style={{
              ...styles.memoryCard,
              backgroundColor: card.flipped || card.matched ? colors[card.value - 1] : COLORS.wall,
              borderColor: card.matched ? COLORS.goldBright : COLORS.gold,
              cursor: card.flipped || card.matched ? 'default' : 'pointer',
            }}
            onClick={() => handleCardClick(index)}
          >
            {(card.flipped || card.matched) && (
              <div style={styles.cardSymbol}>{card.value}</div>
            )}
          </div>
        ))}
      </div>
      <div style={styles.memoryInfo}>
        已匹配: {data.matchedPairs}/{data.totalPairs}
      </div>
      {puzzle.solved && <div style={styles.solvedText}>全部匹配！</div>}
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.53)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  modal: {
    backgroundColor: COLORS.bgPurple,
    border: `3px solid ${COLORS.gold}`,
    borderRadius: '8px',
    padding: '24px',
    minWidth: '320px',
    maxWidth: '90vw',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
  },
  title: {
    fontFamily: FONT_FAMILY,
    fontSize: `${FONT_SIZE}px`,
    color: COLORS.goldBright,
    textShadow: '2px 2px 0 #000',
  },
  closeButton: {
    fontFamily: FONT_FAMILY,
    fontSize: '10px',
    padding: '8px 16px',
    backgroundColor: COLORS.wall,
    color: COLORS.white,
    border: `2px solid ${COLORS.gold}`,
    cursor: 'pointer',
    transition: 'all 0.1s ease',
  },
  mechanicalContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
  puzzleLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: '10px',
    color: COLORS.white,
  },
  patternGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 40px)',
    gridTemplateRows: 'repeat(3, 40px)',
    gap: '4px',
  },
  patternCell: {
    width: 40,
    height: 40,
    border: `2px solid ${COLORS.gold}`,
    borderRadius: '2px',
    transition: 'all 0.15s ease',
  },
  passwordContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
  hintText: {
    fontFamily: FONT_FAMILY,
    fontSize: '10px',
    color: COLORS.teal,
    textAlign: 'center',
    lineHeight: 1.5,
  },
  passwordDisplay: {
    display: 'flex',
    gap: '8px',
    padding: '12px',
    backgroundColor: COLORS.wall,
    border: `2px solid ${COLORS.gold}`,
    borderRadius: '4px',
  },
  passwordDigit: {
    fontFamily: FONT_FAMILY,
    fontSize: '20px',
    color: COLORS.goldBright,
    width: 30,
    textAlign: 'center',
  },
  keypad: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 40px)',
    gap: '6px',
  },
  keyButton: {
    fontFamily: FONT_FAMILY,
    fontSize: '14px',
    width: 40,
    height: 40,
    backgroundColor: COLORS.wall,
    color: COLORS.white,
    border: `2px solid ${COLORS.gold}`,
    cursor: 'pointer',
    transition: 'all 0.1s ease',
  },
  clearButton: {
    fontFamily: FONT_FAMILY,
    fontSize: '10px',
    padding: '6px 12px',
    backgroundColor: '#8b0000',
    color: COLORS.white,
    border: `2px solid ${COLORS.danger}`,
    cursor: 'pointer',
    transition: 'all 0.1s ease',
  },
  memoryContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
  memoryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 50px)',
    gridTemplateRows: 'repeat(2, 60px)',
    gap: '8px',
  },
  memoryCard: {
    width: 50,
    height: 60,
    border: `3px solid ${COLORS.gold}`,
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease',
  },
  cardSymbol: {
    fontFamily: FONT_FAMILY,
    fontSize: '18px',
    color: COLORS.white,
    textShadow: '2px 2px 0 rgba(0,0,0,0.5)',
  },
  memoryInfo: {
    fontFamily: FONT_FAMILY,
    fontSize: '10px',
    color: COLORS.white,
  },
  solvedText: {
    fontFamily: FONT_FAMILY,
    fontSize: '12px',
    color: COLORS.goldBright,
    textShadow: '2px 2px 0 #000',
    animation: 'pulse 0.5s ease infinite',
  },
}

export default PuzzleModal
