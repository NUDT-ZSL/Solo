import { useState } from 'react';
import { io, Socket } from 'socket.io-client';
import ExhibitionRoom from './ExhibitionRoom';
import { Exhibit, ViewMode } from './types';
import './App.css';

const socket: Socket = io('http://localhost:3001', {
  transports: ['websocket', 'polling'],
});

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('home');
  const [roomId, setRoomId] = useState('');
  const [roomName, setRoomName] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [exhibits, setExhibits] = useState<Exhibit[]>([]);
  const [error, setError] = useState('');
  const [userCount, setUserCount] = useState(0);

  const createRoom = () => {
    if (!newRoomName.trim()) {
      setError('请输入展览名称');
      return;
    }
    setError('');
    socket.emit('create_room', newRoomName, (response: any) => {
      if (response.success) {
        setRoomId(response.roomId);
        setRoomName(response.roomName);
        setViewMode('room');
      }
    });
  };

  const joinRoom = () => {
    if (!joinRoomId.trim()) {
      setError('请输入房间ID');
      return;
    }
    setError('');
    socket.emit('join_room', joinRoomId, (response: any) => {
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

  const handleExhibitsUpdate = (updatedExhibits: Exhibit[]) => {
    setExhibits(updatedExhibits);
  };

  if (viewMode === 'room') {
    return (
      <ExhibitionRoom
        socket={socket}
        roomId={roomId}
        roomName={roomName}
        initialExhibits={exhibits}
        onBack={() => setViewMode('home')}
        onUserCountChange={setUserCount}
      />
    );
  }

  return (
    <div className="app-home">
      <div className="home-container">
        <h1 className="home-title">虚拟展览策展平台</h1>
        <p className="home-subtitle">多人实时协作 · 可视化展览布置</p>

        {error && <div className="error-message">{error}</div>}

        <div className="home-card">
          <h2>创建新展览</h2>
          <input
            type="text"
            placeholder="输入展览名称"
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            className="home-input"
            onKeyDown={(e) => e.key === 'Enter' && createRoom()}
          />
          <button className="primary-btn" onClick={createRoom}>
            创建展览
          </button>
        </div>

        <div className="divider">
          <span>或</span>
        </div>

        <div className="home-card">
          <h2>加入已有展览</h2>
          <input
            type="text"
            placeholder="输入房间ID"
            value={joinRoomId}
            onChange={(e) => setJoinRoomId(e.target.value)}
            className="home-input"
            onKeyDown={(e) => e.key === 'Enter' && joinRoom()}
          />
          <button className="secondary-btn" onClick={joinRoom}>
            加入展览
          </button>
        </div>

        <div className="demo-section">
          <p>💡 提示：创建房间后，复制房间ID分享给团队成员即可协作</p>
        </div>
      </div>
    </div>
  );
}

export default App;
