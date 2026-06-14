import React, { useState, useEffect } from 'react';
import { userAPI, sessionAPI } from './http';

interface User {
  id: string;
  nickname: string;
  nativeLanguage: string;
  targetLanguage: string;
  avatarColor: string;
  createdAt: number;
  isOnline: boolean;
}

interface HistoryItem {
  sessionId: string;
  partner: User;
  createdAt: number;
  endedAt: number;
  duration: number;
  messageCount: number;
}

interface UserPanelProps {
  currentUser: User | null;
  onLogin: (user: User) => void;
  onStartSession: (sessionId: string, partner: User) => void;
  onViewHistory: (sessionId: string) => void;
}

const languages = [
  '中文', '英语', '日语', '韩语', '法语', '德语',
  '西班牙语', '葡萄牙语', '意大利语', '俄语', '阿拉伯语', '荷兰语'
];

const UserPanel: React.FC<UserPanelProps> = ({
  currentUser,
  onLogin,
  onStartSession,
  onViewHistory,
}) => {
  const [nickname, setNickname] = useState('');
  const [nativeLanguage, setNativeLanguage] = useState('中文');
  const [targetLanguage, setTargetLanguage] = useState('英语');
  const [partners, setPartners] = useState<User[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadSessions, setUnreadSessions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentUser) {
      loadPartners();
      loadHistory();
      loadUnread();
      
      const interval = setInterval(() => {
        loadUnread();
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [currentUser]);

  const loadPartners = async () => {
    if (!currentUser) return;
    try {
      const res: any = await userAPI.getPartners(currentUser.id);
      if (res.success) {
        setPartners(res.partners);
      }
    } catch (e) {
      console.error('Load partners error:', e);
    }
  };

  const loadHistory = async () => {
    if (!currentUser) return;
    try {
      const res: any = await sessionAPI.getHistory(currentUser.id);
      if (res.success) {
        setHistory(res.history);
      }
    } catch (e) {
      console.error('Load history error:', e);
    }
  };

  const loadUnread = async () => {
    if (!currentUser) return;
    try {
      const res: any = await userAPI.getUnread(currentUser.id);
      if (res.success) {
        setUnreadCount(res.unreadCount);
        setUnreadSessions(res.unreadSessions);
      }
    } catch (e) {
      console.error('Load unread error:', e);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return;
    
    setLoading(true);
    try {
      const res: any = await userAPI.register({
        nickname: nickname.trim(),
        nativeLanguage,
        targetLanguage,
      });
      if (res.success) {
        localStorage.setItem('lingoloop_userId', res.user.id);
        onLogin(res.user);
      }
    } catch (e) {
      console.error('Register error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleStartSession = async (partner: User) => {
    if (!currentUser) return;
    try {
      const res: any = await sessionAPI.create(currentUser.id, partner.id);
      if (res.success) {
        onStartSession(res.session.id, partner);
      }
    } catch (e) {
      console.error('Create session error:', e);
    }
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}分${seconds}秒`;
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  if (!currentUser) {
    return (
      <div className="login-container">
        <div className="login-panel">
          <h2 className="login-title">加入 LingoLoop</h2>
          <p className="login-subtitle">开始你的语言交换之旅</p>
          
          <form onSubmit={handleRegister} className="login-form">
            <div className="form-group">
              <label>昵称</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="输入你的昵称"
                className="form-input"
              />
            </div>
            
            <div className="form-group">
              <label>母语</label>
              <select
                value={nativeLanguage}
                onChange={(e) => setNativeLanguage(e.target.value)}
                className="form-select"
              >
                {languages.map((lang) => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label>想学习的语言</label>
              <select
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                className="form-select"
              >
                {languages.map((lang) => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            </div>
            
            <button type="submit" className="join-btn" disabled={loading}>
              {loading ? '加入中...' : '立即加入'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="user-panel">
      <div className="panel-header">
        <h2 className="panel-title">寻找语伴</h2>
        <div className="user-avatar-container">
          <div
            className="user-avatar-small"
            style={{ backgroundColor: currentUser.avatarColor }}
          >
            {currentUser.nickname.charAt(0).toUpperCase()}
          </div>
          {unreadCount > 0 && (
            <div className="unread-badge">{unreadCount}</div>
          )}
        </div>
      </div>

      <div className="partners-grid">
        {partners.length === 0 ? (
          <div className="empty-state">
            <p>暂无匹配的语伴</p>
            <p className="empty-state-hint">请稍候，正在为你寻找...</p>
          </div>
        ) : (
          partners.map((partner) => (
            <div key={partner.id} className="partner-card">
              <div className="partner-info">
                <div
                  className="partner-avatar"
                  style={{ backgroundColor: partner.avatarColor }}
                >
                  {partner.nickname.charAt(0).toUpperCase()}
                </div>
                <div className="partner-details">
                  <h3 className="partner-name">{partner.nickname}</h3>
                  <div className="partner-languages">
                    <span className="lang-tag native">{partner.nativeLanguage}</span>
                    <span className="lang-tag target">{partner.targetLanguage}</span>
                  </div>
                </div>
              </div>
              <button
                className="start-session-btn"
                onClick={() => handleStartSession(partner)}
              >
                开始会话
              </button>
            </div>
          ))
        )}
      </div>

      <div className={`history-section ${historyExpanded ? 'expanded' : ''}`}>
        <div
          className="history-header"
          onClick={() => setHistoryExpanded(!historyExpanded)}
        >
          <span>历史会话</span>
          <span className="history-toggle">{historyExpanded ? '▼' : '▲'}</span>
        </div>
        
        {historyExpanded && (
          <div className="history-list">
            {history.length === 0 ? (
              <div className="history-empty">暂无历史会话</div>
            ) : (
              history.map((item) => (
                <div
                  key={item.sessionId}
                  className="history-item"
                  onClick={() => onViewHistory(item.sessionId)}
                >
                  <div className="history-avatar" style={{ backgroundColor: item.partner?.avatarColor || '#ccc' }}>
                    {item.partner?.nickname?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div className="history-info">
                    <span className="history-partner">{item.partner?.nickname || '未知'}</span>
                    <span className="history-time">{formatDate(item.createdAt)}</span>
                  </div>
                  <div className="history-duration">
                    {formatDuration(item.duration)}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserPanel;
