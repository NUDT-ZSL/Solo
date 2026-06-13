import { useRef, useEffect, useCallback, useState } from 'react'
import { useGame } from '../gameStore'
import { socketService } from '../socketService'
import { generatePuzzlePieces, easeOutCubic, shakeOffset, getAdjacentPieceIndices } from '../puzzleUtils'
import type { PuzzlePieceData } from '../puzzleUtils'

interface AnimState {
  type: 'snap' | 'shake'
  startX: number
  startY: number
  endX: number
  endY: number
  startTime: number
}

export function PuzzleBoard() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const { state, dispatch } = useGame()

  const [scale, setScale] = useState(1)
  const [offsetX, setOffsetX] = useState(0)
  const [offsetY, setOffsetY] = useState(0)

  const dragRef = useRef({
    active: false,
    pieceId: null as string | null,
    startClientX: 0,
    startClientY: 0,
    pieceStartX: 0,
    pieceStartY: 0,
    lastEmit: 0,
  })

  const animsRef = useRef<Map<string, AnimState>>(new Map())
  const pieceDataMapRef = useRef<Map<string, PuzzlePieceData>>(new Map())
  const rafRef = useRef<number | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)

  const {
    pieces, puzzlePiecesData, currentPlayerId,
    puzzleCols, puzzleRows, boardWidth, boardHeight,
    puzzleTheme, gamePhase,
  } = state

  useEffect(() => {
    if (puzzleTheme && puzzleCols > 0 && puzzleRows > 0 && puzzlePiecesData.length === 0) {
      const data = generatePuzzlePieces({
        cols: puzzleCols, rows: puzzleRows,
        boardWidth, boardHeight, theme: puzzleTheme,
      })
      dispatch({ type: 'SET_PUZZLE_DATA', payload: data })
    }
  }, [puzzleTheme, puzzleCols, puzzleRows, boardWidth, boardHeight, puzzlePiecesData.length, dispatch])

  useEffect(() => {
    pieceDataMapRef.current.clear()
    puzzlePiecesData.forEach((p) => pieceDataMapRef.current.set(p.id, p))
  }, [puzzlePiecesData])

  const playSound = useCallback((type: 'ping' | 'buzzer') => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }
      const ctx = audioCtxRef.current
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)

      if (type === 'ping') {
        osc.type = 'sine'
        osc.frequency.setValueAtTime(1200, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.3)
        gain.gain.setValueAtTime(0.12, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.4)
      } else {
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(180, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.2)
        gain.gain.setValueAtTime(0.08, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.25)
      }
    } catch (_e) { /* audio unavailable */ }
  }, [])

  useEffect(() => {
    const onPlaced = (msg: any) => {
      const { pieceId, x, y, playerId } = msg
      animsRef.current.set(pieceId, {
        type: 'snap',
        startX: x, startY: y,
        endX: x, endY: y,
        startTime: performance.now(),
      })
      if (playerId === currentPlayerId) playSound('ping')
    }
    const onRejected = (msg: any) => {
      const { pieceId, originalX, originalY } = msg
      const piece = pieces.find((p) => p.id === pieceId)
      if (piece) {
        animsRef.current.set(pieceId, {
          type: 'shake',
          startX: piece.currentX, startY: piece.currentY,
          endX: originalX, endY: originalY,
          startTime: performance.now(),
        })
      }
      if (piece?.ownerId === currentPlayerId) playSound('buzzer')
    }
    const u1 = socketService.on('piecePlaced', onPlaced)
    const u2 = socketService.on('pieceRejected', onRejected)
    return () => { u1(); u2() }
  }, [pieces, currentPlayerId, playSound])

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const resize = () => {
      const cw = container.clientWidth
      const ch = container.clientHeight
      const boardAspect = boardWidth / boardHeight
      const containerAspect = cw / ch
      const s = containerAspect > boardAspect
        ? ch / boardHeight
        : cw / boardWidth
      const finalScale = Math.min(s, 1.5)
      const rw = boardWidth * finalScale
      const rh = boardHeight * finalScale

      setScale(finalScale)
      setOffsetX((cw - rw) / 2)
      setOffsetY((ch - rh) / 2)

      const dpr = window.devicePixelRatio || 1
      canvas.width = cw * dpr
      canvas.height = ch * dpr
      canvas.style.width = cw + 'px'
      canvas.style.height = ch + 'px'
    }

    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [boardWidth, boardHeight])

  const clientToBoard = useCallback((clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return null
    const x = (clientX - rect.left - offsetX) / scale
    const y = (clientY - rect.top - offsetY) / scale
    return { x, y }
  }, [offsetX, offsetY, scale])

  const hitTest = useCallback((boardX: number, boardY: number): string | null => {
    const myPieces = pieces
      .filter((p) => p.ownerId === currentPlayerId && !p.placed)
      .sort((a, b) => b.index - a.index)

    for (const piece of myPieces) {
      const pd = pieceDataMapRef.current.get(piece.id)
      if (!pd) continue
      const padding = pd.tabSize + 4
      const px = piece.currentX * pd.width - padding
      const py = piece.currentY * pd.height - padding
      const pw = pd.width + padding * 2
      const ph = pd.height + padding * 2

      if (boardX >= px && boardX <= px + pw && boardY >= py && boardY <= py + ph) {
        return piece.id
      }
    }
    return null
  }, [pieces, currentPlayerId])

  const startDrag = useCallback((clientX: number, clientY: number) => {
    if (gamePhase !== 'playing' || !currentPlayerId) return
    const pos = clientToBoard(clientX, clientY)
    if (!pos) return

    const pieceId = hitTest(pos.x, pos.y)
    if (!pieceId) return

    const piece = pieces.find((p) => p.id === pieceId)
    if (!piece || piece.ownerId !== currentPlayerId) return

    dragRef.current = {
      active: true,
      pieceId,
      startClientX: clientX,
      startClientY: clientY,
      pieceStartX: piece.currentX,
      pieceStartY: piece.currentY,
      lastEmit: 0,
    }
  }, [gamePhase, currentPlayerId, clientToBoard, hitTest, pieces])

  const moveDrag = useCallback((clientX: number, clientY: number) => {
    const drag = dragRef.current
    if (!drag.active || !drag.pieceId) return

    const dxPx = clientX - drag.startClientX
    const dyPx = clientY - drag.startClientY
    const dxBoard = dxPx / scale
    const dyBoard = dyPx / scale

    const pd = pieceDataMapRef.current.get(drag.pieceId)
    if (!pd) return

    const newX = Math.max(-0.5, Math.min(puzzleCols - 0.5, drag.pieceStartX + dxBoard / pd.width))
    const newY = Math.max(-0.5, Math.min(puzzleRows - 0.5, drag.pieceStartY + dyBoard / pd.height))

    dispatch({ type: 'UPDATE_PIECE', payload: { id: drag.pieceId, x: newX, y: newY } })

    const now = performance.now()
    if (now - drag.lastEmit > 30) {
      socketService.movePiece(drag.pieceId, newX, newY)
      drag.lastEmit = now
    }
  }, [scale, puzzleCols, puzzleRows, dispatch])

  const endDrag = useCallback(() => {
    const drag = dragRef.current
    if (!drag.active || !drag.pieceId) return

    const piece = pieces.find((p) => p.id === drag.pieceId)
    if (piece && piece.ownerId === currentPlayerId) {
      socketService.placePiece(drag.pieceId, piece.currentX, piece.currentY)
    }

    dragRef.current = {
      active: false, pieceId: null,
      startClientX: 0, startClientY: 0,
      pieceStartX: 0, pieceStartY: 0, lastEmit: 0,
    }
  }, [pieces, currentPlayerId])

  useEffect(() => {
    const onMM = (e: MouseEvent) => moveDrag(e.clientX, e.clientY)
    const onMU = () => endDrag()
    document.addEventListener('mousemove', onMM)
    document.addEventListener('mouseup', onMU)
    return () => {
      document.removeEventListener('mousemove', onMM)
      document.removeEventListener('mouseup', onMU)
    }
  }, [moveDrag, endDrag])

  useEffect(() => {
    const onTM = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        e.preventDefault()
        moveDrag(e.touches[0].clientX, e.touches[0].clientY)
      }
    }
    const onTE = (e: TouchEvent) => {
      e.preventDefault()
      endDrag()
    }
    document.addEventListener('touchmove', onTM, { passive: false })
    document.addEventListener('touchend', onTE, { passive: false })
    document.addEventListener('touchcancel', onTE, { passive: false })
    return () => {
      document.removeEventListener('touchmove', onTM)
      document.removeEventListener('touchend', onTE)
      document.removeEventListener('touchcancel', onTE)
    }
  }, [moveDrag, endDrag])

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    startDrag(e.clientX, e.clientY)
  }, [startDrag])

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      e.preventDefault()
      startDrag(e.touches[0].clientX, e.touches[0].clientY)
    }
  }, [startDrag])

  const isAdjacentToOwned = useCallback((pieceIndex: number): boolean => {
    if (!currentPlayerId) return false
    return getAdjacentPieceIndices(pieceIndex, puzzleCols, puzzleRows).some((idx) => {
      const adj = pieces.find((p) => p.index === idx)
      return adj?.ownerId === currentPlayerId
    })
  }, [currentPlayerId, puzzleCols, puzzleRows, pieces])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const render = () => {
      const dpr = window.devicePixelRatio || 1
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr)

      ctx.save()
      ctx.translate(offsetX, offsetY)
      ctx.scale(scale, scale)

      ctx.fillStyle = '#f3f4f6'
      ctx.fillRect(0, 0, boardWidth, boardHeight)

      const sorted = [...pieces].sort((a, b) => {
        if (a.placed && !b.placed) return -1
        if (!a.placed && b.placed) return 1
        return a.index - b.index
      })

      const drag = dragRef.current
      const now = performance.now()

      for (const piece of sorted) {
        const pd = pieceDataMapRef.current.get(piece.id)
        if (!pd || !pd.canvas) continue

        const isDraggingPiece = drag.active && drag.pieceId === piece.id
        const anim = animsRef.current.get(piece.id)

        let drawX = piece.currentX * pd.width
        let drawY = piece.currentY * pd.height
        let brightnessBoost = false

        if (anim) {
          const snapDur = 400
          const shakeDur = 200

          if (anim.type === 'snap') {
            const progress = Math.min(1, (now - anim.startTime) / snapDur)
            const eased = easeOutCubic(progress)
            drawX = anim.startX * pd.width + (anim.endX * pd.width - anim.startX * pd.width) * eased
            drawY = anim.startY * pd.height + (anim.endY * pd.height - anim.startY * pd.height) * eased
            if (progress > 0.1) brightnessBoost = true
            if (progress >= 1) animsRef.current.delete(piece.id)
          } else {
            const progress = Math.min(1, (now - anim.startTime) / shakeDur)
            const pxShake = shakeOffset(progress)
            drawX += pxShake
            drawY = anim.startY * pd.height + (anim.endY * pd.height - anim.startY * pd.height) * progress
            if (progress >= 1) animsRef.current.delete(piece.id)
          }
        }

        if (piece.placed) brightnessBoost = true

        const isMine = piece.ownerId === currentPlayerId
        const adjacentToMine = !isMine && isAdjacentToOwned(piece.index)

        let alpha = 1
        if (piece.placed) {
          alpha = 1
        } else if (isMine) {
          alpha = 1
        } else if (adjacentToMine) {
          alpha = 0.3
        } else if (piece.ownerId === null) {
          alpha = 0
        } else {
          alpha = 0.3
        }

        if (alpha <= 0) continue

        const padding = pd.tabSize + 4
        const pxOffset = drawX - padding
        const pyOffset = drawY - padding

        ctx.save()
        ctx.globalAlpha = alpha

        if (brightnessBoost) {
          ctx.filter = 'brightness(1.2)'
        }

        ctx.drawImage(pd.canvas, pxOffset, pyOffset)

        if (isDraggingPiece) {
          ctx.globalAlpha = 0.35
          ctx.filter = 'none'
          const strokePad = padding
          ctx.strokeStyle = '#6366f1'
          ctx.lineWidth = 2 / scale
          ctx.setLineDash([6 / scale, 4 / scale])
          ctx.strokeRect(
            pxOffset + strokePad, pyOffset + strokePad,
            pd.width, pd.height
          )
          ctx.setLineDash([])
        }

        ctx.restore()
      }

      ctx.strokeStyle = '#9ca3af'
      ctx.lineWidth = 2
      ctx.strokeRect(0, 0, boardWidth, boardHeight)

      ctx.restore()
      rafRef.current = requestAnimationFrame(render)
    }

    rafRef.current = requestAnimationFrame(render)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [pieces, offsetX, offsetY, scale, boardWidth, boardHeight, currentPlayerId, isAdjacentToOwned])

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
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        style={{
          cursor: dragRef.current.active ? 'grabbing' : 'grab',
          touchAction: 'none',
        }}
      />
    </div>
  )
}

export default PuzzleBoard
