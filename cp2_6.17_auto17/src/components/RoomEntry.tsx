import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';

function RoomEntry() {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<'student' | 'teacher'>('student');

  useEffect(() => {
    const savedUsername = localStorage.getItem('username');
    if (savedUsername) {
      setUsername(savedUsername);
    }
  }, []);

  const handleCreateRoom = () => {
    const newRoomId = Math.random().toString(36).substring(2, 10);
    if (username) {
      localStorage.setItem('username', username);
    }
    const path = role === 'teacher' ? `/monitor/${newRoomId}` : `/editor/${newRoomId}`;
    navigate(path);
  };

  const handleJoinRoom = () => {
    if (!roomId.trim()) return;
    if (username) {
      localStorage.setItem('username', username);
    }
    const path = role === 'teacher' ? `/monitor/${roomId.trim()}` : `/editor/${roomId.trim()}`;
    navigate(path);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary)',
      padding: '20px'
    }}>
      <div style={{
        background: 'var(--bg-editor)',
        padding: '40px',
        borderRadius: '12px',
        border: '1px solid var(--border)',
        width: '100%',
        maxWidth: '480px'
      }}>
        <h1 style={{ marginBottom: '8px', fontSize: '28px' }}>协作代码编辑器</h1>
        <p style={{ color: '#94a3b8', marginBottom: '32px', fontSize: '14px' }}>
          实时协作，即时反馈
        </p>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
            用户名
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="请输入用户名"
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
            身份
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as 'student' | 'teacher')}
            style={{ width: '100%' }}
          >
            <option value="student">学生</option>
            <option value="teacher">教师</option>
          </select>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
            房间号（加入房间时填写）
          </label>
          <input
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="输入房间号"
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            onClick={handleCreateRoom}
            className="run-button"
            style={{ width: '100%', padding: '12px', fontSize: '16px' }}
          >
            创建新房间
          </button>
          <button
            onClick={handleJoinRoom}
            disabled={!roomId.trim()}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '16px',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text-primary)',
              cursor: roomId.trim() ? 'pointer' : 'not-allowed',
              opacity: roomId.trim() ? 1 : 0.5,
              transition: 'background-color 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (roomId.trim()) {
                e.currentTarget.style.background = 'var(--highlight)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            加入房间
          </button>
        </div>
      </div>
    </div>
  );
}

export default RoomEntry;
