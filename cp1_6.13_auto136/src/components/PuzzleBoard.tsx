import { useRef, useEffect, useCallback, useState } from 'react'
import { useGame } from '../gameStore'
import { socketService } from '../socketService'
import { generatePuzzlePieces, easeOut, getShakeOffset, getAdjacentPieces } from '../puzzleUtils'
import type { PuzzlePieceData } from '../puzzleUtils'

interface AnimatingPiece {
  id: string
  type: 'snap' | 'shake'
  startX: number
  startY: number
  endX: number
  endY: number
  startTime: number
  duration: number
}

export function PuzzleBoard() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const { state, dispatch } = useGame()

  const [scale, setScale] = useState(1)
  const [offsetX, setOffsetX] = useState(0)
  const [offsetY, setOffsetY] = useState(0)

  const dragStateRef = useRef<{
    isDragging: boolean
    pieceId: string | null
    startX: number
    startY: number
    pieceStartX: number
    pieceStartY: number
    lastMoveTime: number
  }>({
    isDragging: false,
    pieceId: null,
    startX: 0,
    startY: 0,
    pieceStartX: 0,
    pieceStartY: 0,
    lastMoveTime: 0,
  })

  const animatingPiecesRef = useRef<Map<string, AnimatingPiece>>(new Map())
  const pieceDataRef = useRef<Map<string, PuzzlePieceData>>(new Map())
  const animationFrameRef = useRef<number | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)

  const { pieces, puzzlePiecesData, currentPlayerId, puzzleCols, puzzleRows, boardWidth, boardHeight } = state

  useEffect(() => {
    if (puzzleTheme && puzzleCols > 0 && puzzleRows > 0 && puzzlePiecesData.length === 0) {
      const data = generatePuzzlePieces({
        cols: puzzleCols,
        rows: puzzleRows,
        boardWidth,
        boardHeight,
        theme: puzzleTheme,
      })
      dispatch({ type: 'SET_PUZZLE_DATA', payload: data })
    }
  }, [puzzleTheme, puzzleCols, puzzleRows, boardWidth, boardHeight, puzzlePiecesData.length, dispatch])

  useEffect(() => {
    pieceDataRef.current.clear()
    puzzlePiecesData.forEach((p) => {
      pieceDataRef.current.set(p.id, p)
    })
  }, [puzzlePiecesData])

  const playSound = useCallback((type: 'ping' | 'buzzer') => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }
      const ctx = audioContextRef.current
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)

      if (type === 'ping') {
        oscillator.type = 'sine'
        oscillator.frequency.setValueAtTime(880, ctx.currentTime)
        oscillator.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15)
        gainNode.gain.setValueAtTime(0.15, ctx.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2)
        oscillator.start(ctx.currentTime)
        oscillator.stop(ctx.currentTime + 0.2)
      } else {
        oscillator.type = 'square'
        oscillator.frequency.setValueAtTime(150, ctx.currentTime)
        oscillator.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.15)
        gainNode.gain.setValueAtTime(0.1, ctx.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2)
        oscillator.start(ctx.currentTime)
        oscillator.stop(ctx.currentTime + 0.2)
      }
    } catch (e) {
      // Audio not available
    }
  }, [])

  useEffect(() => {
    const handlePiecePlaced = (message: any) => {
      const { pieceId, x, y, playerId, score } = message
      animatingPiecesRef.current.set(pieceId, {
        id: pieceId,
        type: 'snap',
        startX: x,
        startY: y,
        endX: x,
        endY: y,
        startTime: performance.now(),
        duration: 400,
      })
      if (playerId === currentPlayerId) {
        playSound('ping')
      }
    }

    const handlePieceRejected = (message: any) => {
      const { pieceId, originalX, originalY } = message
      const piece = pieces.find((p) => p.id === pieceId)
      if (piece) {
        animatingPiecesRef.current.set(pieceId, {
          id: pieceId,
          type: 'shake',
          startX: piece.currentX,
          startY: piece.currentY,
          endX: originalX,
          endY: originalY,
          startTime: performance.now(),
          duration: 200,
        })
      }
      if (piece?.ownerId === currentPlayerId) {
        playSound('buzzer')
      }
    }

    const unsub1 = socketService.on('piecePlaced', handlePiecePlaced)
    const unsub2 = socketService.on('pieceRejected', handlePieceRejected)

    return () => {
      unsub1()
      unsub2()
    }
  }, [pieces, currentPlayerId, playSound])

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const resizeCanvas = () => {
      const containerWidth = container.clientWidth
      const containerHeight = container.clientHeight

      const boardAspect = boardWidth / boardHeight
      const containerAspect = containerWidth / containerHeight

      let newScale: number
      if (containerAspect > boardAspect) {
        newScale = containerHeight / boardHeight
      } else {
        newScale = containerWidth / boardWidth
      }

      newScale = Math.min(newScale, 1)

      const renderedWidth = boardWidth * newScale
      const renderedHeight = boardHeight * newScale

      setScale(newScale)
      setOffsetX((containerWidth - renderedWidth) / 2)
      setOffsetY((containerHeight - renderedHeight) / 2)

      const dpr = window.devicePixelRatio || 1
      canvas.width = containerWidth * dpr
      canvas.height = containerHeight * dpr
      canvas.style.width = containerWidth + 'px'
      canvas.style.height = containerHeight + 'px'
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    return () => window.removeEventListener('resize', resizeCanvas)
  }, [boardWidth, boardHeight])

  const getPieceAtPosition = useCallback(
    (x: number, y: number): string | null => {
      const boardX = (x - offsetX) / scale
      const boardY = (y - offsetY) / scale

      const myPieces = pieces
        .filter((p) => p.ownerId === currentPlayerId && !p.placed)
        .sort((a, b) => b.index - a.index)

      for (const piece of myPieces) {
        const pieceData = pieceDataRef.current.get(piece.id)
        if (!pieceData) continue

        const px = piece.currentX * pieceData.width
        const py = piece.currentY * pieceData.height
        const pw = pieceData.width + pieceData.tabSize * 2
        const ph = pieceData.height + pieceData.tabSize * 2

        if (
          boardX >= px - pieceData.tabSize &&
          boardX <= px + pw - pieceData.tabSize &&
          boardY >= py - pieceData.tabSize &&
          boardY <= py + ph - pieceData.tabSize
        ) {
          return piece.id
        }
      }

      return null
    },
    [pieces, currentPlayerId, offsetX, offsetY, scale]
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (state.gamePhase !== 'playing') return
      if (!currentPlayerId) return

      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return

      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      const pieceId = getPieceAtPosition(x, y)
      if (!pieceId) return

      const piece = pieces.find((p) => p.id === pieceId)
      if (!piece || piece.ownerId !== currentPlayerId) return

      dragStateRef.current = {
        isDragging: true,
        pieceId,
        startX: x,
        startY: y,
        pieceStartX: piece.currentX,
        pieceStartY: piece.currentY,
        lastMoveTime: 0,
      }
    },
    [getPieceAtPosition, pieces, currentPlayerId, state.gamePhase]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const drag = dragStateRef.current
      if (!drag.isDragging || !drag.pieceId) return

      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return

      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      const dx = (x - drag.startX) / scale
      const dy = (y - drag.startY) / scale

      const piece = pieces.find((p) => p.id === drag.pieceId)
      const pieceData = pieceDataRef.current.get(drag.pieceId)
      if (!piece || !pieceData) return

      const pieceDX = dx / pieceData.width
      const pieceDY = dy / pieceData.height

      const newX = Math.max(-0.5, Math.min(puzzleCols - 0.5, drag.pieceStartX + pieceDX))
      const newY = Math.max(-0.5, Math.min(puzzleRows - 0.5, drag.pieceStartY + pieceDY))

      dispatch({
        type: 'UPDATE_PIECE',
        payload: { id: drag.pieceId, x: newX, y: newY },
      })

      const now = performance.now()
      if (now - drag.lastMoveTime > 30) {
        socketService.movePiece(drag.pieceId, newX, newY)
        drag.lastMoveTime = now
      }
    },
    [scale, pieces, puzzleCols, puzzleRows, dispatch]
  )

  const handleMouseUp = useCallback(() => {
    const drag = dragStateRef.current
    if (!drag.isDragging || !drag.pieceId) return

    const piece = pieces.find((p) => p.id === drag.pieceId)
    if (piece && piece.ownerId === currentPlayerId) {
      socketService.placePiece(drag.pieceId, piece.currentX, piece.currentY)
    }

    dragStateRef.current = {
      isDragging: false,
      pieceId: null,
      startX: 0,
      startY: 0,
      pieceStartX: 0,
      pieceStartY: 0,
      lastMoveTime: 0,
    }
  }, [pieces, currentPlayerId])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const render = () => {
      const dpr = window.devicePixelRatio || 1
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      ctx.save()
      ctx.translate(offsetX, offsetY)
      ctx.scale(scale, scale)

      const pieceDataList = Array.from(pieceDataRef.current.values())
      if (pieceDataList.length === 0) {
        ctx.fillStyle = '#f3f4f6'
        ctx.fillRect(0, 0, boardWidth, boardHeight)
        ctx.restore()
        animationFrameRef.current = requestAnimationFrame(render)
        return
      }

      ctx.fillStyle = '#f3f4f6'
      ctx.fillRect(0, 0, boardWidth, boardHeight)

      const sortedPieces = [...pieces].sort((a, b) => {
        if (a.placed && !b.placed) return -1
        if (!a.placed && b.placed) return 1
        return a.index - b.index
      })

      const drag = dragStateRef.current
      const now = performance.now()

      for (const piece of sortedPieces) {
        const pieceData = pieceDataRef.current.get(piece.id)
        if (!pieceData) continue

        const isDragging = drag.isDragging && drag.pieceId === piece.id
        const animation = animatingPiecesRef.current.get(piece.id)

        let drawX = piece.currentX * pieceData.width
        let drawY = piece.currentY * pieceData.height

        if (animation) {
          const progress = Math.min(1, (now - animation.startTime) / animation.duration)
          
          if (animation.type === 'snap') {
            const eased = easeOut(progress)
            drawX = animation.startX * pieceData.width + (animation.endX * pieceData.width - animation.startX * pieceData.width) * eased
            drawY = animation.startY * pieceData.height + (animation.endY * pieceData.height - animation.startY * pieceData.height) * eased
          } else if (animation.type === 'shake') {
            const offset = getShakeOffset(progress, 0.15)
            drawX += offset * pieceData.width
            drawY = animation.startY * pieceData.height + (animation.endY * pieceData.height - animation.startY * pieceData.height) * progress
          }

          if (progress >= 1) {
            animatingPiecesRef.current.delete(piece.id)
          }
        }

        const isMine = piece.ownerId === currentPlayerId
        const isAdjacentToMine = isMine ? false : isAdjacentToOwnedPiece(piece.id)

        let alpha = 1
        if (piece.placed) {
          alpha = 1
        } else if (isMine) {
          alpha = 1
        } else if (isAdjacentToMine) {
          alpha = 0.6
        } else if (piece.ownerId === null) {
          alpha = 0
        } else {
          alpha = 0.3
        }

        if (alpha <= 0) continue

        ctx.save()
        ctx.globalAlpha = alpha
        ctx.translate(drawX - pieceData.tabSize, drawY - pieceData.tabSize)

        const imgCanvas = document.createElement('canvas')
        imgCanvas.width = pieceData.imageData!.width
        imgCanvas.height = pieceData.imageData!.height
        const imgCtx = imgCanvas.getContext('2d')!
        imgCtx.putImageData(pieceData.imageData!, 0, 0)

        if (piece.placed) {
          ctx.filter = 'brightness(1.2)'
        }

        ctx.drawImage(imgCanvas, 0, 0)

        if (isDragging) {
          ctx.globalAlpha = 0.3
          ctx.strokeStyle = '#6366f1'
          ctx.lineWidth = 3
          ctx.strokeRect(
            pieceData.tabSize,
            pieceData.tabSize,
            pieceData.width,
            pieceData.height
          )
        }

        ctx.restore()
      }

      ctx.strokeStyle = '#9ca3af'
      ctx.lineWidth = 2
      ctx.strokeRect(0, 0, boardWidth, boardHeight)

      ctx.restore()

      animationFrameRef.current = requestAnimationFrame(render)
    }

    animationFrameRef.current = requestAnimationFrame(render)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [pieces, offsetX, offsetY, scale, boardWidth, boardHeight, currentPlayerId])

  function isAdjacentToOwnedPiece(pieceId: string): boolean {
    if (!currentPlayerId) return false
    const piece = pieces.find((p) => p.id === pieceId)
    if (!piece) return false

    const adjacent = getAdjacentPieces(piece.index, puzzleCols, puzzleRows)
    return adjacent.some((adjIndex) => {
      const adjPiece = pieces.find((p) => p.index === adjIndex)
      return adjPiece?.ownerId === currentPlayerId
    })
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f3f4f6',
        borderRadius: 16,
        overflow: 'hidden',
      }}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          cursor: dragStateRef.current.isDragging ? 'grabbing' : 'grab',
          touchAction: 'none',
        }}
      />
    </div>
  )
}

export default PuzzleBoard
