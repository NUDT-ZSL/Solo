import React, { useState, useCallback, useRef, useEffect } from 'react'
import { PuzzlePiece, validateSwap } from '@game/puzzleBoard'
import './PuzzleGrid.css'

interface PuzzleGridProps {
  pieces: PuzzlePiece[]
  rows: number
  cols: number
  onSwap: (pieceId1: number, pieceId2: number) => void
  disabled?: boolean
  currentUserId?: string | null
}

const PuzzleGrid: React.FC<PuzzleGridProps> = ({
  pieces,
  rows,
  cols,
  onSwap,
  disabled = false,
  currentUserId,
}) => {
  const [selectedPiece, setSelectedPiece] = useState<number | null>(null)
  const [draggingPiece, setDraggingPiece] = useState<number | null>(null)
  const [dragRenderPos, setDragRenderPos] = useState({ x: 0, y: 0 })
  const gridRef = useRef<HTMLDivElement>(null)
  const dragPieceRef = useRef<number | null>(null)
  const dragOffsetRef = useRef({ x: 0, y: 0 })
  const dragPosRef = useRef({ x: 0, y: 0 })
  const rafRef = useRef<number | null>(null)
  const pieceSizeRef = useRef(60)

  const getPieceAtPosition = useCallback(
    (row: number, col: number): PuzzlePiece | undefined => {
      return pieces.find((p) => p.currentRow === row && p.currentCol === col)
    },
    [pieces]
  )

  const handlePieceClick = useCallback(
    (pieceId: number) => {
      if (disabled) return

      if (selectedPiece === null) {
        setSelectedPiece(pieceId)
      } else if (selectedPiece === pieceId) {
        setSelectedPiece(null)
      } else {
        const piece1 = pieces.find((p) => p.id === selectedPiece)
        const piece2 = pieces.find((p) => p.id === pieceId)

        if (piece1 && piece2 && validateSwap({ pieces, rows, cols, isComplete: false, startTime: null, endTime: null }, selectedPiece, pieceId, currentUserId ?? undefined)) {
          onSwap(selectedPiece, pieceId)
          setSelectedPiece(null)
        } else {
          setSelectedPiece(pieceId)
        }
      }
    },
    [selectedPiece, pieces, rows, cols, onSwap, disabled, currentUserId]
  )

  const handleDragEnd = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }

    const currentDraggingId = dragPieceRef.current
    if (currentDraggingId === null) return

    const piece = pieces.find((p) => p.id === currentDraggingId)
    if (!piece || !gridRef.current) {
      setDraggingPiece(null)
      dragPieceRef.current = null
      return
    }

    const gridRect = gridRef.current.getBoundingClientRect()
    const pieceSize = gridRect.width / cols

    const targetCol = Math.round(dragPosRef.current.x / pieceSize)
    const targetRow = Math.round(dragPosRef.current.y / pieceSize)

    const targetPiece = getPieceAtPosition(targetRow, targetCol)

    if (targetPiece && targetPiece.id !== currentDraggingId) {
      const boardMock = { pieces, rows, cols, isComplete: false, startTime: null, endTime: null }
      if (validateSwap(boardMock, currentDraggingId, targetPiece.id, currentUserId ?? undefined)) {
        onSwap(currentDraggingId, targetPiece.id)
      }
    }

    setDraggingPiece(null)
    dragPieceRef.current = null
    setSelectedPiece(null)
  }, [pieces, rows, cols, getPieceAtPosition, onSwap, currentUserId])

  const handleDragMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (dragPieceRef.current === null || !gridRef.current) return

      if ('cancelable' in e) {
        e.preventDefault()
      }

      const rect = gridRef.current.getBoundingClientRect()
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

      dragPosRef.current = {
        x: clientX - rect.left - dragOffsetRef.current.x,
        y: clientY - rect.top - dragOffsetRef.current.y,
      }

      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(() => {
          setDragRenderPos({ ...dragPosRef.current })
          rafRef.current = null
        })
      }
    },
    []
  )

  const handleDragStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent, pieceId: number) => {
      if (disabled) return
      e.preventDefault()

      const piece = pieces.find((p) => p.id === pieceId)
      if (!piece || !gridRef.current) return

      const rect = gridRef.current.getBoundingClientRect()
      pieceSizeRef.current = rect.width / cols

      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

      const pieceX = piece.currentCol * pieceSizeRef.current
      const pieceY = piece.currentRow * pieceSizeRef.current

      dragOffsetRef.current = {
        x: clientX - rect.left - pieceX,
        y: clientY - rect.top - pieceY,
      }

      dragPosRef.current = {
        x: clientX - rect.left - pieceX,
        y: clientY - rect.top - pieceY,
      }

      dragPieceRef.current = pieceId
      setDraggingPiece(pieceId)
      setSelectedPiece(pieceId)
      setDragRenderPos({ ...dragPosRef.current })
    },
    [pieces, cols, disabled]
  )

  useEffect(() => {
    if (draggingPiece !== null) {
      const moveHandler = (e: MouseEvent) => handleDragMove(e)
      const endHandler = () => handleDragEnd()
      const touchMoveHandler = (e: TouchEvent) => handleDragMove(e)
      const touchEndHandler = () => handleDragEnd()

      window.addEventListener('mousemove', moveHandler)
      window.addEventListener('mouseup', endHandler)
      window.addEventListener('touchmove', touchMoveHandler, { passive: false })
      window.addEventListener('touchend', touchEndHandler)

      return () => {
        window.removeEventListener('mousemove', moveHandler)
        window.removeEventListener('mouseup', endHandler)
        window.removeEventListener('touchmove', touchMoveHandler)
        window.removeEventListener('touchend', touchEndHandler)
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current)
          rafRef.current = null
        }
      }
    }
  }, [draggingPiece, handleDragMove, handleDragEnd])

  const renderPiece = (piece: PuzzlePiece) => {
    const isSelected = selectedPiece === piece.id
    const isDragging = draggingPiece === piece.id
    const isOwned = currentUserId ? piece.ownerId === currentUserId : true

    const style: React.CSSProperties = {
      backgroundColor: piece.color,
      zIndex: isDragging ? 100 : isSelected ? 10 : 1,
      cursor: disabled ? 'default' : isOwned ? 'grab' : 'not-allowed',
      opacity: isOwned ? 1 : 0.5,
      transition: isDragging ? 'none' : 'transform 0.3s ease-out, box-shadow 0.2s',
    }

    if (isDragging && gridRef.current) {
      const rect = gridRef.current.getBoundingClientRect()
      const pieceSize = rect.width / cols
      style.position = 'absolute'
      style.left = `${dragRenderPos.x}px`
      style.top = `${dragRenderPos.y}px`
      style.width = `${pieceSize}px`
      style.height = `${pieceSize}px`
      style.transform = 'scale(1.1)'
    } else {
      style.gridColumn = piece.currentCol + 1
      style.gridRow = piece.currentRow + 1
    }

    return (
      <div
        key={piece.id}
        className={`puzzle-piece ${isSelected ? 'selected' : ''} ${piece.isCorrect ? 'correct' : ''} ${isDragging ? 'dragging' : ''}`}
        style={style}
        onClick={() => handlePieceClick(piece.id)}
        onMouseDown={(e) => handleDragStart(e, piece.id)}
        onTouchStart={(e) => handleDragStart(e, piece.id)}
      />
    )
  }

  return (
    <div className="puzzle-grid-container">
      <div
        ref={gridRef}
        className="puzzle-grid"
        style={{
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
        }}
      >
        {pieces.map(renderPiece)}
      </div>
    </div>
  )
}

export default PuzzleGrid
