import React, { useState, useEffect } from 'react';
import { templates } from './utils/templates';
import { cardsApi, authApi, favoritesApi } from './utils/api';
import type { Card, Template, User } from './types';
import CreateCard from './pages/CreateCard';
import SendCard from './pages/SendCard';
import ViewCard from './pages/ViewCard';

type Page = 'home' | 'create' | 'send' | 'view' | 'login' | 'register';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [user, setUser] = useState<User | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
  const [viewToken, setViewToken] = useState<string | null>(null);
  const [deleteCardId, setDeleteCardId] = useState<number | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');

    if (tokenParam) {
      setViewToken(tokenParam);
      setCurrentPage('view');
      return;
    }

    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      loadCards();
      loadFavorites();
    } else {
      setCurrentPage('login');
    }
  }, []);

  const loadCards = async () => {
    try {
      const data = await cardsApi.getAll() as Card[];
      setCards(data);
    } catch (err) {
      console.error('Failed to load cards:', err);
    }
  };

  const loadFavorites = async () => {
    try {
      const data = await favoritesApi.getAll() as any[];
      setFavorites(data);
    } catch (err) {
      console.error('Failed to load favorites:', err);
    }
  };

  const handleLogin = async (email: string, password: string) => {
    try {
      const result: any = await authApi.login(email, password);
      localStorage.setItem('token', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));
      setUser(result.user);
      setCurrentPage('home');
      loadCards();
      loadFavorites();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRegister = async (email: string, nickname: string, password: string) => {
    try {
      const result: any = await authApi.register(email, nickname, password);
      localStorage.setItem('token', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));
      setUser(result.user);
      setCurrentPage('home');
      loadCards();
      loadFavorites();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setCards([]);
    setCurrentPage('login');
  };

  const handleCardClick = (cardId: number) => {
    setSelectedCardId(cardId);
    setCurrentPage('create');
  };

  const handleCreateNew = () => {
    setSelectedCardId(null);
    setCurrentPage('create');
  };

  const handleCardSaved = (cardId: number) => {
    setSelectedCardId(cardId);
    setCurrentPage('send');
  };

  const handleLongPressStart = (cardId: number) => {
    const timer = setTimeout(() => {
      setDeleteCardId(cardId);
    }, 600);
    setLongPressTimer(timer);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (deleteCardId) {
      try {
        await cardsApi.delete(deleteCardId);
        setCards(cards.filter(c => c.id !== deleteCardId));
      } catch (err) {
        console.error('Failed to delete card:', err);
      }
      setDeleteCardId(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteCardId(null);
  };

  const getTemplateById = (templateId: number): Template | undefined => {
    return templates.find(t => t.id === templateId);
  };

  const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    useEffect(() => {
      const savedEmail = localStorage.getItem('lastEmail');
      if (savedEmail) setEmail(savedEmail);
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      localStorage.setItem('lastEmail', email);
      handleLogin(email, password);
    };

    return (
      <div style={styles.authContainer}>
        <div style={styles.authCard}>
          <h1 style={styles.authTitle}>节日贺卡</h1>
          <p style={styles.authSubtitle}>登录您的账户</p>
          <form onSubmit={handleSubmit} style={styles.authForm}>
            <input
              type="email"
              placeholder="邮箱"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={styles.input}
              required
            />
            <input
              type="password"
              placeholder="密码"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={styles.input}
              required
            />
            <button type="submit" style={styles.authButton}>登录</button>
          </form>
          <p style={styles.authLink}>
            还没有账户？ <span onClick={() => setCurrentPage('register')} style={styles.linkText}>立即注册</span>
          </p>
        </div>
      </div>
    );
  };

  const RegisterPage = () => {
    const [email, setEmail] = useState('');
    const [nickname, setNickname] = useState('');
    const [password, setPassword] = useState('');

    const validatePassword = (pwd: string): boolean => {
      if (pwd.length < 6 || pwd.length > 20) return false;
      if (!/\d/.test(pwd)) return false;
      if (!/[a-zA-Z]/.test(pwd)) return false;
      return true;
    };

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!validatePassword(password)) {
        alert('密码长度6-20位，至少包含一个数字和一个字母');
        return;
      }
      handleRegister(email, nickname, password);
    };

    return (
      <div style={styles.authContainer}>
        <div style={styles.authCard}>
          <h1 style={styles.authTitle}>节日贺卡</h1>
          <p style={styles.authSubtitle}>创建新账户</p>
          <form onSubmit={handleSubmit} style={styles.authForm}>
            <input
              type="email"
              placeholder="邮箱"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={styles.input}
              required
            />
            <input
              type="text"
              placeholder="昵称"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              style={styles.input}
              required
            />
            <input
              type="password"
              placeholder="密码（6-20位，含数字和字母）"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={styles.input}
              required
            />
            <button type="submit" style={styles.authButton}>注册</button>
          </form>
          <p style={styles.authLink}>
            已有账户？ <span onClick={() => setCurrentPage('login')} style={styles.linkText}>立即登录</span>
          </p>
        </div>
      </div>
    );
  };

  const HomePage = () => (
    <div style={styles.homeContainer}>
      <header style={styles.header}>
        <h1 style={styles.headerTitle}>我的贺卡</h1>
        <div style={styles.headerActions}>
          <button onClick={handleCreateNew} className="btn-primary" style={styles.createBtn}>
            + 创建新贺卡
          </button>
          <button onClick={handleLogout} style={styles.logoutBtn}>退出</button>
        </div>
      </header>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>我创建的</h2>
        <div style={styles.cardGrid}>
          {cards.length === 0 ? (
            <p style={styles.emptyText}>还没有贺卡，点击上方按钮创建第一个吧！</p>
          ) : (
            cards.map(card => {
              const template = getTemplateById(card.template_id);
              return (
                <div
                  key={card.id}
                  style={{
                    ...styles.cardItem,
                    background: template?.colors.background || '#fff',
                  }}
                  onClick={() => handleCardClick(card.id)}
                  onMouseDown={() => handleLongPressStart(card.id)}
                  onMouseUp={handleLongPressEnd}
                  onMouseLeave={handleLongPressEnd}
                  onTouchStart={() => handleLongPressStart(card.id)}
                  onTouchEnd={handleLongPressEnd}
                >
                  <div style={styles.cardThumbnail}>
                    {template ? (
                      <>
                        <div style={{ ...styles.templatePreview, background: template.colors.primary }}>
                          <span style={styles.templateEmoji}>
                            {template.decorations[0]}{template.decorations[1]}
                          </span>
                        </div>
                        <p style={styles.cardName}>{template.name}</p>
                      </>
                    ) : (
                      <p style={styles.cardName}>未知模板</p>
                    )}
                  </div>
                  <p style={styles.cardDate}>
                    {new Date(card.created_at).toLocaleDateString()}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>我的收藏</h2>
        <div style={styles.cardGrid}>
          {favorites.length === 0 ? (
            <p style={styles.emptyText}>暂无收藏的贺卡</p>
          ) : (
            favorites.map(fav => {
              const template = getTemplateById(fav.card.template_id);
              return (
                <div
                  key={fav.id}
                  style={{
                    ...styles.cardItem,
                    background: template?.colors.background || '#fff',
                  }}
                  onClick={() => {
                    setSelectedCardId(fav.cardId);
                    setCurrentPage('create');
                  }}
                >
                  <div style={styles.cardThumbnail}>
                    {template ? (
                      <>
                        <div style={{ ...styles.templatePreview, background: template.colors.primary }}>
                          <span style={styles.templateEmoji}>
                            {template.decorations[0]}{template.decorations[1]}
                          </span>
                        </div>
                        <p style={styles.cardName}>{template.name}</p>
                      </>
                    ) : (
                      <p style={styles.cardName}>未知模板</p>
                    )}
                  </div>
                  <p style={styles.cardDate}>
                    {new Date(fav.createdAt).toLocaleDateString()}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>

      {deleteCardId !== null && (
        <div style={styles.modalOverlay} onClick={handleDeleteCancel}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>确认删除</h3>
            <p style={styles.modalText}>确定要删除这张贺卡吗？删除后无法恢复。</p>
            <div style={styles.modalButtons}>
              <button onClick={handleDeleteCancel} style={styles.modalCancelBtn}>取消</button>
              <button onClick={handleDeleteConfirm} style={styles.modalConfirmBtn}>确认删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (currentPage === 'login') return <LoginPage />;
  if (currentPage === 'register') return <RegisterPage />;
  if (currentPage === 'create') return (
    <CreateCard
      cardId={selectedCardId}
      onBack={() => setCurrentPage('home')}
      onSaved={handleCardSaved}
    />
  );
  if (currentPage === 'send' && selectedCardId) return (
    <SendCard
      cardId={selectedCardId}
      onBack={() => setCurrentPage('create')}
      onSent={() => setCurrentPage('home')}
    />
  );
  if (currentPage === 'view' && viewToken) return (
    <ViewCard token={viewToken} />
  );

  return <HomePage />;
};

const styles: Record<string, React.CSSProperties> = {
  authContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #fdf6ee 0%, #ffede0 100%)',
  },
  authCard: {
    width: '100%',
    maxWidth: '400px',
    padding: '40px 30px',
    background: 'white',
    borderRadius: '16px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    textAlign: 'center',
  },
  authTitle: {
    fontSize: '28px',
    color: '#4a4a4a',
    marginBottom: '8px',
  },
  authSubtitle: {
    fontSize: '14px',
    color: '#999',
    marginBottom: '30px',
  },
  authForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginBottom: '20px',
  },
  input: {
    padding: '12px 16px',
    border: '1px solid #ccc',
    borderRadius: '8px',
    fontSize: '14px',
    transition: 'border-color 0.3s ease',
    outline: 'none',
  },
  authButton: {
    padding: '12px',
    background: 'linear-gradient(135deg, #ff8c42, #ff6f42)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  authLink: {
    fontSize: '14px',
    color: '#666',
  },
  linkText: {
    color: '#ff6f42',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
  homeContainer: {
    minHeight: '100vh',
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
  },
  headerTitle: {
    fontSize: '28px',
    color: '#4a4a4a',
  },
  headerActions: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  createBtn: {
    background: 'linear-gradient(135deg, #ff8c42, #ff6f42)',
    color: 'white',
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  logoutBtn: {
    background: 'none',
    border: 'none',
    color: '#999',
    fontSize: '14px',
    cursor: 'pointer',
  },
  section: {
    marginBottom: '30px',
  },
  sectionTitle: {
    fontSize: '20px',
    color: '#4a4a4a',
    marginBottom: '16px',
  },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '20px',
  },
  cardItem: {
    borderRadius: '12px',
    padding: '16px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    minHeight: '280px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    userSelect: 'none',
  },
  cardThumbnail: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  templatePreview: {
    width: '100px',
    height: '140px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '12px',
  },
  templateEmoji: {
    fontSize: '32px',
  },
  cardName: {
    fontSize: '16px',
    color: '#333',
    fontWeight: '500',
  },
  cardDate: {
    fontSize: '12px',
    color: '#999',
    textAlign: 'center',
  },
  emptyText: {
    color: '#999',
    fontSize: '14px',
    gridColumn: '1 / -1',
    textAlign: 'center',
    padding: '40px',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    background: 'white',
    borderRadius: '16px',
    padding: '30px',
    maxWidth: '400px',
    width: '90%',
    textAlign: 'center',
  },
  modalTitle: {
    fontSize: '20px',
    color: '#333',
    marginBottom: '12px',
  },
  modalText: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '24px',
  },
  modalButtons: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
  },
  modalCancelBtn: {
    padding: '10px 24px',
    background: '#f0f0f0',
    color: '#666',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background 0.3s ease',
  },
  modalConfirmBtn: {
    padding: '10px 24px',
    background: 'linear-gradient(135deg, #ff8c42, #ff6f42)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.3s ease',
  },
};

export default App;
