import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { BookOpen, Plus, LogIn, RefreshCw } from 'lucide-react';

export default function RoomManager() {
  const navigate = useNavigate();
  const { rooms, fetchRooms, createRoom, joinRoom, setUserName } = useStore();
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [theme, setTheme] = useState('');
  const [creatorName, setCreatorName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joinName, setJoinName] = useState('');

  const handleCreate = async () => {
    if (!theme.trim() || !creatorName.trim()) return;
    const room = await createRoom(theme.trim(), creatorName.trim());
    setUserName(creatorName.trim());
    setShowCreate(false);
    setTheme('');
    setCreatorName('');
    navigate(`/room/${room.roomCode}`);
  };

  const handleJoin = async () => {
    if (!joinCode.trim() || !joinName.trim()) return;
    try {
      await joinRoom(joinCode.trim().toUpperCase(), joinName.trim());
      setUserName(joinName.trim());
      navigate(`/room/${joinCode.trim().toUpperCase()}`);
    } catch {
      alert('房间不存在，请检查房间号');
    }
  };

  return (
    <div className="room-manager">
      <div className="room-manager-header">
        <h2><BookOpen size={20} /> 故事织机</h2>
        <button className="btn-icon" onClick={fetchRooms} title="刷新">
          <RefreshCw size={16} />
        </button>
      </div>

      <div className="room-actions">
        <button className="btn-primary" onClick={() => setShowCreate(!showCreate)}>
          <Plus size={16} /> 创建房间
        </button>
        <button className="btn-secondary" onClick={() => setShowJoin(!showJoin)}>
          <LogIn size={16} /> 加入房间
        </button>
      </div>

      {showCreate && (
        <div className="room-form">
          <input
            className="input-field"
            placeholder="输入昵称"
            value={creatorName}
            onChange={(e) => setCreatorName(e.target.value)}
          />
          <input
            className="input-field"
            placeholder="故事主题，如：在绿色星球上发现了一扇门"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
          />
          <button className="btn-primary btn-sm" onClick={handleCreate} disabled={!theme.trim() || !creatorName.trim()}>
            创建
          </button>
        </div>
      )}

      {showJoin && (
        <div className="room-form">
          <input
            className="input-field"
            placeholder="输入昵称"
            value={joinName}
            onChange={(e) => setJoinName(e.target.value)}
          />
          <input
            className="input-field"
            placeholder="输入6位房间号"
            maxLength={6}
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          />
          <button className="btn-primary btn-sm" onClick={handleJoin} disabled={!joinCode.trim() || !joinName.trim()}>
            加入
          </button>
        </div>
      )}

      <div className="room-list">
        <h3>活跃房间</h3>
        {rooms.length === 0 ? (
          <p className="room-empty">暂无房间，快来创建第一个吧</p>
        ) : (
          rooms.map((room) => (
            <div
              key={room.id}
              className="room-card"
              onClick={() => navigate(`/room/${room.roomCode}`)}
            >
              <div className="room-card-code">{room.roomCode}</div>
              <div className="room-card-theme">{room.theme}</div>
              <div className="room-card-meta">
                <span>{room.memberCount} 人</span>
                <span>{room.paragraphCount} 段</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
