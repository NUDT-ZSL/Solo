import React, { useRef, useState, useEffect, useCallback } from 'react'
import { Piece, Position } from '../types'
import { gameEngine } from '../game/GameEngine'
import { eventBus } from '../eventBus'

interface PuzzleBoardProps {
  pieces: Piece[]
  onPiecesChange: () => void
  effectsCanvasRef: React.RefObject<HTMLCanvasElement>
}

export const PuzzleBoard: React.FC<PuzzleBoardProps> = ({ pieces, onPiecesChange, effectsCanvasRef }) => {
  const boardRef = useRef<HTMLDivElement>(null)
  const [draggingPieceId, setDraggingPieceId] = useState<number | null>(null)
  const [hintPieceId, setHintPieceId] = useState<number | null>(null)
  const [offset, setOffset] = useState<Position>({ x: 0, y: 0 })

  useEffect(() => {
    const handleHintUsed = (pieceId: unknown) => {
      const id = pieceId as number
      setHintPieceId(id)
      setTimeout(() => setHintPieceId(null), 2000)
    }

    eventBus.on('hintUsed', handleHintUsed)
    return () => eventBus.off('hintUsed', handleHintUsed)
  }, [])

  const getMousePosition = useCallback((e: React.MouseEvent | MouseEvent): Position => {
    if (!boardRef.current) return { x: 0, y: 0 }
    const rect = boardRef.current.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent, piece: Piece) => {
    if (piece.isPlaced) return
    e.preventDefault()

    const mousePos = getMousePosition(e)
    setOffset({
      x: mousePos.x - piece.currentPosition.x,
      y: mousePos.y - piece.currentPosition.y
    })
    setDraggingPieceId(piece.id)
  }, [getMousePosition])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (draggingPieceId === null) return

    const mousePos = getMousePosition(e)
    const newPosition: Position = {
      x: mousePos.x - offset.x,
      y: mousePos.y - offset.y
    }

    gameEngine.updatePiecePosition(draggingPieceId, newPosition)
    onPiecesChange()
  }, [draggingPieceId, offset, getMousePosition, onPiecesChange])

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (draggingPieceId === null) return

    const mousePos = getMousePosition(e)
    const finalPosition: Position = {
      x: mousePos.x - offset.x,
      y: mousePos.y - offset.y
    }

    gameEngine.checkPiece(finalPosition, draggingPieceId)
    setDraggingPieceId(null)
    onPiecesChange()
  }, [draggingPieceId, offset, getMousePosition, onPiecesChange])

  useEffect(() => {
    if (draggingPieceId !== null) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [draggingPieceId, handleMouseMove, handleMouseUp])

  const sortedPieces = [...pieces].sort((a, b) => {
    if (a.isPlaced === b.isPlaced) return 0
    return a.isPlaced ? -1 : 1
  })

  return (
    <div
      ref={boardRef}
      style={{
        width: '100%',
        height: '600px',
        borderRadius: '16px',
        backgroundColor: '#1e1e2e',
        border: '1px solid #313244',
        position: 'relative',
        overflow: 'hidden',
        userSelect: 'none'
      }}
    >
      <canvas
        ref={effectsCanvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none'
        }}
      />
      {sortedPieces.map((piece) => {
        const isDragging = draggingPieceId === piece.id
        const isHinted = hintPieceId === piece.id
        const isDraggingOrHinted = isDragging || isHinted
        const zIndex = isDraggingOrHinted ? 10 : piece.isPlaced ? 1 : 5
        return (
          <div
            key={piece.id}
            onMouseDown={(e) => handleMouseDown(e, piece)}
            style={{
              position: 'absolute',
              left: piece.currentPosition.x,
              top: piece.currentPosition.y,
              width: piece.width,
              height: piece.height,
              backgroundColor: piece.color,
              border: isHinted
                ? '3px solid #f9e2af'
                : '1px solid #585b70',
              opacity: isDragging ? 0.7 : 1,
              transform: isDragging ? 'scale(1.05)' : 'scale(1)',
              cursor: piece.isPlaced ? 'default' : 'grab',
              transition: 'all 0.2s ease',
              zIndex,
              boxShadow: isHinted ? '0 0 15px rgba(249, 226, 175, 0.8)' : 'none'
            }}
          />
        )
      })}
    </div>
  )
}
