import React, { useRef, useEffect, useState, useCallback } from 'react'
import { useGameStore } from './gameStore'
import { playSuccessSound, playErrorSound, generateAvatar } from './pieceUtils'
import { socketService } from '@/network/socketService'

interface DragState {
  isDragging: boolean
  pieceId: number | null
  startX: number
  startY: number
  offsetX: number
  offsetY: number
  currentX: number
  currentY: number
  trail: { x: number; y: number; alpha: number }[]
}

const PIECE_SIZE = 100

export const PuzzleBoard: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animationFrameRef = useRef<number>()
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    pieceId: null,
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0,
    currentX: 0,
    currentY: 0,
    trail: []
  })

  const {
    pieces,
    puzzleSize,
    players,
    currentPlayer,
    draggedPieceId,
    shakePieceId,
    showCompletionAnimation,
    particles,
    progress,
    gamePhase,
    setDraggedPiece,
    setShakePiece,
    movePiece,
    updateParticles,
    startReplay,
    stopReplay,
    replayStep,
    isReplaying,
    replayIndex,
    operationLogs,
    roomId
  } = useGameStore()

  const boardWidth = puzzleSize * PIECE_SIZE
  const boardHeight = puzzleSize * PIECE_SIZE

  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.strokeStyle = 'rgba(192, 132, 252, 0.3)'
    ctx.lineWidth = 1
    for (let i = 0; i <= puzzleSize; i++) {
      ctx.beginPath()
      ctx.moveTo(i * PIECE_SIZE, 0)
      ctx.lineTo(i * PIECE_SIZE, boardHeight)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(0, i * PIECE_SIZE)
      ctx.lineTo(boardWidth, i * PIECE_SIZE)
      ctx.stroke()
    }

    const sortedPieces = [...pieces].sort((a, b) => {
      if (a.id === draggedPieceId) return 1
      if (b.id === draggedPieceId) return -1
      if (a.isPlaced && !b.isPlaced) return -1
      if (!a.isPlaced && b.isPlaced) return 1
      return 0
    })

    sortedPieces.forEach((piece) => {
      const isDragged = piece.id === draggedPieceId
      const isShaking = piece.id === shakePieceId
      const isDraggingThis = dragState.isDragging && isDragged

      let x = piece.col * PIECE_SIZE
      let y = piece.row * PIECE_SIZE

      if (isDraggingThis) {
        x = dragState.currentX - dragState.offsetX
        y = dragState.currentY - dragState.offsetY
      }

      if (isShaking) {
        x += (Math.random() - 0.5) * 8
        y += (Math.random() - 0.5) * 8
      }

      if (isDraggingThis && dragState.trail.length > 0) {
        for (let i = 0; i < dragState.trail.length; i++) {
          const t = dragState.trail[i]
          ctx.globalAlpha = t.alpha * 0.5
          ctx.save()
          ctx.shadowColor = '#c084fc'
          ctx.shadowBlur = 20
          const img = new window.Image()
          img.src = piece.patternData
          ctx.drawImage(
            img,
            t.x - dragState.offsetX,
            t.y - dragState.offsetY,
            PIECE_SIZE,
            PIECE_SIZE
          )
          ctx.restore()
        }
        ctx.globalAlpha = 1
      }

      ctx.save()

      if (isDragged || piece.isPlaced) {
        ctx.shadowColor = piece.isPlaced ? '#06b6d4' : '#c084fc'
        ctx.shadowBlur = isDragged ? 25 : 15
      }

      const img = new window.Image()
      img.src = piece.patternData
      ctx.drawImage(img, x, y, PIECE_SIZE, PIECE_SIZE)

      if (piece.isPlaced) {
        ctx.strokeStyle = '#06b6d4'
        ctx.lineWidth = 3
        ctx.strokeRect(x + 2, y + 2, PIECE_SIZE - 4, PIECE_SIZE - 4)
      } else if (isDragged) {
        ctx.strokeStyle = '#c084fc'
        ctx.lineWidth = 3
        ctx.setLineDash([5, 5])
        ctx.strokeRect(x + 2, y + 2, PIECE_SIZE - 4, PIECE_SIZE - 4)
        ctx.setLineDash([])
      }

      ctx.restore()
    })

    if (showCompletionAnimation) {
      const centerX = boardWidth / 2
      const centerY = boardHeight / 2
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 300)
      gradient.addColorStop(0, 'rgba(192, 132, 252, 0.3)')
      gradient.addColorStop(0.5, 'rgba(6, 182, 212, 0.2)')
      gradient.addColorStop(1, 'transparent')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }

    particles.forEach((p) => {
      ctx.save()
      ctx.globalAlpha = p.life
      ctx.shadowColor = p.color
      ctx.shadowBlur = 10
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    })

    players.forEach((player) => {
      if (player.id === currentPlayer?.id) return
      if (player.cursorX === 0 && player.cursorY === 0) return

      ctx.save()
      ctx.shadowColor = player.color
      ctx.shadowBlur = 10
      ctx.fillStyle = player.color
      ctx.beginPath()
      ctx.moveTo(player.cursorX, player.cursorY)
      ctx.lineTo(player.cursorX + 15, player.cursorY + 5)
      ctx.lineTo(player.cursorX + 8, player.cursorY + 12)
      ctx.lineTo(player.cursorX + 12, player.cursorY + 20)
      ctx.lineTo(player.cursorX + 5, player.cursorY + 16)
      ctx.lineTo(player.cursorX, player.cursorY + 20)
      ctx.closePath()
      ctx.fill()

      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)'
      ctx.fillRect(player.cursorX + 18, player.cursorY - 5, 80, 24)
      ctx.strokeStyle = player.color
      ctx.lineWidth = 1
      ctx.strokeRect(player.cursorX + 18, player.cursorY - 5, 80, 24)
      ctx.fillStyle = '#fff'
      ctx.font = '12px Arial'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(player.name, player.cursorX + 24, player.cursorY + 7)
      ctx.restore()
    })

    animationFrameRef.current = requestAnimationFrame(render)
  }, [pieces, puzzleSize, players, currentPlayer, draggedPieceId, shakePieceId, showCompletionAnimation, particles, dragState])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const loadImages = async () => {
      for (const piece of pieces) {
        const img = new window.Image()
        img.src = piece.patternData
        await new Promise<void>((resolve) => {
          img.onload = () => resolve()
        })
      }
    }
    loadImages()
  }, [pieces])

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(render)
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [render])

  useEffect(() => {
    if (particles.length > 0) {
      const interval = setInterval(() => {
        updateParticles()
      }, 16)
      return () => clearInterval(interval)
    }
  }, [particles.length, updateParticles])

  useEffect(() => {
    if (isReplaying) {
      const interval = setInterval(() => {
        replayStep()
      }, 500)
      return () => clearInterval(interval)
    }
  }, [isReplaying, replayStep])

  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    let clientX: number, clientY: number
    if ('touches' in e) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    }
  }

  const findPieceAt = (x: number, y: number) => {
    for (let i = pieces.length - 1; i >= 0; i--) {
      const piece = pieces[i]
      if (piece.isPlaced) continue

      const px = piece.col * PIECE_SIZE
      const py = piece.row * PIECE_SIZE

      if (x >= px && x < px + PIECE_SIZE && y >= py && y < py + PIECE_SIZE) {
        return piece
      }
    }
    return null
  }

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (gamePhase !== 'playing' || isReplaying) return

    const { x, y } = getCanvasCoords(e)
    const piece = findPieceAt(x, y)

    if (!piece) return

    setDraggedPiece(piece.id)
    setDragState({
      isDragging: true,
      pieceId: piece.id,
      startX: x,
      startY: y,
      offsetX: x - piece.col * PIECE_SIZE,
      offsetY: y - piece.row * PIECE_SIZE,
      currentX: x,
      currentY: y,
      trail: []
    })
  }

  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!dragState.isDragging || dragState.pieceId === null) return

    const { x, y } = getCanvasCoords(e)

    setDragState((prev) => ({
      ...prev,
      currentX: x,
      currentY: y,
      trail: [
        { x, y, alpha: 1 },
        ...prev.trail.map((t) => ({ ...t, alpha: t.alpha * 0.85 })).slice(0, 8)
      ]
    }))

    socketService.sendCursorUpdate(x, y)
  }

  const handleDragEnd = () => {
    if (!dragState.isDragging || dragState.pieceId === null) return

    const piece = pieces.find((p) => p.id === dragState.pieceId)
    if (!piece) {
      setDraggedPiece(null)
      setDragState((prev) => ({ ...prev, isDragging: false, pieceId: null, trail: [] }))
      return
    }

    const dropX = dragState.currentX - dragState.offsetX + PIECE_SIZE / 2
    const dropY = dragState.currentY - dragState.offsetY + PIECE_SIZE / 2

    const targetCol = Math.floor(dropX / PIECE_SIZE)
    const targetRow = Math.floor(dropY / PIECE_SIZE)

    const fromRow = piece.row
    const fromCol = piece.col

    if (
      targetRow < 0 ||
      targetRow >= puzzleSize ||
      targetCol < 0 ||
      targetCol >= puzzleSize
    ) {
      setShakePiece(piece.id)
      playErrorSound()
      setTimeout(() => setShakePiece(null), 100)
      setDraggedPiece(null)
      setDragState((prev) => ({ ...prev, isDragging: false, pieceId: null, trail: [] }))
      return
    }

    const success = movePiece(piece.id, targetRow, targetCol, currentPlayer?.id || '')

    if (success) {
      playSuccessSound()
    } else {
      setShakePiece(piece.id)
      playErrorSound()
      setTimeout(() => setShakePiece(null), 100)
    }

    socketService.sendMove(piece.id, fromRow, fromCol, targetRow, targetCol, success)

    setDraggedPiece(null)
    setDragState((prev) => ({ ...prev, isDragging: false, pieceId: null, trail: [] }))
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragState.isDragging) {
      const { x, y } = getCanvasCoords(e)
      socketService.sendCursorUpdate(x, y)
    }
  }

  return (
    <div className="puzzle-container" ref={containerRef}>
      <div className="game-header">
        <div className="room-info">
          <span className="room-label">房间号:</span>
          <span className="room-id">{roomId}</span>
        </div>
        <div className="progress-bar">
          <div className="progress-label">完成进度</div>
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="progress-text">{progress.toFixed(0)}%</span>
        </div>
        <div className="players-panel">
          {players.map((player) => (
            <div key={player.id} className="player-item">
              <img
                src={player.avatarData || generateAvatar(player.name)}
                alt={player.name}
                className="player-avatar"
              />
              <span className="player-name" style={{ color: player.color }}>
                {player.name}
                {player.id === currentPlayer?.id && ' (你)'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="canvas-wrapper">
        <canvas
          ref={canvasRef}
          width={boardWidth}
          height={boardHeight}
          onMouseDown={handleDragStart}
          onMouseMove={(e) => {
            handleDragMove(e)
            handleMouseMove(e)
          }}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
          onTouchStart={handleDragStart}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
          style={{ cursor: dragState.isDragging ? 'grabbing' : 'grab' }}
        />
      </div>

      {gamePhase === 'countdown' && (
        <div className="countdown-overlay">
          <div className="countdown-content">
            <h2>游戏即将开始</h2>
            <div className="countdown-number">
              {useGameStore.getState().countdown}
            </div>
            <p>准备好你的拼图策略！</p>
          </div>
        </div>
      )}

      {gamePhase === 'completed' && !isReplaying && (
        <div className="completion-overlay">
          <div className="completion-content">
            <h2 className="completion-title">🎉 拼图完成！</h2>
            <p className="completion-stats">
              总操作次数: {operationLogs.length} 步
            </p>
            <div className="completion-actions">
              <button className="btn btn-primary" onClick={startReplay}>
                回放过程
              </button>
              <button className="btn btn-secondary" onClick={stopReplay}>
                返回大厅
              </button>
            </div>
          </div>
        </div>
      )}

      {isReplaying && (
        <div className="replay-indicator">
          <span>回放中: {replayIndex} / {operationLogs.length}</span>
          <button className="btn btn-small" onClick={stopReplay}>
            停止回放
          </button>
        </div>
      )}

      <style>{`
        .puzzle-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          padding: 20px;
        }

        .game-header {
          width: 100%;
          max-width: 900px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          padding: 16px 24px;
          background: rgba(30, 27, 75, 0.6);
          backdrop-filter: blur(8px);
          border-radius: 12px;
          border: 1px solid rgba(192, 132, 252, 0.3);
        }

        .room-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .room-label {
          color: #94a3b8;
          font-size: 14px;
        }

        .room-id {
          color: #06b6d4;
          font-size: 18px;
          font-weight: bold;
          font-family: monospace;
          letter-spacing: 2px;
        }

        .progress-bar {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .progress-label {
          color: #94a3b8;
          font-size: 14px;
          white-space: nowrap;
        }

        .progress-track {
          flex: 1;
          height: 8px;
          background: rgba(15, 23, 42, 0.8);
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #c084fc, #06b6d4);
          border-radius: 4px;
          transition: width 0.3s ease;
          box-shadow: 0 0 10px rgba(192, 132, 252, 0.5);
        }

        .progress-text {
          color: #06b6d4;
          font-size: 14px;
          font-weight: bold;
          min-width: 45px;
        }

        .players-panel {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .player-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .player-avatar {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 2px solid currentColor;
        }

        .player-name {
          font-size: 12px;
          font-weight: 500;
        }

        .canvas-wrapper {
          width: 70%;
          max-width: 800px;
          aspect-ratio: 1;
          display: flex;
          justify-content: center;
          align-items: center;
          background: rgba(15, 23, 42, 0.9);
          border-radius: 16px;
          border: 2px solid rgba(192, 132, 252, 0.4);
          box-shadow: 0 0 40px rgba(192, 132, 252, 0.2);
          padding: 20px;
        }

        canvas {
          max-width: 100%;
          max-height: 100%;
          border-radius: 8px;
          touch-action: none;
        }

        .countdown-overlay,
        .completion-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.9);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 100;
          backdrop-filter: blur(4px);
        }

        .countdown-content,
        .completion-content {
          text-align: center;
          padding: 40px 60px;
          background: rgba(30, 27, 75, 0.8);
          border-radius: 20px;
          border: 2px solid rgba(192, 132, 252, 0.5);
          box-shadow: 0 0 60px rgba(192, 132, 252, 0.3);
        }

        .countdown-content h2,
        .completion-title {
          color: #c084fc;
          font-size: 32px;
          margin-bottom: 20px;
          text-shadow: 0 0 20px rgba(192, 132, 252, 0.8);
        }

        .countdown-number {
          font-size: 120px;
          font-weight: bold;
          color: #06b6d4;
          text-shadow: 0 0 40px rgba(6, 182, 212, 0.8);
          margin: 20px 0;
          animation: pulse 1s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        .countdown-content p,
        .completion-stats {
          color: #94a3b8;
          font-size: 18px;
        }

        .completion-actions {
          display: flex;
          gap: 16px;
          justify-content: center;
          margin-top: 24px;
        }

        .btn {
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-primary {
          background: linear-gradient(135deg, #c084fc, #a78bfa);
          color: white;
          box-shadow: 0 4px 15px rgba(192, 132, 252, 0.4);
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(192, 132, 252, 0.6);
          filter: brightness(1.1);
        }

        .btn-secondary {
          background: rgba(6, 182, 212, 0.2);
          color: #06b6d4;
          border: 1px solid #06b6d4;
        }

        .btn-secondary:hover {
          background: rgba(6, 182, 212, 0.3);
          filter: brightness(1.2);
        }

        .btn-small {
          padding: 6px 12px;
          font-size: 12px;
        }

        .replay-indicator {
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(30, 27, 75, 0.9);
          padding: 12px 24px;
          border-radius: 8px;
          border: 1px solid #06b6d4;
          color: #06b6d4;
          display: flex;
          align-items: center;
          gap: 16px;
          z-index: 101;
        }

        @media (max-width: 768px) {
          .game-header {
            flex-direction: column;
            align-items: stretch;
          }

          .canvas-wrapper {
            width: 95%;
          }

          .countdown-content,
          .completion-content {
            padding: 20px 30px;
          }

          .countdown-number {
            font-size: 80px;
          }
        }
      `}</style>
    </div>
  )
}
