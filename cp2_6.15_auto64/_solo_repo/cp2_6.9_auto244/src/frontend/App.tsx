import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import type { Player, RoomState } from '../shared/types';
import Room from './Room';

interface PublicRoom {
  roomId: string;
  playerCount: number;
  maxPlayers: number;
  status: string;
}

const App: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [nickname, setNickname] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [publicRooms, setPublicRooms] = useState<PublicRoom[]>([]);
  const [error, setError] = useState('');
  const [view, setView] = useState<'lobby' | 'room'>('lobby');

  useEffect(() => {
    const s = io('http://localhost:3001', {
      transports: ['websocket']
    });
    setSocket(s);

    s.on('rooms-list', (rooms: PublicRoom[]) => {
      setPublicRooms(rooms);
    });

    s.on('room-state', (state: RoomState) => {
      setRoomState(state);
    });

    s.on('disconnect', () => {
      setCurrentPlayer(null);
      setRoomState(null);
      setView('lobby');
    });

    return () => {
      s.disconnect();
    };
  }, []);

  const handleCreateRoom = () => {
    if (!nickname.trim()) {
      setError('请输入昵称');
      return;
    }
    if (!socket) return;
    setError('');
    socket.emit('create-room', nickname.trim(), (res: any) => {
      if (res.success) {
        setCurrentPlayer(res.player);
        setView('room');
      } else {
        setError(res.error || '创建房间失败');
      }
    });
  };

  const handleJoinRoom = () => {
    if (!nickname.trim()) {
      setError('请输入昵称');
      return;
    }
    if (!/^\d{6}$/.test(joinRoomId)) {
      setError('房间号必须是6位数字');
      return;
    }
    if (!socket) return;
    setError('');
    socket.emit('join-room', joinRoomId, nickname.trim(), (res: any) => {
      if (res.success) {
        setCurrentPlayer(res.player);
        setView('room');
      } else {
        setError(res.error || '加入房间失败');
      }
    });
  };

  const handleLeaveRoom = () => {
    setCurrentPlayer(null);
    setRoomState(null);
    setView('lobby');
    if (socket) {
      socket.disconnect();
      const s = io('http://localhost:3001', { transports: ['websocket'] });
      setSocket(s);
      s.on('rooms-list', (rooms: PublicRoom[]) => setPublicRooms(rooms));
      s.on('room-state', (state: RoomState) => setRoomState(state));
    }
  };

  if (view === 'room' && socket && currentPlayer && roomState) {
    return (
      <Room
        socket={socket}
        player={currentPlayer}
        roomState={roomState}
        onLeave={handleLeaveRoom}
      />
    );
  }

  const statusText: Record<string, string> = {
    waiting: '等待中',
    playing: '进行中',
    won: '已胜利',
    lost: '已失败'
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: `
          radial-gradient(ellipse at top, #3a2a1a 0%, #1a0f08 50%, #0a0503 100%),
          linear-gradient(180deg, #2a1f14 0%, #1a1208 100%)
        `,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        overflow: 'auto'
      }}
    >
      <div
        style={{
          textAlign: 'center',
          marginBottom: '40px'
        }}
      >
        <h1
          style={{
            fontSize: 'clamp(32px, 6vw, 64px)',
            color: '#D4A843',
            letterSpacing: '8px',
            textShadow: '0 0 20px rgba(212, 168, 67, 0.5), 0 4px 8px rgba(0,0,0,0.8)',
            marginBottom: '12px',
            fontFamily: 'Georgia, serif',
            fontWeight: 'bold'
          }}
        >
          沙 影 谜 城
        </h1>
        <p
          style={{
            color: '#C2A77A',
            fontSize: 'clamp(14px, 2vw, 18px)',
            letterSpacing: '4px',
            opacity: 0.85
          }}
        >
          SAND SHADOW ESCAPE · 古埃及密室逃脱
        </p>
        <div
          style={{
            marginTop: '20px',
            fontSize: '48px',
            letterSpacing: '20px',
            opacity: 0.7
          }}
        >
          𓂀 𓆣 𓋹 𓊽 𓁹
        </div>
      </div>

      <div
        style={{
          background: 'rgba(30, 20, 10, 0.75)',
          backdropFilter: 'blur(10px)',
          border: '2px solid rgba(212, 168, 67, 0.4)',
          borderRadius: '12px',
          padding: '32px',
          width: '100%',
          maxWidth: '480px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(212, 168, 67, 0.1)'
        }}
      >
        <div style={{ marginBottom: '20px' }}>
          <label
            style={{
              display: 'block',
              color: '#C2A77A',
              marginBottom: '8px',
              fontSize: '14px',
              letterSpacing: '2px'
            }}
          >
            玩家昵称
          </label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="请输入你的昵称..."
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'rgba(0,0,0,0.4)',
              border: '1px solid rgba(212, 168, 67, 0.3)',
              borderRadius: '6px',
              color: '#D4A843',
              fontSize: '16px',
              outline: 'none',
              transition: 'border-color 0.2s',
              boxSizing: 'border-box'
            }}
            onFocus={(e) => (e.target.style.borderColor = '#D4A843')}
            onBlur={(e) => (e.target.style.borderColor = 'rgba(212, 168, 67, 0.3)')}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label
            style={{
              display: 'block',
              color: '#C2A77A',
              marginBottom: '8px',
              fontSize: '14px',
              letterSpacing: '2px'
            }}
          >
            房间号（加入时填写）
          </label>
          <input
            type="text"
            value={joinRoomId}
            onChange={(e) => setJoinRoomId(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="6位数字房间号"
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'rgba(0,0,0,0.4)',
              border: '1px solid rgba(212, 168, 67, 0.3)',
              borderRadius: '6px',
              color: '#D4A843',
              fontSize: '18px',
              letterSpacing: '8px',
              textAlign: 'center',
              outline: 'none',
              transition: 'border-color 0.2s',
              boxSizing: 'border-box'
            }}
            onFocus={(e) => (e.target.style.borderColor = '#D4A843')}
            onBlur={(e) => (e.target.style.borderColor = 'rgba(212, 168, 67, 0.3)')}
          />
        </div>

        {error && (
          <div
            style={{
              color: '#E74C3C',
              padding: '10px 14px',
              background: 'rgba(231, 76, 60, 0.15)',
              border: '1px solid rgba(231, 76, 60, 0.4)',
              borderRadius: '6px',
              marginBottom: '16px',
              fontSize: '14px'
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '24px'
          }}
        >
          <button
            onClick={handleCreateRoom}
            style={{
              flex: 1,
              padding: '14px',
              background: 'linear-gradient(180deg, #D4A843 0%, #A8802A 100%)',
              border: '1px solid #8B6914',
              borderRadius: '6px',
              color: '#1a0f08',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              letterSpacing: '2px',
              transition: 'transform 0.15s, box-shadow 0.15s',
              boxShadow: '0 4px 12px rgba(212, 168, 67, 0.3)'
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            创建房间
          </button>
          <button
            onClick={handleJoinRoom}
            style={{
              flex: 1,
              padding: '14px',
              background: 'rgba(212, 168, 67, 0.15)',
              border: '1px solid rgba(212, 168, 67, 0.5)',
              borderRadius: '6px',
              color: '#D4A843',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              letterSpacing: '2px',
              transition: 'transform 0.15s, background 0.15s'
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            加入房间
          </button>
        </div>

        {publicRooms.length > 0 && (
          <div>
            <div
              style={{
                color: '#C2A77A',
                fontSize: '14px',
                letterSpacing: '2px',
                marginBottom: '12px',
                paddingBottom: '8px',
                borderBottom: '1px solid rgba(212, 168, 67, 0.2)'
              }}
            >
              🔮 在线房间列表
            </div>
            <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
              {publicRooms.map((room) => (
                <div
                  key={room.roomId}
                  onClick={() => setJoinRoomId(room.roomId)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 12px',
                    background: 'rgba(0,0,0,0.25)',
                    borderRadius: '6px',
                    marginBottom: '8px',
                    cursor: 'pointer',
                    border: '1px solid transparent',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(212, 168, 67, 0.4)';
                    e.currentTarget.style.background = 'rgba(212, 168, 67, 0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'transparent';
                    e.currentTarget.style.background = 'rgba(0,0,0,0.25)';
                  }}
                >
                  <span
                    style={{
                      color: '#D4A843',
                      fontFamily: 'monospace',
                      fontSize: '16px',
                      letterSpacing: '3px'
                    }}
                  >
                    #{room.roomId}
                  </span>
                  <span style={{ color: '#C2A77A', fontSize: '13px' }}>
                    {room.playerCount}/{room.maxPlayers}人
                  </span>
                  <span
                    style={{
                      fontSize: '12px',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      background:
                        room.status === 'waiting'
                          ? 'rgba(46, 204, 113, 0.2)'
                          : room.status === 'playing'
                          ? 'rgba(241, 196, 15, 0.2)'
                          : 'rgba(127, 140, 141, 0.2)',
                      color:
                        room.status === 'waiting'
                          ? '#2ECC71'
                          : room.status === 'playing'
                          ? '#F1C40F'
                          : '#7F8C8D'
                    }}
                  >
                    {statusText[room.status] || room.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div
        style={{
          marginTop: '32px',
          color: '#5A6A7A',
          fontSize: '12px',
          letterSpacing: '2px',
          textAlign: 'center',
          opacity: 0.7
        }}
      >
        2-4人协作解谜 · 60分钟限时逃出 · 古埃及神秘之旅
      </div>
    </div>
  );
};

export default App;
