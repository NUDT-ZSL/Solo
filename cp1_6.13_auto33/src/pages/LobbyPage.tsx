import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWebSocket } from '../contexts/WebSocketContext';
import { RoomInfo } from '../types';

const LobbyPage: React.FC = () => {
  const navigate = useNavigate();
  const { ws, sendMessage, playerName, setPlayerName } = useWebSocket();

  const [nameInput, setNameInput] = useState(playerName);
  const [isLoggedIn, setIsLoggedIn] = useState(!!playerName);
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!ws) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);

        switch (message.type) {
          case 'room_list':
            setRooms(message.rooms || []);
            break;
          case 'online_count':
            setOnlineCount(message.count || 0);
            break;
          case 'room_state':
            if (message.room?.id) {
              navigate(`/game/${message.room.id}`);
            }
            break;
          case 'error':
            alert(message.message);
            break;
        }
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    };

    ws.addEventListener('message', handleMessage);

    if (isLoggedIn && playerName) {
      sendMessage({ type: 'join_lobby', name: playerName });
    }

    return () => {
      ws.removeEventListener('message', handleMessage);
    };
  }, [ws, isLoggedIn, playerName, sendMessage, navigate]);

  const handleEnter = useCallback(() => {
    const name = nameInput.trim();
    if (!name) {
      alert('请输入昵称');
      return;
    }
    setPlayerName(name);
    setIsLoggedIn(true);
    sendMessage({ type: 'join_lobby', name });
  }, [nameInput, setPlayerName, sendMessage]);

  const handleCreateRoom = useCallback(() => {
    if (isCreating) return;
    setIsCreating(true);
    sendMessage({ type: 'create_room', playerName: playerName });
    setTimeout(() => setIsCreating(false), 1000);
  }, [playerName, sendMessage, isCreating]);

  const handleJoinRoom = useCallback(
    (room: RoomInfo) => {
      if (room.status !== 'waiting' || room.playerCount >= room.maxPlayers) {
        return;
      }
      sendMessage({ type: 'join_room', roomId: room.id, playerName: playerName });
    },
    [playerName, sendMessage]
  );

  const getStatusText = (status: string) => {
    switch (status) {
      case 'waiting':
        return '等待中';
      case 'playing':
        return '游戏中';
      case 'finished':
        return '已结束';
      default:
        return status;
    }
  };

  return (
    <div className="lobby-page">
      <header className="lobby-header">
        <h1 className="lobby-title">🃏 BubblePoker</h1>
        <div className="online-count">
          <span className="online-dot"></span>
          在线: {onlineCount}
        </div>
      </header>

      <main className="lobby-content">
        {!isLoggedIn ? (
          <div className="login-section">
            <h2>欢迎来到 BubblePoker</h2>
            <input
              type="text"
              className="login-input"
              placeholder="请输入您的昵称"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleEnter()}
              maxLength={20}
              autoFocus
            />
            <button
              className="enter-btn"
              onClick={handleEnter}
              disabled={!nameInput.trim()}
            >
              进入大厅
            </button>
          </div>
        ) : (
          <div className="rooms-section">
            <div className="rooms-header">
              <h2>房间列表</h2>
              <button
                className="create-room-btn"
                onClick={handleCreateRoom}
                disabled={isCreating}
              >
                {isCreating ? '创建中...' : '+ 创建房间'}
              </button>
            </div>

            {rooms.length === 0 ? (
              <div className="no-rooms">
                暂无房间，点击右上角按钮创建一个吧！
              </div>
            ) : (
              <div className="rooms-grid">
                {rooms.map((room, index) => {
                  const isDisabled =
                    room.status !== 'waiting' || room.playerCount >= room.maxPlayers;
                  return (
                    <div
                      key={room.id}
                      className={`room-card ${isDisabled ? 'disabled' : ''}`}
                      onClick={() => !isDisabled && handleJoinRoom(room)}
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <div className="room-card-id">房间号: {room.id.slice(0, 8)}</div>
                      <div className="room-card-info">
                        <span className="room-card-players">
                          {room.playerCount}/{room.maxPlayers} 人
                        </span>
                        <span className={`room-card-status ${room.status}`}>
                          {getStatusText(room.status)}
                        </span>
                      </div>
                      {isDisabled && (
                        <div style={{ fontSize: '0.85rem', color: '#718096' }}>
                          {room.status !== 'waiting'
                            ? '游戏进行中'
                            : '房间已满'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default LobbyPage;
