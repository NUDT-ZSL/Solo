import React, { useState, useEffect, useCallback, useMemo } from 'react';
import VoteRoom from './VoteRoom';

interface VoteOption {
  id: string;
  text: string;
  votes: number;
}

interface VoteData {
  id: string;
  code: string;
  title: string;
  description: string;
  options: VoteOption[];
  creatorId: string;
  isEnded: boolean;
  onlineCount: number;
  votedUsers: string[];
}

type View = 'home' | 'create' | 'join' | 'room';

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    color: '#e0e0e0',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  container: {
    display: 'flex',
    minHeight: '100vh',
  },
  sidebar: {
    width: '260px',
    background: 'rgba(26, 26, 46, 0.8)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderRight: '1px solid rgba(255, 107, 107, 0.2)',
    padding: '24px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  logo: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#ff6b6b',
    marginBottom: '32px',
    textAlign: 'center',
    letterSpacing: '2px',
  },
  navButton: {
    padding: '14px 20px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 107, 107, 0.3)',
    borderRadius: '10px',
    color: '#e0e0e0',
    fontSize: '15px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    textAlign: 'left',
  },
  navButtonActive: {
    background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%)',
    borderColor: '#ff6b6b',
    color: '#fff',
    boxShadow: '0 4px 15px rgba(255, 107, 107, 0.4)',
  },
  mainContent: {
    flex: 1,
    padding: '40px',
    overflowY: 'auto',
  },
  card: {
    background: 'rgba(26, 26, 46, 0.7)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '16px',
    padding: '32px',
    maxWidth: '700px',
    margin: '0 auto',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    marginBottom: '8px',
    color: '#fff',
  },
  subtitle: {
    fontSize: '14px',
    color: '#888',
    marginBottom: '32px',
  },
  formGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    color: '#aaa',
    fontWeight: 500,
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '8px',
    color: '#e0e0e0',
    fontSize: '15px',
    boxSizing: 'border-box',
    outline: 'none',
    transition: 'all 0.3s ease',
  },
  textarea: {
    width: '100%',
    padding: '12px 16px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '8px',
    color: '#e0e0e0',
    fontSize: '15px',
    boxSizing: 'border-box',
    outline: 'none',
    transition: 'all 0.3s ease',
    resize: 'vertical',
    minHeight: '80px',
    fontFamily: 'inherit',
  },
  optionRow: {
    display: 'flex',
    gap: '10px',
    marginBottom: '10px',
    alignItems: 'center',
  },
  removeBtn: {
    padding: '8px 14px',
    background: 'rgba(255, 107, 107, 0.2)',
    border: '1px solid rgba(255, 107, 107, 0.4)',
    borderRadius: '8px',
    color: '#ff6b6b',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  addBtn: {
    padding: '10px 20px',
    background: 'rgba(255, 107, 107, 0.15)',
    border: '1px dashed rgba(255, 107, 107, 0.4)',
    borderRadius: '8px',
    color: '#ff6b6b',
    cursor: 'pointer',
    width: '100%',
    fontSize: '14px',
    transition: 'all 0.3s ease',
  },
  submitBtn: {
    padding: '14px 32px',
    background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%)',
    border: 'none',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    width: '100%',
    marginTop: '16px',
    boxShadow: '0 4px 15px rgba(255, 107, 107, 0.3)',
    transition: 'all 0.3s ease',
  },
  mobileTabBar: {
    display: 'none',
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    background: 'rgba(26, 26, 46, 0.95)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderTop: '1px solid rgba(255, 107, 107, 0.2)',
    padding: '10px 0',
    zIndex: 100,
  },
  mobileTab: {
    flex: 1,
    padding: '10px',
    background: 'transparent',
    border: 'none',
    color: '#888',
    fontSize: '12px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  mobileTabActive: {
    color: '#ff6b6b',
  },
  welcome: {
    textAlign: 'center',
    padding: '60px 20px',
  },
  welcomeIcon: {
    fontSize: '64px',
    marginBottom: '24px',
  },
  welcomeTitle: {
    fontSize: '32px',
    color: '#fff',
    marginBottom: '12px',
  },
  welcomeDesc: {
    fontSize: '15px',
    color: '#888',
    lineHeight: '1.8',
    maxWidth: '480px',
    margin: '0 auto',
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: '13px',
    marginTop: '8px',
  },
  codeDisplay: {
    background: 'rgba(255, 107, 107, 0.1)',
    border: '1px solid rgba(255, 107, 107, 0.3)',
    borderRadius: '10px',
    padding: '20px',
    textAlign: 'center',
    marginTop: '20px',
  },
  codeLabel: {
    fontSize: '13px',
    color: '#888',
    marginBottom: '8px',
  },
  codeValue: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#ff6b6b',
    letterSpacing: '8px',
  },
  '@media (max-width: 768px)': {},
};

const generateCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15);
};

const App: React.FC = () => {
  const [view, setView] = useState<View>('home');
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [currentVote, setCurrentVote] = useState<VoteData | null>(null);
  const [userId] = useState<string>(generateId());
  const [isCreator, setIsCreator] = useState(false);

  const [createTitle, setCreateTitle] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createOptions, setCreateOptions] = useState<string[]>(['', '']);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [createError, setCreateError] = useState('');

  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');

  useEffect(() => {
    const socket = new WebSocket('ws://localhost:3001');

    socket.onopen = () => {
      console.log('WebSocket connected');
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleWsMessage(data);
      } catch (e) {
        console.error('Parse error:', e);
      }
    };

    socket.onclose = () => {
      console.log('WebSocket disconnected');
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    setWs(socket);

    return () => {
      socket.close();
    };
  }, []);

  const handleWsMessage = useCallback((data: any) => {
    switch (data.type) {
      case 'vote_updated':
      case 'vote_state':
        setCurrentVote(data.vote);
        break;
      case 'vote_ended':
        setCurrentVote(data.vote);
        break;
      case 'error':
        setJoinError(data.message || '操作失败');
        break;
    }
  }, []);

  const sendWsMessage = useCallback((message: any) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }, [ws]);

  const handleAddOption = () => {
    setCreateOptions([...createOptions, '']);
  };

  const handleRemoveOption = (index: number) => {
    if (createOptions.length > 2) {
      const newOptions = createOptions.filter((_, i) => i !== index);
      setCreateOptions(newOptions);
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...createOptions];
    newOptions[index] = value;
    setCreateOptions(newOptions);
  };

  const handleCreateVote = () => {
    setCreateError('');

    if (!createTitle.trim()) {
      setCreateError('请输入投票标题');
      return;
    }

    const validOptions = createOptions.filter((o) => o.trim());
    if (validOptions.length < 2) {
      setCreateError('至少需要2个有效选项');
      return;
    }

    const code = generateCode();
    const voteData: VoteData = {
      id: generateId(),
      code,
      title: createTitle.trim(),
      description: createDesc.trim(),
      options: validOptions.map((text) => ({
        id: generateId(),
        text,
        votes: 0,
      })),
      creatorId: userId,
      isEnded: false,
      onlineCount: 1,
      votedUsers: [],
    };

    sendWsMessage({ type: 'create_vote', vote: voteData });
    setCreatedCode(code);
    setCurrentVote(voteData);
    setIsCreator(true);
  };

  const handleJoinVote = () => {
    setJoinError('');

    if (!/^\d{6}$/.test(joinCode)) {
      setJoinError('请输入6位投票码');
      return;
    }

    sendWsMessage({ type: 'join_vote', code: joinCode, userId });
    setIsCreator(false);
    setCreatedCode(null);
  };

  const handleVote = (optionId: string) => {
    if (!currentVote || currentVote.isEnded) return;
    if (currentVote.votedUsers.includes(userId)) return;

    sendWsMessage({
      type: 'vote',
      voteId: currentVote.id,
      optionId,
      userId,
    });
  };

  const handleEndVote = () => {
    if (!currentVote || !isCreator) return;

    sendWsMessage({
      type: 'end_vote',
      voteId: currentVote.id,
    });
  };

  const handleBackHome = () => {
    setView('home');
    setCurrentVote(null);
    setCreatedCode(null);
    setCreateTitle('');
    setCreateDesc('');
    setCreateOptions(['', '']);
    setJoinCode('');
    setCreateError('');
    setJoinError('');
    setIsCreator(false);
  };

  const NavButton = memoNavButton();

  const renderSidebar = useMemo(
    () => (
      <div style={styles.sidebar}>
        <div style={styles.logo}>⚡ VoteHub</div>
        <NavButton
          active={view === 'home'}
          onClick={handleBackHome}
          label="🏠  首页"
        />
        <NavButton
          active={view === 'create'}
          onClick={() => setView('create')}
          label="➕  创建投票"
        />
        <NavButton
          active={view === 'join'}
          onClick={() => setView('join')}
          label="🔗  加入投票"
        />
        {currentVote && (
          <NavButton
            active={view === 'room'}
            onClick={() => setView('room')}
            label="📊  投票房间"
          />
        )}
      </div>
    ),
    [view, currentVote]
  );

  const renderCreateForm = () => (
    <div style={styles.card}>
      <h2 style={styles.title}>创建投票</h2>
      <p style={styles.subtitle}>创建一个新的实时投票房间</p>

      <div style={styles.formGroup}>
        <label style={styles.label}>投票标题</label>
        <input
          style={styles.input}
          type="text"
          placeholder="请输入投票标题"
          value={createTitle}
          onChange={(e) => setCreateTitle(e.target.value)}
        />
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label}>投票描述（可选）</label>
        <textarea
          style={styles.textarea}
          placeholder="请输入投票描述"
          value={createDesc}
          onChange={(e) => setCreateDesc(e.target.value)}
        />
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label}>投票选项（至少2个）</label>
        {createOptions.map((option, index) => (
          <div key={index} style={styles.optionRow}>
            <input
              style={{ ...styles.input, flex: 1 }}
              type="text"
              placeholder={`选项 ${index + 1}`}
              value={option}
              onChange={(e) => handleOptionChange(index, e.target.value)}
            />
            <button
              style={styles.removeBtn}
              onClick={() => handleRemoveOption(index)}
              disabled={createOptions.length <= 2}
            >
              删除
            </button>
          </div>
        ))}
        <button style={styles.addBtn} onClick={handleAddOption}>
          + 添加选项
        </button>
      </div>

      {createError && <div style={styles.errorText}>{createError}</div>}

      <button style={styles.submitBtn} onClick={handleCreateVote}>
        创建投票
      </button>

      {createdCode && (
        <div style={styles.codeDisplay}>
          <div style={styles.codeLabel}>你的投票码（分享给他人）</div>
          <div style={styles.codeValue}>{createdCode}</div>
          <button
            style={{ ...styles.submitBtn, marginTop: '20px' }}
            onClick={() => setView('room')}
          >
            进入投票房间
          </button>
        </div>
      )}
    </div>
  );

  const renderJoinForm = () => (
    <div style={styles.card}>
      <h2 style={styles.title}>加入投票</h2>
      <p style={styles.subtitle}>输入6位投票码加入房间</p>

      <div style={styles.formGroup}>
        <label style={styles.label}>投票码</label>
        <input
          style={{ ...styles.input, fontSize: '24px', letterSpacing: '8px', textAlign: 'center' }}
          type="text"
          placeholder="000000"
          maxLength={6}
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, ''))}
        />
      </div>

      {joinError && <div style={styles.errorText}>{joinError}</div>}

      <button style={styles.submitBtn} onClick={handleJoinVote}>
        加入投票
      </button>
    </div>
  );

  const renderHome = () => (
    <div style={styles.card}>
      <div style={styles.welcome}>
        <div style={styles.welcomeIcon}>🗳️</div>
        <h1 style={styles.welcomeTitle}>实时投票系统</h1>
        <p style={styles.welcomeDesc}>
          创建投票、邀请朋友、实时查看结果。
          <br />
          支持实时票数统计、可视化图表展示，让投票更有趣、更透明。
        </p>
        <div style={{ display: 'flex', gap: '16px', marginTop: '40px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button style={{ ...styles.submitBtn, width: '200px', margin: 0 }} onClick={() => setView('create')}>
            创建投票
          </button>
          <button
            style={{
              ...styles.submitBtn,
              width: '200px',
              margin: 0,
              background: 'rgba(255, 255, 255, 0.1)',
              boxShadow: 'none',
              border: '1px solid rgba(255, 107, 107, 0.4)',
            }}
            onClick={() => setView('join')}
          >
            加入投票
          </button>
        </div>
      </div>
    </div>
  );

  const renderMobileTabBar = () => (
    <div style={{ ...styles.mobileTabBar, display: window.innerWidth <= 768 ? 'flex' : 'none' }}>
      <button
        style={{ ...styles.mobileTab, ...(view === 'home' ? styles.mobileTabActive : {}) }}
        onClick={handleBackHome}
      >
        <span style={{ fontSize: '20px' }}>🏠</span>
        <span>首页</span>
      </button>
      <button
        style={{ ...styles.mobileTab, ...(view === 'create' ? styles.mobileTabActive : {}) }}
        onClick={() => setView('create')}
      >
        <span style={{ fontSize: '20px' }}>➕</span>
        <span>创建</span>
      </button>
      <button
        style={{ ...styles.mobileTab, ...(view === 'join' ? styles.mobileTabActive : {}) }}
        onClick={() => setView('join')}
      >
        <span style={{ fontSize: '20px' }}>🔗</span>
        <span>加入</span>
      </button>
      {currentVote && (
        <button
          style={{ ...styles.mobileTab, ...(view === 'room' ? styles.mobileTabActive : {}) }}
          onClick={() => setView('room')}
        >
          <span style={{ fontSize: '20px' }}>📊</span>
          <span>房间</span>
        </button>
      )}
    </div>
  );

  const mainContentStyle: React.CSSProperties =
    view === 'room' && window.innerWidth <= 768
      ? { ...styles.mainContent, padding: '16px', paddingBottom: '80px' }
      : { ...styles.mainContent, paddingBottom: window.innerWidth <= 768 ? '80px' : '40px' };

  return (
    <div style={styles.app}>
      <style>{`
        input:focus, textarea:focus {
          border-color: #ff6b6b !important;
          box-shadow: 0 0 0 3px rgba(255, 107, 107, 0.15) !important;
        }
        button:hover:not(:disabled) {
          transform: translateY(-2px);
        }
        @media (max-width: 768px) {
          div[data-sidebar] {
            display: none !important;
          }
        }
      `}</style>
      <div style={styles.container}>
        <div data-sidebar style={styles.sidebar}>
          <div style={styles.logo}>⚡ VoteHub</div>
          <NavButton
            active={view === 'home'}
            onClick={handleBackHome}
            label="🏠  首页"
          />
          <NavButton
            active={view === 'create'}
            onClick={() => setView('create')}
            label="➕  创建投票"
          />
          <NavButton
            active={view === 'join'}
            onClick={() => setView('join')}
            label="🔗  加入投票"
          />
          {currentVote && (
            <NavButton
              active={view === 'room'}
              onClick={() => setView('room')}
              label="📊  投票房间"
            />
          )}
        </div>

        <div style={mainContentStyle}>
          {view === 'home' && renderHome()}
          {view === 'create' && renderCreateForm()}
          {view === 'join' && renderJoinForm()}
          {view === 'room' && currentVote && (
            <VoteRoom
              vote={currentVote}
              userId={userId}
              isCreator={isCreator}
              onVote={handleVote}
              onEndVote={handleEndVote}
              onBack={handleBackHome}
            />
          )}
          {view === 'room' && !currentVote && (
            <div style={styles.card}>
              <h2 style={styles.title}>暂无投票</h2>
              <p style={styles.subtitle}>请先创建或加入一个投票</p>
              <button style={styles.submitBtn} onClick={handleBackHome}>
                返回首页
              </button>
            </div>
          )}
        </div>
      </div>
      {renderMobileTabBar()}
    </div>
  );
};

interface NavButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
}

function memoNavButton() {
  return React.memo<NavButtonProps>(({ active, onClick, label }) => (
    <button
      style={{
        ...styles.navButton,
        ...(active ? styles.navButtonActive : {}),
      }}
      onClick={onClick}
    >
      {label}
    </button>
  ));
}

export default App;
