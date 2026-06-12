import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVersions } from '@/hooks/useVersions';

export default function HomePage() {
  const [roomId, setRoomId] = useState('');
  const [userName, setUserName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { createRoom } = useVersions();

  const handleJoinRoom = () => {
    if (!roomId.trim()) {
      alert('请输入房间号');
      return;
    }
    if (!userName.trim()) {
      alert('请输入您的用户名');
      return;
    }
    localStorage.setItem('userName', userName.trim());
    navigate(`/editor/${roomId.trim()}`);
  };

  const handleCreateRoom = async () => {
    if (!userName.trim()) {
      alert('请输入您的用户名');
      return;
    }
    setIsLoading(true);
    try {
      localStorage.setItem('userName', userName.trim());
      const newRoomId = await createRoom();
      navigate(`/editor/${newRoomId}`);
    } catch (error) {
      console.error('创建房间失败:', error);
      alert('创建房间失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page-transition" style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>简历协作编辑器</h1>
        <p style={styles.subtitle}>多人实时协作 · 版本管理 · 评论反馈</p>

        <div style={styles.formGroup}>
          <label style={styles.label}>您的用户名</label>
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="请输入您的名字"
            style={styles.input}
            onKeyDown={(e) => e.key === 'Enter' && (roomId ? handleJoinRoom() : handleCreateRoom())}
          />
        </div>

        <div style={styles.divider}>
          <div style={styles.dividerLine} />
          <span style={styles.dividerText}>或者</span>
          <div style={styles.dividerLine} />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>加入已有房间</label>
          <input
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="输入房间号"
            style={{ ...styles.input, ...styles.breathingBorderInput }}
            className="breathing-border"
            onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
          />
          <button
            onClick={handleJoinRoom}
            style={{ ...styles.button, marginTop: '12px' }}
          >
            加入房间
          </button>
        </div>

        <div style={styles.divider}>
          <div style={styles.dividerLine} />
          <span style={styles.dividerText}>或者</span>
          <div style={styles.dividerLine} />
        </div>

        <button
          onClick={handleCreateRoom}
          disabled={isLoading}
          style={{ ...styles.button, width: '100%' }}
        >
          {isLoading ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <span className="spinner" style={styles.spinnerIcon} />
              创建中...
            </span>
          ) : (
            '创建新房间'
          )}
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    padding: '20px'
  },
  card: {
    background: '#2d2d3e',
    borderRadius: '16px',
    padding: '40px',
    width: '100%',
    maxWidth: '440px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    textAlign: 'center',
    marginBottom: '8px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  subtitle: {
    fontSize: '14px',
    color: '#8888aa',
    textAlign: 'center',
    marginBottom: '32px'
  },
  formGroup: {
    marginBottom: '8px'
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 500,
    color: '#ccccdd',
    marginBottom: '8px'
  },
  input: {
    width: '100%',
    padding: '14px 16px',
    borderRadius: '8px',
    border: '2px solid #3d3d5e',
    background: '#1a1a2e',
    color: '#ffffff',
    fontSize: '15px',
    outline: 'none',
    transition: 'border-color 0.3s ease',
    fontFamily: 'inherit'
  },
  breathingBorderInput: {
    border: '3px solid #667eea'
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    margin: '24px 0'
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    background: '#3d3d5e'
  },
  dividerText: {
    padding: '0 16px',
    fontSize: '13px',
    color: '#666688'
  },
  button: {
    padding: '14px 24px',
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    fontFamily: 'inherit'
  },
  spinnerIcon: {
    width: '18px',
    height: '18px',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderTopColor: '#ffffff',
    borderRadius: '50%',
    display: 'inline-block'
  }
};
