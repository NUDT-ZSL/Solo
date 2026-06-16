import React, { useState, useEffect, useRef, useCallback } from 'react'
import PuzzleGrid from '@components/PuzzleGrid'
import CollabPanel from '@components/CollabPanel'
import CelebrationModal from '@components/CelebrationModal'
import { PuzzleBoard, getCompletionPercentage, getCorrectCount, getTotalPieces, formatTime, getElapsedTime } from '@game/puzzleBoard'
import { User, ChatMessage } from '@game/collaboration'
import './RoomPage.css'

interface RoomPageProps {
  roomId: string
  userName: string
  onBack: () => void
}

const RoomPage: React.FC<RoomPageProps> = ({ roomId, userName, onBack }) => {
  const [board, setBoard] = useState<PuzzleBoard | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [showCelebration, setShowCelebration] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const wsRef = useRef<WebSocket | null>(null)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/ws/${roomId}`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'join',
        userName,
      }))
    }

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)

      switch (data.type) {
        case 'init':
          setCurrentUserId(data.userId)
          setBoard(data.board)
          setUsers(data.users)
          setMessages(data.messages)
          break

        case 'board-updated':
          setBoard(data.board)
          setUsers(data.users)
          break

        case 'puzzle-complete':
          setBoard(data.board)
          setUsers(data.users)
          setShowCelebration(true)
          break

        case 'user-joined':
          setUsers((prev) => [...prev.filter(u => u.id !== data.user.id), data.user])
          break

        case 'user-left':
          setUsers((prev) => prev.filter((u) => u.id !== data.userId))
          break

        case 'user-updated':
          setUsers((prev) =>
            prev.map((u) => (u.id === data.user.id ? data.user : u))
          )
          break

        case 'chat-message':
          setMessages((prev) => [...prev, data.message])
          break
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    return () => {
      ws.close()
    }
  }, [roomId, userName])

  useEffect(() => {
    if (board && board.startTime && !board.isComplete) {
      timerRef.current = window.setInterval(() => {
        setElapsedTime(getElapsedTime(board))
      }, 1000)
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [board])

  useEffect(() => {
    if (board?.isComplete && board.endTime && board.startTime) {
      setElapsedTime(board.endTime - board.startTime)
    }
  }, [board?.isComplete])

  const handleSwap = useCallback(
    (pieceId1: number, pieceId2: number) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'swap-pieces',
            pieceId1,
            pieceId2,
          })
        )
      }
    },
    []
  )

  const handleSendMessage = useCallback(
    (content: string) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'chat-message',
            content,
          })
        )
      }
    },
    []
  )

  const handleCelebrationClose = () => {
    setShowCelebration(false)
  }

  if (!board) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>加载中...</p>
      </div>
    )
  }

  const completionPercent = getCompletionPercentage(board)
  const correctCount = getCorrectCount(board)
  const totalPieces = getTotalPieces(board)

  return (
    <div className="room-page">
      <div className="game-layout">
        <div className="left-sidebar">
          <button className="back-button" onClick={onBack}>
            ← 返回
          </button>
          <div className="info-card">
            <h3 className="info-title">进度</h3>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
            <p className="progress-text">
              {correctCount} / {totalPieces} ({completionPercent}%)
            </p>
          </div>
          <div className="info-card">
            <h3 className="info-title">用时</h3>
            <p className="timer-text">{formatTime(elapsedTime)}</p>
          </div>
        </div>

        <div className="puzzle-area">
          <div className="puzzle-header">
            <h2>拼图挑战</h2>
          </div>
          <PuzzleGrid
            pieces={board.pieces}
            rows={board.rows}
            cols={board.cols}
            onSwap={handleSwap}
            disabled={board.isComplete}
            currentUserId={currentUserId}
          />
        </div>

        <div className="collab-area">
          <CollabPanel
            users={users}
            messages={messages}
            currentUserId={currentUserId}
            onSendMessage={handleSendMessage}
          />
        </div>
      </div>

      <CelebrationModal
        isOpen={showCelebration}
        totalTime={elapsedTime}
        users={users}
        onClose={handleCelebrationClose}
      />
    </div>
  )
}

export default RoomPage
