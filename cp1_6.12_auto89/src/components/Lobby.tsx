import { useState } from 'react'
import type { RoomInfo } from '../App'

interface LobbyProps {
  connected: boolean
  roomInfo: RoomInfo | null
  playerId: string | null
  onCreateRoom: (nickname: string) => void
  onJoinRoom: (roomId: string, nickname: string) => void
  onLeaveRoom: () => void
  onSetReady: (ready: boolean) => void
  onUpdateConfig: (config: any) => void
  onStartGame: () => void
}

export default function Lobby({
  connected,
  roomInfo,
  playerId,
  onCreateRoom,
  onJoinRoom,
  onLeaveRoom,
  onSetReady,
  onUpdateConfig,
  onStartGame,
}: LobbyProps) {
  const [nicknameInput, setNicknameInput] = useState('')
  const [roomIdInput, setRoomIdInput] = useState('')
  const [isReady, setIsReady] = useState(false)

  const handleCreateRoom = () => {
    if (!nicknameInput.trim()) return
    onCreateRoom(nicknameInput.trim())
  }

  const handleJoinRoom = () => {
    if (!nicknameInput.trim() || !roomIdInput.trim()) return
    onJoinRoom(roomIdInput.trim(), nicknameInput.trim())
  }

  const handleToggleReady = () => {
    const newReady = !isReady
    setIsReady(newReady)
    onSetReady(newReady)
  }

  const isHost = roomInfo?.hostId === playerId
  const allReady = roomInfo?.players.every((p) => p.ready) && (roomInfo?.players.length || 0) >= 2

  if (!roomInfo) {
    return (
      <div className="lobby">
        <div className="lobby-header">
          <h1 className="game-title">贪吃蛇 MOBA</h1>
          <p className="game-subtitle">多人竞技 · 技能对战</p>
          <div className={`connection-status ${connected ? 'connected' : 'disconnected'}`}>
            {connected ? '● 已连接' : '● 连接中...'}
          </div>
        </div>

        <div className="lobby-forms">
          <div className="form-card">
            <h2>创建房间</h2>
            <div className="form-group">
              <label>昵称</label>
              <input
                type="text"
                placeholder="输入你的昵称"
                value={nicknameInput}
                onChange={(e) => setNicknameInput(e.target.value)}
                maxLength={12}
              />
            </div>
            <button className="btn btn-primary" onClick={handleCreateRoom}>
              创建房间
            </button>
          </div>

          <div className="divider">或</div>

          <div className="form-card">
            <h2>加入房间</h2>
            <div className="form-group">
              <label>昵称</label>
              <input
                type="text"
                placeholder="输入你的昵称"
                value={nicknameInput}
                onChange={(e) => setNicknameInput(e.target.value)}
                maxLength={12}
              />
            </div>
            <div className="form-group">
              <label>房间号</label>
              <input
                type="text"
                placeholder="输入房间号"
                value={roomIdInput}
                onChange={(e) => setRoomIdInput(e.target.value.toUpperCase())}
                maxLength={6}
                style={{ textTransform: 'uppercase', letterSpacing: '4px' }}
              />
            </div>
            <button className="btn btn-secondary" onClick={handleJoinRoom}>
              加入房间
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="lobby">
      <div className="room-container">
        <div className="room-header">
          <h1 className="game-title">贪吃蛇 MOBA</h1>
          <div className="room-id-badge">
            房间号: <span className="room-id">{roomInfo.id}</span>
          </div>
        </div>

        <div className="room-content">
          <div className="players-panel">
            <h3>玩家列表 ({roomInfo.players.length}/{roomInfo.config.maxPlayers})</h3>
            <div className="player-list">
              {roomInfo.players.map((player) => (
                <div key={player.id} className="player-item">
                  <div
                    className="player-avatar"
                    style={{ backgroundColor: player.color, boxShadow: `0 0 10px ${player.color}` }}
                  >
                    {player.nickname.charAt(0).toUpperCase()}
                  </div>
                  <div className="player-info">
                    <span className="player-name">
                      {player.nickname}
                      {player.id === roomInfo.hostId && <span className="host-badge">房主</span>}
                    </span>
                    <span className={`player-ready ${player.ready ? 'ready' : 'not-ready'}`}>
                      {player.ready ? '已准备' : '未准备'}
                    </span>
                  </div>
                  {player.id === playerId && (
                    <div className="player-self-badge">你</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="config-panel">
            <h3>房间设置</h3>
            
            <div className="config-item">
              <label>玩家数量</label>
              <select
                value={roomInfo.config.maxPlayers}
                onChange={(e) => onUpdateConfig({ maxPlayers: parseInt(e.target.value) })}
                disabled={!isHost}
              >
                <option value={2}>2 人</option>
                <option value={3}>3 人</option>
                <option value={4}>4 人</option>
              </select>
            </div>

            <div className="config-item">
              <label>地图尺寸</label>
              <select
                value={roomInfo.config.gridSize}
                onChange={(e) => onUpdateConfig({ gridSize: parseInt(e.target.value) })}
                disabled={!isHost}
              >
                <option value={12}>12 x 12 (小)</option>
                <option value={16}>16 x 16 (中)</option>
                <option value={20}>20 x 20 (大)</option>
              </select>
            </div>

            <div className="config-item">
              <label>技能系统</label>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={roomInfo.config.skillsEnabled}
                  onChange={(e) => onUpdateConfig({ skillsEnabled: e.target.checked })}
                  disabled={!isHost}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>

        <div className="room-actions">
          {!isHost && (
            <button
              className={`btn btn-ready ${isReady ? 'btn-ready-active' : ''}`}
              onClick={handleToggleReady}
            >
              {isReady ? '取消准备' : '准备'}
            </button>
          )}
          
          {isHost && (
            <button
              className="btn btn-primary btn-start"
              onClick={onStartGame}
              disabled={!allReady}
            >
              {allReady ? '开始游戏' : '等待玩家准备...'}
            </button>
          )}

          <button className="btn btn-text" onClick={onLeaveRoom}>
            离开房间
          </button>
        </div>
      </div>
    </div>
  )
}
