import React, { useState, useEffect } from 'react'
import { useGameStore } from '@/game/gameStore'
import { generateAvatar } from '@/game/pieceUtils'
import { socketService } from '@/network/socketService'

interface RoomInfo {
  id: string
  name: string
  host: string
  players: number
  maxPlayers: number
  puzzleSize: number
  status: 'waiting' | 'playing' | 'full'
}

export const RoomList: React.FC<{ onEnterGame: () => void }> = ({ onEnterGame }) => {
  const [playerName, setPlayerName] = useState('')
  const [roomIdInput, setRoomIdInput] = useState('')
  const [puzzleSize, setPuzzleSize] = useState(4)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create')

  const { setCurrentPlayer, setRoomId, setPuzzleSize: setStorePuzzleSize } = useGameStore()

  useEffect(() => {
    const savedName = localStorage.getItem('puzzle_player_name')
    if (savedName) {
      setPlayerName(savedName)
    }
  }, [])

  const handleCreateRoom = async () => {
    if (!playerName.trim()) {
      setError('请输入你的昵称')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      localStorage.setItem('puzzle_player_name', playerName.trim())

      await socketService.connect()
      const newRoomId = await socketService.createRoom(playerName.trim(), puzzleSize)

      setStorePuzzleSize(puzzleSize)
      setRoomId(newRoomId)

      const player = {
        id: socketService.getPlayerId(),
        name: playerName.trim(),
        avatarData: generateAvatar(playerName.trim()),
        color: '#c084fc',
        cursorX: 0,
        cursorY: 0
      }
      setCurrentPlayer(player)

      setTimeout(() => {
        onEnterGame()
      }, 500)
    } catch (err) {
      setError('创建房间失败，请重试')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleJoinRoom = async () => {
    if (!playerName.trim()) {
      setError('请输入你的昵称')
      return
    }

    if (!roomIdInput.trim()) {
      setError('请输入房间号')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      localStorage.setItem('puzzle_player_name', playerName.trim())

      await socketService.connect()
      await socketService.joinRoom(roomIdInput.trim().toUpperCase(), playerName.trim(), puzzleSize)

      setStorePuzzleSize(puzzleSize)
      setRoomId(roomIdInput.trim().toUpperCase())

      const player = {
        id: socketService.getPlayerId(),
        name: playerName.trim(),
        avatarData: generateAvatar(playerName.trim()),
        color: '#06b6d4',
        cursorX: 0,
        cursorY: 0
      }
      setCurrentPlayer(player)

      setTimeout(() => {
        onEnterGame()
      }, 500)
    } catch (err) {
      setError((err as Error).message || '加入房间失败，请重试')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const mockRooms: RoomInfo[] = [
    { id: 'ABC123', name: '快乐拼图房', host: '小明', players: 2, maxPlayers: 4, puzzleSize: 4, status: 'waiting' },
    { id: 'DEF456', name: '高手挑战区', host: '拼图达人', players: 3, maxPlayers: 4, puzzleSize: 5, status: 'waiting' },
    { id: 'GHI789', name: '休闲娱乐', host: '玩家A', players: 4, maxPlayers: 4, puzzleSize: 6, status: 'full' }
  ]

  return (
    <div className="room-list-container">
      <div className="room-list-content">
        <div className="logo-section">
          <h1 className="game-title">🧩 协作拼图</h1>
          <p className="game-subtitle">实时多人协作拼图游戏</p>
        </div>

        <div className="main-panel">
          <div className="form-section">
            <div className="tab-buttons">
              <button
                className={`tab-btn ${activeTab === 'create' ? 'active' : ''}`}
                onClick={() => setActiveTab('create')}
              >
                创建房间
              </button>
              <button
                className={`tab-btn ${activeTab === 'join' ? 'active' : ''}`}
                onClick={() => setActiveTab('join')}
              >
                加入房间
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">你的昵称</label>
              <input
                type="text"
                className="form-input"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="请输入你的昵称"
                maxLength={12}
              />
            </div>

            <div className="form-group">
              <label className="form-label">拼图大小</label>
              <div className="size-options">
                {[4, 5, 6].map((size) => (
                  <button
                    key={size}
                    className={`size-btn ${puzzleSize === size ? 'active' : ''}`}
                    onClick={() => setPuzzleSize(size)}
                  >
                    {size}×{size}
                  </button>
                ))}
              </div>
            </div>

            {activeTab === 'join' && (
              <div className="form-group">
                <label className="form-label">房间号</label>
                <input
                  type="text"
                  className="form-input room-id-input"
                  value={roomIdInput}
                  onChange={(e) => setRoomIdInput(e.target.value.toUpperCase())}
                  placeholder="输入6位房间号"
                  maxLength={6}
                  style={{ textTransform: 'uppercase', letterSpacing: '4px', fontFamily: 'monospace' }}
                />
              </div>
            )}

            {error && <div className="error-message">{error}</div>}

            <button
              className="action-btn"
              onClick={activeTab === 'create' ? handleCreateRoom : handleJoinRoom}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="loading-spinner">⏳</span>
              ) : (
                activeTab === 'create' ? '创建房间' : '加入房间'
              )}
            </button>
          </div>

          <div className="rooms-section">
            <h3 className="section-title">🔥 热门房间</h3>
            <div className="rooms-list">
              {mockRooms.map((room) => (
                <div key={room.id} className="room-card" onClick={() => setRoomIdInput(room.id)}>
                  <div className="room-card-header">
                    <span className="room-name">{room.name}</span>
                    <span className={`room-status ${room.status}`}>
                      {room.status === 'waiting' ? '等待中' : room.status === 'playing' ? '游戏中' : '已满'}
                    </span>
                  </div>
                  <div className="room-card-info">
                    <div className="info-item">
                      <span className="info-label">房间号:</span>
                      <span className="info-value room-id">{room.id}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">房主:</span>
                      <span className="info-value">{room.host}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">大小:</span>
                      <span className="info-value">{room.puzzleSize}×{room.puzzleSize}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">人数:</span>
                      <span className="info-value">
                        <span className={room.players >= room.maxPlayers ? 'full' : ''}>
                          {room.players}
                        </span>
                        /{room.maxPlayers}
                      </span>
                    </div>
                  </div>
                  <div className="room-card-footer">
                    <button
                      className="quick-join-btn"
                      disabled={room.status === 'full' || room.status === 'playing'}
                      onClick={(e) => {
                        e.stopPropagation()
                        setRoomIdInput(room.id)
                        setActiveTab('join')
                      }}
                    >
                      {room.status === 'full' ? '已满' : room.status === 'playing' ? '游戏中' : '快速加入'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="features-section">
          <div className="feature-item">
            <span className="feature-icon">🎮</span>
            <h4>实时协作</h4>
            <p>最多4人同时拼图，实时同步进度</p>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🎨</span>
            <h4>赛博朋克</h4>
            <p>霓虹视觉效果，沉浸式游戏体验</p>
          </div>
          <div className="feature-item">
            <span className="feature-icon">📱</span>
            <h4>多端支持</h4>
            <p>支持鼠标和触摸操作，响应式布局</p>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🎬</span>
            <h4>过程回放</h4>
            <p>记录每一步操作，支持完整回放</p>
          </div>
        </div>
      </div>

      <style>{`
        .room-list-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%);
          display: flex;
          justify-content: center;
          align-items: flex-start;
          padding: 40px 20px;
          overflow-y: auto;
        }

        .room-list-content {
          width: 100%;
          max-width: 1200px;
          display: flex;
          flex-direction: column;
          gap: 40px;
        }

        .logo-section {
          text-align: center;
        }

        .game-title {
          font-size: 48px;
          font-weight: bold;
          background: linear-gradient(135deg, #c084fc, #06b6d4);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0;
          text-shadow: 0 0 40px rgba(192, 132, 252, 0.5);
        }

        .game-subtitle {
          color: #94a3b8;
          font-size: 18px;
          margin-top: 8px;
        }

        .main-panel {
          display: grid;
          grid-template-columns: 1fr 1.2fr;
          gap: 30px;
        }

        .form-section {
          background: rgba(30, 27, 75, 0.6);
          backdrop-filter: blur(8px);
          border-radius: 16px;
          border: 1px solid rgba(192, 132, 252, 0.3);
          padding: 30px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        .tab-buttons {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
        }

        .tab-btn {
          flex: 1;
          padding: 12px;
          border: none;
          background: rgba(15, 23, 42, 0.6);
          color: #94a3b8;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .tab-btn.active {
          background: linear-gradient(135deg, rgba(192, 132, 252, 0.3), rgba(6, 182, 212, 0.3));
          color: #fff;
          border: 1px solid rgba(192, 132, 252, 0.5);
        }

        .tab-btn:hover:not(.active) {
          background: rgba(192, 132, 252, 0.1);
          color: #c084fc;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-label {
          display: block;
          color: #e2e8f0;
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 8px;
        }

        .form-input {
          width: 100%;
          padding: 12px 16px;
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(192, 132, 252, 0.3);
          border-radius: 8px;
          color: #fff;
          font-size: 16px;
          transition: all 0.2s ease;
          box-sizing: border-box;
        }

        .form-input:focus {
          outline: none;
          border-color: #c084fc;
          box-shadow: 0 0 0 3px rgba(192, 132, 252, 0.2);
        }

        .form-input::placeholder {
          color: #64748b;
        }

        .room-id-input {
          font-size: 20px;
        }

        .size-options {
          display: flex;
          gap: 12px;
        }

        .size-btn {
          flex: 1;
          padding: 12px;
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(192, 132, 252, 0.3);
          border-radius: 8px;
          color: #94a3b8;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .size-btn.active {
          background: linear-gradient(135deg, #c084fc, #a78bfa);
          color: #fff;
          border-color: transparent;
          box-shadow: 0 4px 15px rgba(192, 132, 252, 0.4);
        }

        .size-btn:hover:not(.active) {
          border-color: #c084fc;
          color: #c084fc;
        }

        .error-message {
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid rgba(239, 68, 68, 0.5);
          color: #f87171;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 16px;
          font-size: 14px;
        }

        .action-btn {
          width: 100%;
          padding: 16px;
          background: linear-gradient(135deg, #c084fc, #06b6d4);
          border: none;
          border-radius: 8px;
          color: #fff;
          font-size: 18px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 20px rgba(192, 132, 252, 0.4);
        }

        .action-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 25px rgba(192, 132, 252, 0.6);
          filter: brightness(1.1);
        }

        .action-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .loading-spinner {
          display: inline-block;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .rooms-section {
          background: rgba(30, 27, 75, 0.6);
          backdrop-filter: blur(8px);
          border-radius: 16px;
          border: 1px solid rgba(6, 182, 212, 0.3);
          padding: 30px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        .section-title {
          color: #06b6d4;
          font-size: 20px;
          font-weight: 700;
          margin: 0 0 20px 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .rooms-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-height: 400px;
          overflow-y: auto;
        }

        .rooms-list::-webkit-scrollbar {
          width: 6px;
        }

        .rooms-list::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.5);
          border-radius: 3px;
        }

        .rooms-list::-webkit-scrollbar-thumb {
          background: rgba(192, 132, 252, 0.5);
          border-radius: 3px;
        }

        .room-card {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(192, 132, 252, 0.2);
          border-radius: 12px;
          padding: 16px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .room-card:hover {
          border-color: rgba(192, 132, 252, 0.5);
          transform: translateX(4px);
          box-shadow: 0 4px 15px rgba(192, 132, 252, 0.2);
        }

        .room-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .room-name {
          color: #fff;
          font-weight: 600;
          font-size: 16px;
        }

        .room-status {
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }

        .room-status.waiting {
          background: rgba(34, 197, 94, 0.2);
          color: #4ade80;
        }

        .room-status.playing {
          background: rgba(251, 146, 60, 0.2);
          color: #fb923c;
        }

        .room-status.full {
          background: rgba(239, 68, 68, 0.2);
          color: #f87171;
        }

        .room-card-info {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-bottom: 12px;
        }

        .info-item {
          display: flex;
          gap: 6px;
          font-size: 13px;
        }

        .info-label {
          color: #64748b;
        }

        .info-value {
          color: #e2e8f0;
        }

        .info-value.room-id {
          color: #06b6d4;
          font-family: monospace;
          font-weight: 600;
          letter-spacing: 2px;
        }

        .info-value .full {
          color: #f87171;
        }

        .room-card-footer {
          text-align: right;
        }

        .quick-join-btn {
          padding: 6px 16px;
          background: rgba(6, 182, 212, 0.2);
          border: 1px solid #06b6d4;
          border-radius: 6px;
          color: #06b6d4;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .quick-join-btn:hover:not(:disabled) {
          background: rgba(6, 182, 212, 0.4);
        }

        .quick-join-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .features-section {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }

        .feature-item {
          text-align: center;
          padding: 20px;
          background: rgba(30, 27, 75, 0.4);
          backdrop-filter: blur(8px);
          border-radius: 12px;
          border: 1px solid rgba(192, 132, 252, 0.2);
          transition: all 0.3s ease;
        }

        .feature-item:hover {
          transform: translateY(-4px);
          border-color: rgba(192, 132, 252, 0.5);
          box-shadow: 0 8px 25px rgba(192, 132, 252, 0.2);
        }

        .feature-icon {
          font-size: 36px;
          display: block;
          margin-bottom: 12px;
        }

        .feature-item h4 {
          color: #c084fc;
          font-size: 16px;
          margin: 0 0 8px 0;
        }

        .feature-item p {
          color: #94a3b8;
          font-size: 13px;
          margin: 0;
          line-height: 1.5;
        }

        @media (max-width: 968px) {
          .main-panel {
            grid-template-columns: 1fr;
          }

          .features-section {
            grid-template-columns: repeat(2, 1fr);
          }

          .game-title {
            font-size: 36px;
          }
        }

        @media (max-width: 480px) {
          .features-section {
            grid-template-columns: 1fr;
          }

          .room-list-container {
            padding: 20px 12px;
          }

          .game-title {
            font-size: 28px;
          }
        }
      `}</style>
    </div>
  )
}
