import React, { useState, useEffect } from 'react'
import { RoomList } from './room/RoomList'
import { PuzzleBoard } from './game/PuzzleBoard'
import { useGameStore } from './game/gameStore'
import { socketService } from './network/socketService'

type AppView = 'lobby' | 'game'

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('lobby')
  const { resetGame } = useGameStore()

  useEffect(() => {
    return () => {
      socketService.disconnect()
    }
  }, [])

  const handleEnterGame = () => {
    setView('game')
  }

  const handleBackToLobby = () => {
    resetGame()
    socketService.leaveRoom()
    setView('lobby')
  }

  return (
    <div className="app-container">
      {view === 'lobby' && <RoomList onEnterGame={handleEnterGame} />}
      {view === 'game' && (
        <div className="game-view">
          <button className="back-btn" onClick={handleBackToLobby}>
            ← 返回大厅
          </button>
          <PuzzleBoard />
        </div>
      )}

      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          background: #0f172a;
          color: #e2e8f0;
          min-height: 100vh;
          overflow-x: hidden;
        }

        .app-container {
          min-height: 100vh;
        }

        .game-view {
          min-height: 100vh;
          background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%);
          position: relative;
        }

        .back-btn {
          position: fixed;
          top: 20px;
          left: 20px;
          padding: 10px 20px;
          background: rgba(30, 27, 75, 0.8);
          border: 1px solid rgba(192, 132, 252, 0.4);
          border-radius: 8px;
          color: #c084fc;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          z-index: 50;
          backdrop-filter: blur(8px);
        }

        .back-btn:hover {
          background: rgba(192, 132, 252, 0.2);
          border-color: #c084fc;
          transform: translateX(-2px);
        }

        #root {
          min-height: 100vh;
        }

        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        ::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.5);
        }

        ::-webkit-scrollbar-thumb {
          background: rgba(192, 132, 252, 0.5);
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: rgba(192, 132, 252, 0.7);
        }

        @media (max-width: 768px) {
          .back-btn {
            top: 10px;
            left: 10px;
            padding: 8px 16px;
            font-size: 13px;
          }
        }
      `}</style>
    </div>
  )
}

export default App
