import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  Note,
  NoteStatus,
  Comment,
  User,
  HistoryAction,
  ClientToServerEvents,
  ServerToClientEvents
} from './types';
import Board from './components/Board';
import HistoryPlayer from './components/HistoryPlayer';

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const App: React.FC = () => {
  const [socket, setSocket] = useState<AppSocket | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [originalNotes, setOriginalNotes] = useState<Note[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isPlaybackMode, setIsPlaybackMode] = useState(false);
  const [history, setHistory] = useState<HistoryAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showWelcomeModal, setShowWelcomeModal] = useState(true);
  const [userNameInput, setUserNameInput] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const newSocket: AppSocket = io({
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    newSocket.on('connect', () => {
      setConnectionStatus('connected');
      setIsLoading(false);
    });

    newSocket.on('disconnect', () => {
      setConnectionStatus('disconnected');
    });

    newSocket.on('syncBoard', (syncedNotes: Note[]) => {
      if (!isPlaybackMode) {
        setNotes(syncedNotes);
        setOriginalNotes(syncedNotes);
      }
    });

    newSocket.on('userJoined', (user: User, users: User[]) => {
      setOnlineUsers(users);
      if (newSocket.id && user.id === newSocket.id) {
        setCurrentUser(user);
      }
    });

    newSocket.on('userLeft', (_userId: string, users: User[]) => {
      setOnlineUsers(users);
    });

    newSocket.on('syncHistory', (hist: HistoryAction[]) => {
      setHistory(hist);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (socket && connectionStatus === 'connected' && !isPlaybackMode) {
      socket.emit('requestHistory');
    }
  }, [socket, connectionStatus, isPlaybackMode]);

  const handleJoin = useCallback(() => {
    if (!socket) return;
    const name = userNameInput.trim() || `用户${onlineUsers.length + 1}`;
    socket.emit('joinBoard', name);
    setShowWelcomeModal(false);
  }, [socket, userNameInput, onlineUsers.length]);

  const handleCreateNote = useCallback((content: string, status: NoteStatus) => {
    if (!socket || isPlaybackMode) return;
    socket.emit('createNote', { content, status });
  }, [socket, isPlaybackMode]);

  const handleMoveNote = useCallback((noteId: string, x: number, y: number, status: NoteStatus) => {
    if (!socket || isPlaybackMode) return;
    socket.emit('moveNote', { noteId, x, y, status });
  }, [socket, isPlaybackMode]);

  const handleUpdateNote = useCallback((noteId: string, content?: string, comments?: Comment[]) => {
    if (!socket || isPlaybackMode) return;
    socket.emit('updateNote', { noteId, content, comments });
  }, [socket, isPlaybackMode]);

  const handleDeleteNote = useCallback((noteId: string) => {
    if (!socket || isPlaybackMode) return;
    if (window.confirm('确定要删除这个便签吗？')) {
      socket.emit('deleteNote', noteId);
    }
  }, [socket, isPlaybackMode]);

  const handleStartPlayback = useCallback(() => {
    if (history.length === 0) {
      alert('暂无历史记录可供回放');
      return;
    }
    setIsPlaybackMode(true);
  }, [history.length]);

  const handleExitPlayback = useCallback(() => {
    setIsPlaybackMode(false);
    setNotes(originalNotes);
  }, [originalNotes]);

  const handleApplyHistoryState = useCallback((stateNotes: Note[]) => {
    setNotes(stateNotes);
  }, []);

  const connectionIndicator = useMemo(() => {
    const colors = {
      connecting: '#FFE66D',
      connected: '#4ECDC4',
      disconnected: '#FF6B6B'
    };
    const labels = {
      connecting: '连接中...',
      connected: '已连接',
      disconnected: '已断开'
    };
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 12,
        color: colors[connectionStatus]
      }}>
        <span style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: colors[connectionStatus],
          animation: connectionStatus === 'connecting' ? 'pulse 1s infinite' : 'none'
        }} />
        {labels[connectionStatus]}
      </span>
    );
  }, [connectionStatus]);

  if (isLoading) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1a1a2e',
        color: '#fff',
        flexDirection: 'column',
        gap: 16
      }}>
        <div style={{ fontSize: 48 }}>💡</div>
        <div style={{ fontSize: 20, fontWeight: 600 }}>灵感联萌正在启动...</div>
        {connectionIndicator}
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="app-title">
          <span className="app-title-icon">💡</span>
          <span>灵感联萌</span>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 400, marginLeft: 8 }}>
            团队协作看板
          </span>
        </div>

        <div className="header-actions">
          <div className="online-users">
            {connectionIndicator}
            <span style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
            <span className="online-users-count">{onlineUsers.length}</span>
            <span style={{ color: 'rgba(255,255,255,0.6)' }}>人在线</span>
            <div style={{ display: 'flex', gap: 4, marginLeft: 4 }}>
              {onlineUsers.slice(0, 3).map((u) => (
                <span
                  key={u.id}
                  className="user-avatar"
                  style={{ background: u.color }}
                  title={u.name}
                >
                  {u.name.charAt(0)}
                </span>
              ))}
              {onlineUsers.length > 3 && (
                <span className="user-avatar" style={{ background: 'rgba(255,255,255,0.2)' }}>
                  +{onlineUsers.length - 3}
                </span>
              )}
            </div>
          </div>

          {currentUser && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 12px',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: 20,
              fontSize: 13
            }}>
              <span
                className="user-avatar"
                style={{ background: currentUser.color, width: 20, height: 20, fontSize: 10 }}
              >
                {currentUser.name.charAt(0)}
              </span>
              <span>{currentUser.name}</span>
            </div>
          )}

          <button
            className="btn btn-secondary"
            onClick={handleStartPlayback}
            disabled={isPlaybackMode || history.length === 0}
          >
            ⏪ 回溯历史
          </button>
        </div>
      </header>

      <main className="board-container">
        <Board
          notes={notes}
          currentUser={currentUser?.name || '匿名用户'}
          isPlaybackMode={isPlaybackMode}
          onCreateNote={handleCreateNote}
          onMoveNote={handleMoveNote}
          onUpdateNote={handleUpdateNote}
          onDeleteNote={handleDeleteNote}
        />
      </main>

      {isPlaybackMode && (
        <HistoryPlayer
          history={history}
          originalNotes={originalNotes}
          onApplyHistoryState={handleApplyHistoryState}
          onExitPlayback={handleExitPlayback}
        />
      )}

      {showWelcomeModal && (
        <div className="create-note-modal-overlay">
          <div className="create-note-modal">
            <div style={{ padding: '24px 24px 8px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 8
              }}>
                <div style={{ fontSize: 36 }}>💡</div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 600 }}>欢迎来到灵感联萌</div>
                  <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
                    与团队一起协作，捕捉每一个灵感瞬间
                  </div>
                </div>
              </div>
            </div>

            <div className="edit-modal-body">
              <div className="form-group">
                <label className="form-label">输入你的昵称</label>
                <textarea
                  className="form-textarea small"
                  value={userNameInput}
                  onChange={(e) => setUserNameInput(e.target.value)}
                  placeholder="请输入昵称（不填将使用默认名称）"
                  autoFocus
                  style={{ minHeight: 44 }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleJoin();
                  }}
                />
              </div>

              <div style={{
                padding: 12,
                background: '#f5f7fa',
                borderRadius: 8,
                fontSize: 12,
                color: '#666',
                lineHeight: 1.8
              }}>
                <div style={{ fontWeight: 500, color: '#333', marginBottom: 6 }}>功能说明：</div>
                <div>• <strong style={{ color: '#FF6B6B' }}>便签分类</strong>：根据内容关键词自动分类并分配颜色</div>
                <div>• <strong style={{ color: '#4ECDC4' }}>实时协作</strong>：最多5人同时在线，操作即时同步</div>
                <div>• <strong style={{ color: '#FFE66D' }}>拖拽移动</strong>：将便签在三列之间自由拖拽</div>
                <div>• <strong style={{ color: '#A29BFE' }}>历史回放</strong>：点击「回溯历史」查看操作记录</div>
              </div>
            </div>

            <div className="edit-modal-footer">
              <button className="btn btn-primary" onClick={handleJoin} style={{ width: '100%' }}>
                🚀 进入协作看板
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default App;
