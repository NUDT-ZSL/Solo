import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Category, TimeLimit, QuestionCount, CATEGORY_LABELS } from '../types';
import { getSocket } from '../socket';
import { generateRandomName, generateRandomAvatar, copyToClipboard } from '../utils';

const Lobby = () => {
  const navigate = useNavigate();
  const socket = getSocket();

  const [playerName, setPlayerName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [roomName, setRoomName] = useState('');
  const [category, setCategory] = useState<Category>('tech');
  const [questionCount, setQuestionCount] = useState<QuestionCount>(10);
  const [timeLimit, setTimeLimit] = useState<TimeLimit>(15);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState<'create' | 'join' | 'quick' | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setPlayerName(generateRandomName());
    setAvatar(generateRandomAvatar());
  }, []);

  useEffect(() => {
    const handleError = (data: { message: string }) => {
      setError(data.message);
      setLoading(null);
    };
    socket.on('error-message', handleError);
    return () => {
      socket.off('error-message', handleError);
    };
  }, [socket]);

  const handleCreateRoom = () => {
    if (!roomName.trim()) {
      setError('请输入房间名称');
      return;
    }
    setError('');
    setLoading('create');

    socket.emit(
      'create-room',
      {
        roomName: roomName.trim(),
        category,
        questionCount,
        timeLimit,
        playerName,
        avatar,
      },
      (response: { code: string }) => {
        setLoading(null);
        if (response?.code) {
          navigate(`/room/${response.code}`);
        }
      }
    );
  };

  const handleQuickMatch = () => {
    setError('');
    setLoading('quick');

    socket.emit(
      'quick-match',
      { playerName, avatar },
      (response: { code: string }) => {
        setLoading(null);
        if (response?.code) {
          navigate(`/room/${response.code}`);
        }
      }
    );
  };

  const handleJoinRoom = () => {
    if (!joinCode.trim() || joinCode.length < 6) {
      setError('请输入6位邀请码');
      return;
    }
    setError('');
    setLoading('join');

    socket.emit(
      'join-room',
      { code: joinCode.toUpperCase().trim(), playerName, avatar },
      (response: { success: boolean; message?: string }) => {
        if (response?.success) {
          navigate(`/room/${joinCode.toUpperCase().trim()}`);
        } else {
          setError(response?.message || '加入失败');
          setLoading(null);
        }
      }
    );
  };

  const handleRefreshAvatar = () => {
    setAvatar(generateRandomAvatar());
  };

  const handleCopyExample = async () => {
    const ok = await copyToClipboard(joinCode);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div style={styles.pageWrap}>
      <div style={styles.bgDecor1} />
      <div style={styles.bgDecor2} />

      <div style={styles.container}>
        <header style={styles.header}>
          <h1 style={styles.title}>
            <span style={styles.titleIcon}>⚡</span>
            <span style={styles.titleText}>知识竞技对战</span>
            <span style={styles.titleSub}>QUIZ BATTLE</span>
          </h1>
          <p style={styles.subtitle}>与全网玩家实时对战，挑战你的知识极限！</p>
        </header>

        <div style={styles.profileCard}>
          <div style={styles.profileRow}>
            <button onClick={handleRefreshAvatar} style={styles.avatarBtn} title="换一个头像">
              <span style={styles.avatarEmoji}>{avatar}</span>
              <span style={styles.avatarRefresh}>🔄</span>
            </button>
            <div style={styles.profileInputWrap}>
              <label style={styles.label}>我的昵称</label>
              <input
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="输入你的昵称"
                maxLength={12}
                style={styles.input}
              />
            </div>
          </div>
        </div>

        {error && (
          <div style={styles.errorBox}>
            <span style={{ marginRight: 8 }}>⚠️</span>
            {error}
          </div>
        )}

        <div style={styles.mainGrid}>
          <div style={styles.leftPanel}>
            <div style={styles.glassCard}>
              <div style={styles.cardHeader}>
                <span style={styles.cardIcon}>🎯</span>
                <h2 style={styles.cardTitle}>创建房间</h2>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>房间名称</label>
                <input
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="给你的房间起个名字"
                  maxLength={20}
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>题目类型</label>
                <div style={styles.chipGroup}>
                  {(['tech', 'history', 'entertainment'] as Category[]).map((c) => (
                    <button
                      key={c}
                      onClick={() => setCategory(c)}
                      style={{
                        ...styles.chip,
                        ...(category === c ? styles.chipActive : {}),
                      }}
                    >
                      {CATEGORY_LABELS[c]}
                    </button>
                  ))}
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>题目数量</label>
                <div style={styles.chipGroup}>
                  {([5, 10, 15] as QuestionCount[]).map((n) => (
                    <button
                      key={n}
                      onClick={() => setQuestionCount(n)}
                      style={{
                        ...styles.chip,
                        ...(questionCount === n ? styles.chipActive : {}),
                      }}
                    >
                      {n} 题
                    </button>
                  ))}
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>每题时间</label>
                <div style={styles.chipGroup}>
                  {([10, 15, 20] as TimeLimit[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTimeLimit(t)}
                      style={{
                        ...styles.chip,
                        ...(timeLimit === t ? styles.chipActive : {}),
                      }}
                    >
                      {t} 秒
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleCreateRoom}
                disabled={loading === 'create'}
                style={{
                  ...styles.primaryBtn,
                  ...(loading === 'create' ? styles.btnLoading : {}),
                }}
              >
                {loading === 'create' ? (
                  <span style={styles.spinner} />
                ) : (
                  <>🚀 创建房间并进入</>
                )}
              </button>
            </div>
          </div>

          <div style={styles.rightPanel}>
            <div style={styles.glassCard}>
              <div style={styles.cardHeader}>
                <span style={styles.cardIcon}>⚡</span>
                <h2 style={styles.cardTitle}>快速匹配</h2>
              </div>
              <p style={styles.cardDesc}>系统自动为你匹配正在等待的房间，立即加入战斗！</p>
              <button
                onClick={handleQuickMatch}
                disabled={loading === 'quick'}
                style={{
                  ...styles.secondaryBtn,
                  ...(loading === 'quick' ? styles.btnLoading : {}),
                }}
              >
                {loading === 'quick' ? (
                  <span style={styles.spinner} />
                ) : (
                  <>🎮 快速加入对战</>
                )}
              </button>
            </div>

            <div style={styles.dividerWrap}>
              <div style={styles.divider} />
              <span style={styles.dividerText}>或</span>
              <div style={styles.divider} />
            </div>

            <div style={styles.glassCard}>
              <div style={styles.cardHeader}>
                <span style={styles.cardIcon}>🔑</span>
                <h2 style={styles.cardTitle}>输入邀请码</h2>
              </div>
              <p style={styles.cardDesc}>已有好友的房间邀请码？输入后即可加入</p>
              <div style={styles.joinRow}>
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="6位邀请码"
                  maxLength={6}
                  style={{ ...styles.input, ...styles.codeInput }}
                  onInput={(e) => {
                    (e.target as HTMLInputElement).value = (e.target as HTMLInputElement).value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
                  }}
                />
                {joinCode.length === 6 && (
                  <button onClick={handleCopyExample} style={styles.copyBtn} title="复制邀请码">
                    {copied ? '✓' : '📋'}
                  </button>
                )}
              </div>
              <button
                onClick={handleJoinRoom}
                disabled={loading === 'join'}
                style={{
                  ...styles.primaryBtn,
                  ...(loading === 'join' ? styles.btnLoading : {}),
                }}
              >
                {loading === 'join' ? (
                  <span style={styles.spinner} />
                ) : (
                  <>🎯 加入房间</>
                )}
              </button>
            </div>
          </div>
        </div>

        <footer style={styles.footer}>
          <span>💡 提示：打开多个浏览器标签可以模拟多人对战</span>
        </footer>
      </div>

      <style>{globalStyles}</style>
    </div>
  );
};

