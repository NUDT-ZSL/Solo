import React, { useState, useEffect } from 'react'
import RoomPage from './pages/RoomPage'
import './App.css'

interface RoomInfo {
  id: string
  name: string
  userCount: number
  createdAt: number
}

const App: React.FC = () => {
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null)
  const [userName, setUserName] = useState('')
  const [rooms, setRooms] = useState<RoomInfo[]>([])
  const [newRoomName, setNewRoomName] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!currentRoomId) {
      fetchRooms()
    }
  }, [currentRoomId])

  const fetchRooms = async () => {
    try {
      const response = await fetch('/api/rooms')
      const data = await response.json()
      setRooms(data)
    } catch (error) {
      console.error('Failed to fetch rooms:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const createRoom = async () => {
    if (!newRoomName.trim()) return

    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newRoomName.trim() }),
      })
      const data = await response.json()
      setRooms((prev) => [...prev, data])
      setNewRoomName('')
    } catch (error) {
      console.error('Failed to create room:', error)
    }
  }

  const joinRoom = (roomId: string) => {
    if (!userName.trim()) {
      alert('请输入您的昵称')
      return
    }
    setCurrentRoomId(roomId)
  }

  const handleBack = () => {
    setCurrentRoomId(null)
  }

  if (currentRoomId) {
    return (
      <RoomPage roomId={currentRoomId} userName={userName} onBack={handleBack} />
    )
  }

  return (
    <div className="app-container">
      <div className="home-page">
        <header className="home-header">
          <h1 className="app-title">
            <span className="title-icon">🧩</span>
            社区拼图挑战赛
          </h1>
          <p className="app-subtitle">和朋友们一起完成拼图挑战吧！</p>
        </header>

        <div className="name-input-section">
          <label className="input-label">您的昵称</label>
          <input
            type="text"
            className="name-input"
            placeholder="请输入您的昵称"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
          />
        </div>

        <div className="create-room-section">
          <input
            type="text"
            className="room-name-input"
            placeholder="输入房间名称创建新房间"
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createRoom()}
          />
          <button className="create-button" onClick={createRoom}>
            创建房间
          </button>
        </div>

        <div className="rooms-section">
          <h2 className="section-title">可用房间</h2>
          {isLoading ? (
            <div className="loading">加载中...</div>
          ) : rooms.length === 0 ? (
            <div className="no-rooms">暂无房间，创建一个吧！</div>
          ) : (
            <div className="rooms-list">
              {rooms.map((room) => (
                <div key={room.id} className="room-card">
                  <div className="room-info">
                    <h3 className="room-name">{room.name}</h3>
                    <p className="room-users">{room.userCount} 人在线</p>
                  </div>
                  <button
                    className="join-button"
                    onClick={() => joinRoom(room.id)}
                  >
                    加入
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
