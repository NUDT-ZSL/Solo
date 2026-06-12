import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Exhibit, ViewMode } from './types';
import ExhibitionRoom from './ExhibitionRoom';
import './App.css';

let socketInstance: Socket | null = null;

function getSocket(): Socket {
  if (!socketInstance) {
    socketInstance = io('http://localhost:3001', {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });
  }
  return socketInstance;
}

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('home');
  const [roomId, setRoomId] = useState('');
  const [roomName, setRoomName] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [joinRoomInput, setJoinRoomInput] = useState('');
  const [exhibits, setExhibits] = useState<Exhibit[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userCount, setUserCount] = useState(0);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    socketRef.current = getSocket();
    return () => {};
  }, []);

  const handleCreateRoom = () => {
    if (!newRoomName.trim()) {
      setError('请输入展览名称');
      return;
    }
    setError('');
    setIsLoading(true);

    const socket = socketRef.current!;
    socket.emit('create_room', newRoomName.trim(), (response: any) => {
      setIsLoading(false);
      if (response.success) {
        setRoomId(response.roomId);
        setRoomName(response.roomName);
        setExhibits(response.exhibits);
        setViewMode('room');
      } else {
        setError(response.error || '创建房间失败');
      }
    });
  };

  const handleJoinRoom = () => {
    if (!joinRoomInput.trim()) {
      setError('请输入房间ID');
      return;
    }
    setError('');
    setIsLoading(true);

    const socket = socketRef.current!;
    socket.emit('join_room', joinRoomInput.trim(), (response: any) => {
      setIsLoading(false);
      if (response.success) {
        setRoomId(response.roomId);
        setRoomName(response.roomName);
        setExhibits(response.exhibits);
        setViewMode('room');
      } else {
        setError(response.error || '加入房间失败');
      }
    });
  };

  const handleBack = () => {
    setViewMode('home');
    setRoomId('');
    setRoomName('');
    setExhibits([]);
    setError('');
  };

  if (viewMode === 'room' && socketRef.current) {
    return (
      <ExhibitionRoom
        socket={socketRef.current}
        roomId={roomId}
        roomName={roomName}
        initialExhibits={exhibits}
        onBack={handleBack}
        onUserCountChange={setUserCount}
      />
    );
  }

  return (
    <div className="app-home">
      <div className="home-wrapper">
        <div className="home-header">
          <h1 className="home-title">虚拟展览策展平台</h1>
          <p className="home-subtitle">多人实时协作 · 可视化展览布置 · 一键生成导览图</p>
        </div>

        {error && <div className="error-toast">{error}</div>}

        <div className="home-cards">
          <div className="home-card">
            <div className="card-icon create-icon">✨</div>
            <h2 className="card-title">创建新展览</h2>
            <p className="card-desc">从零开始策划你的线上展览</p>
            <input
              type="text"
              className="card-input"
              placeholder="输入展览名称"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateRoom()}
            />
            <button
              className="primary-button"
              onClick={handleCreateRoom}
              disabled={isLoading}
            >
              {isLoading ? '创建中...' : '创建展览'}
            </button>
          </div>

          <div className="card-divider">
            <span>或</span>
          </div>

          <div className="home-card">
            <div className="card-icon join-icon">🎯</div>
            <h2 className="card-title">加入已有展览</h2>
            <p className="card-desc">输入房间ID与团队协作</p>
            <input
              type="text"
              className="card-input"
              placeholder="输入房间ID"
              value={joinRoomInput}
              onChange={(e) => setJoinRoomInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
            />
            <button
              className="secondary-button"
              onClick={handleJoinRoom}
              disabled={isLoading}
            >
              {isLoading ? '加入中...' : '加入展览'}
            </button>
          </div>
        </div>

        <div className="home-tips">
          <div className="tip-item">
            <span className="tip-icon">🖱️</span>
            <span>拖拽展品到网格上布置展位</span>
          </div>
          <div className="tip-item">
            <span className="tip-icon">🔄</span>
            <span>点击方向箭头旋转展品朝向</span>
          </div>
          <div className="tip-item">
            <span className="tip-icon">📝</span>
            <span>点击展品卡片编辑详情</span>
          </div>
          <div className="tip-item">
            <span className="tip-icon">�️</span>
            <span>一键生成展览导览地图</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
