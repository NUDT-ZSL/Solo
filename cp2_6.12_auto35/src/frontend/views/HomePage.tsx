import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function HomePage() {
  const navigate = useNavigate();
  const [roomName, setRoomName] = useState('我的密室');
  const [playerName, setPlayerName] = useState('玩家');
  const [rooms, setRooms] = useState<{ id: string; name: string }[]>([]);
  const [selectedRoom, setSelectedRoom] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('escapeRooms');
    if (stored) {
      try {
        setRooms(JSON.parse(stored));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const createRoom = async () => {
    setLoading(true);
    try {
      const res = await axios.post('/api/rooms', { name: roomName, designerId: 'designer-1' });
      const newRoom = { id: res.data.id, name: res.data.name };
      const updated = [...rooms, newRoom];
      setRooms(updated);
      localStorage.setItem('escapeRooms', JSON.stringify(updated));
      navigate(`/designer/${res.data.id}`);
    } catch (e) {
      console.error('Failed to create room:', e);
      alert('创建失败，请确保后端服务已启动');
    }
    setLoading(false);
  };

  const startPlaying = async () => {
    if (!selectedRoom) {
      alert('请选择一个密室');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post('/api/sessions', { escapeRoomId: selectedRoom, playerName });
      navigate(`/play/${res.data.id}`);
    } catch (e) {
      console.error('Failed to start game:', e);
      alert('开始游戏失败，请确保后端服务已启动');
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      padding: '20px'
    }}>
      <div style={{
        textAlign: 'center',
        marginBottom: '40px'
      }}>
        <h1 style={{
          fontSize: '48px',
          fontWeight: 'bold',
          color: '#f97316',
          marginBottom: '12px',
          textShadow: '0 0 20px rgba(249, 115, 22, 0.3)'
        }}>
          🔐 密室逃脱设计工具
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '18px' }}>
          设计你的专属密室，邀请朋友一起来挑战！
        </p>
      </div>

      <div style={{
        display: 'flex',
        gap: '30px',
        flexWrap: 'wrap',
        justifyContent: 'center',
        maxWidth: '900px',
        width: '100%'
      }}>
        <div style={{
          flex: 1,
          minWidth: '320px',
          maxWidth: '400px',
          backgroundColor: '#1e293b',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid #334155',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
        }}>
          <h2 style={{ color: '#f1f5f9', marginBottom: '20px', fontSize: '22px' }}>
            🎨 设计师模式
          </h2>
          <p style={{ color: '#94a3b8', marginBottom: '16px', fontSize: '14px' }}>
            创建密室、布置道具、设计谜题，发挥你的创意！
          </p>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', color: '#94a3b8', marginBottom: '6px', fontSize: '14px' }}>
              密室名称
            </label>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                backgroundColor: '#0f172a',
                border: '1px solid #475569',
                borderRadius: '6px',
                color: '#f1f5f9',
                fontSize: '14px'
              }}
              placeholder="输入密室名称"
            />
          </div>
          <button
            onClick={createRoom}
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#f97316',
              color: 'white',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            {loading ? '创建中...' : '+ 创建新密室'}
          </button>

          {rooms.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '8px' }}>我的密室：</p>
              <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                {rooms.map(room => (
                  <div
                    key={room.id}
                    onClick={() => navigate(`/designer/${room.id}`)}
                    style={{
                      padding: '10px 12px',
                      backgroundColor: '#0f172a',
                      borderRadius: '6px',
                      marginBottom: '6px',
                      cursor: 'pointer',
                      border: '1px solid #334155',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#f97316';
                      e.currentTarget.style.backgroundColor = '#1e293b';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#334155';
                      e.currentTarget.style.backgroundColor = '#0f172a';
                    }}
                  >
                    <span style={{ color: '#f1f5f9', fontSize: '14px' }}>{room.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{
          flex: 1,
          minWidth: '320px',
          maxWidth: '400px',
          backgroundColor: '#1e293b',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid #334155',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
        }}>
          <h2 style={{ color: '#f1f5f9', marginBottom: '20px', fontSize: '22px' }}>
            🎮 玩家模式
          </h2>
          <p style={{ color: '#94a3b8', marginBottom: '16px', fontSize: '14px' }}>
            进入密室，破解谜题，看看你能多久通关！
          </p>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', color: '#94a3b8', marginBottom: '6px', fontSize: '14px' }}>
              玩家名称
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                backgroundColor: '#0f172a',
                border: '1px solid #475569',
                borderRadius: '6px',
                color: '#f1f5f9',
                fontSize: '14px'
              }}
              placeholder="输入你的名字"
            />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', color: '#94a3b8', marginBottom: '6px', fontSize: '14px' }}>
              选择密室
            </label>
            <select
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                backgroundColor: '#0f172a',
                border: '1px solid #475569',
                borderRadius: '6px',
                color: '#f1f5f9',
                fontSize: '14px'
              }}
            >
              <option value="">-- 请选择 --</option>
              {rooms.map(room => (
                <option key={room.id} value={room.id}>{room.name}</option>
              ))}
            </select>
          </div>
          <button
            onClick={startPlaying}
            disabled={loading || !selectedRoom}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: selectedRoom ? '#22c55e' : '#475569',
              color: 'white',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: selectedRoom ? 'pointer' : 'not-allowed'
            }}
          >
            {loading ? '加载中...' : '🚀 开始游戏'}
          </button>
        </div>
      </div>

      <div style={{ marginTop: '40px', color: '#64748b', fontSize: '13px' }}>
        提示：先创建一个密室并添加道具和谜题，然后再开始游戏
      </div>
    </div>
  );
}

export default HomePage;