const globalStyles = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-20px); }
  }
  @keyframes pulse-glow {
    0%, 100% { opacity: 0.4; transform: scale(1); }
    50% { opacity: 0.7; transform: scale(1.1); }
  }
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

const styles: Record<string, React.CSSProperties> = {
  pageWrap: {
    minHeight: '100vh',
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
    padding: '40px 20px',
    animation: 'fadeInUp 0.5s ease-out',
  },
  bgDecor1: {
    position: 'absolute',
    top: '-200px',
    right: '-150px',
    width: '500px',
    height: '500px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(124,58,237,0.3) 0%, transparent 70%)',
    animation: 'pulse-glow 6s ease-in-out infinite',
    pointerEvents: 'none',
  },
  bgDecor2: {
    position: 'absolute',
    bottom: '-150px',
    left: '-100px',
    width: '400px',
    height: '400px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(34,197,94,0.25) 0%, transparent 70%)',
    animation: 'pulse-glow 8s ease-in-out infinite 2s',
    pointerEvents: 'none',
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    position: 'relative',
    zIndex: 1,
  },
  header: {
    textAlign: 'center',
    marginBottom: '40px',
  },
  title: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    marginBottom: '12px',
    flexWrap: 'wrap',
  },
  titleIcon: {
    fontSize: '44px',
    animation: 'float 3s ease-in-out infinite',
  },
  titleText: {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: '42px',
    fontWeight: 900,
    background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 50%, #22d3ee 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    letterSpacing: '2px',
  },
  titleSub: {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: '16px',
    fontWeight: 600,
    color: 'rgba(167,139,250,0.5)',
    letterSpacing: '4px',
  },
  subtitle: {
    fontSize: '16px',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: '0.5px',
  },
  profileCard: {
    background: 'var(--glass-bg)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid var(--glass-border)',
    borderRadius: '16px',
    padding: '20px 24px',
    marginBottom: '24px',
  },
  profileRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    flexWrap: 'wrap',
  },
  avatarBtn: {
    position: 'relative',
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    border: '2px solid rgba(124,58,237,0.5)',
    background: 'rgba(124,58,237,0.15)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    flexShrink: 0,
    padding: 0,
  },
  avatarEmoji: {
    fontSize: '36px',
    transition: 'transform 0.2s ease',
  },
  avatarRefresh: {
    position: 'absolute',
    bottom: '-2px',
    right: '-2px',
    fontSize: '14px',
    background: '#7c3aed',
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid #0a1628',
  },
  profileInputWrap: {
    flex: 1,
    minWidth: '200px',
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '1.2fr 1fr',
    gap: '24px',
    '@media (max-width: 860px)': {
      gridTemplateColumns: '1fr',
    },
  },
  leftPanel: {
    display: 'flex',
    flexDirection: 'column',
  },
  rightPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  glassCard: {
    background: 'var(--glass-bg)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid var(--glass-border)',
    borderRadius: '16px',
    padding: '28px',
    transition: 'all 0.25s ease',
    animation: 'fadeInUp 0.4s ease-out both',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '20px',
  },
  cardIcon: {
    fontSize: '24px',
  },
  cardTitle: {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: '20px',
    fontWeight: 700,
    color: '#fff',
    letterSpacing: '0.5px',
  },
  cardDesc: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.55)',
    lineHeight: 1.6,
    marginBottom: '16px',
  },
  formGroup: {
    marginBottom: '18px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: '8px',
    letterSpacing: '0.3px',
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '10px',
    border: '1px solid rgba(124,58,237,0.25)',
    background: 'rgba(10,22,40,0.5)',
    color: '#fff',
    fontSize: '15px',
    outline: 'none',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  },
  codeInput: {
    fontSize: '20px',
    fontWeight: 700,
    letterSpacing: '4px',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  chipGroup: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
  },
  chip: {
    padding: '8px 18px',
    borderRadius: '20px',
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.04)',
    color: 'rgba(255,255,255,0.7)',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    fontFamily: 'inherit',
  },
  chipActive: {
    borderColor: '#7c3aed',
    background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(124,58,237,0.15))',
    color: '#fff',
    boxShadow: '0 0 20px rgba(124,58,237,0.3)',
  },
  primaryBtn: {
    width: '100%',
    padding: '14px 20px',
    borderRadius: '12px',
    border: 'none',
    background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
    color: '#fff',
    fontSize: '16px',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontFamily: 'inherit',
    letterSpacing: '0.5px',
    boxShadow: '0 4px 20px rgba(124,58,237,0.3)',
  },
  secondaryBtn: {
    width: '100%',
    padding: '14px 20px',
    borderRadius: '12px',
    border: '1px solid rgba(34,197,94,0.4)',
    background: 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.08))',
    color: '#fff',
    fontSize: '16px',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontFamily: 'inherit',
    letterSpacing: '0.5px',
  },
  btnLoading: {
    opacity: 0.7,
    cursor: 'not-allowed',
  },
  spinner: {
    width: '20px',
    height: '20px',
    border: '2px solid rgba(255,255,255,0.2)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  dividerWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  divider: {
    flex: 1,
    height: '1px',
    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
  },
  dividerText: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.4)',
    fontWeight: 500,
  },
  joinRow: {
    position: 'relative',
    marginBottom: '16px',
  },
  copyBtn: {
    position: 'absolute',
    right: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'transparent',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '6px',
    transition: 'all 0.15s ease',
  },
  errorBox: {
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.3)',
    color: '#fca5a5',
    padding: '12px 18px',
    borderRadius: '10px',
    fontSize: '14px',
    marginBottom: '20px',
    textAlign: 'center',
  },
  footer: {
    textAlign: 'center',
    marginTop: '40px',
    fontSize: '13px',
    color: 'rgba(255,255,255,0.35)',
  },
};

export default Lobby;
