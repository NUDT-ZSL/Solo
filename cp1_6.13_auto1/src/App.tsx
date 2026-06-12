import { useState, useEffect, useCallback } from 'react';
import { useSocket } from './hooks/useSocket';
import Board from './components/Board';
import Sidebar from './components/Sidebar';
import { User, Session, Note } from './types';

export default function App() {
  const [step, setStep] = useState<'home' | 'in-session'>('home');
  const [mode, setMode] = useState<'create' | 'join'>('create');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [hostName, setHostName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joinName, setJoinName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [draggingUsers, setDraggingUsers] = useState<Record<string, User>>({});
  const [voting, setVoting] = useState(false);
  const [voteCandidates, setVoteCandidates] = useState<string[]>([]);

  const { connect, on, off, emit } = useSocket();

  const setupSocketListeners = useCallback(() => {
    on<{ user: User; users: User[] }>('user_joined', ({ users }) => {
      setUsers(users);
    });

    on<{ user: User; users: User[] }>('user_left', ({ users }) => {
      setUsers(users);
    });

    on<Note>('note_added', (note) => {
      setNotes((prev) => (prev.find((n) => n.id === note.id) ? prev : [...prev, note]));
    });

    on<{ note: Note; userId: string; userName: string; userColor: string }>(
      'note_updated',
      ({ note }) => {
        setNotes((prev) => prev.map((n) => (n.id === note.id ? note : n)));
      }
    );

    on<{ noteId: string; user: User }>('note_drag_started', ({ noteId, user }) => {
      setDraggingUsers((prev) => ({ ...prev, [noteId]: user }));
    });

    on<{ noteId: string; user: User }>('note_drag_ended', ({ noteId }) => {
      setDraggingUsers((prev) => {
        const copy = { ...prev };
        delete copy[noteId];
        return copy;
      });
    });

    on<{ noteId: string }>('note_deleted', ({ noteId }) => {
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    });

    on<{ note: Note; userId: string }>('note_voted', ({ note }) => {
      setNotes((prev) => prev.map((n) => (n.id === note.id ? note : n)));
    });

    on<{ voting: boolean; voteCandidates: string[] }>('voting_started', (data) => {
      setVoting(data.voting);
      setVoteCandidates(data.voteCandidates);
    });

    on<{ voting: boolean; voteCandidates: string[] }>('voting_ended', (data) => {
      setVoting(data.voting);
      setVoteCandidates(data.voteCandidates);
    });
  }, [on]);

  useEffect(() => {
    if (step === 'in-session') {
      connect();
      setupSocketListeners();
    }
    return () => {
      off('user_joined');
      off('user_left');
      off('note_added');
      off('note_updated');
      off('note_drag_started');
      off('note_drag_ended');
      off('note_deleted');
      off('note_voted');
      off('voting_started');
      off('voting_ended');
    };
  }, [step, connect, setupSocketListeners, off]);

  useEffect(() => {
    if (step === 'in-session' && session && currentUser) {
      emit('join_session', { sessionId: session.id, user: currentUser });
    }
  }, [step, session, currentUser, emit]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const dl = deadline ? new Date(deadline).getTime() : Date.now() + 3600000;
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          deadline: dl,
          hostName,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '创建失败');
      }
      const data = await res.json();
      setSession(data.session);
      setCurrentUser(data.host);
      setUsers(data.session.users);
      setNotes(data.session.notes);
      setVoting(data.session.voting);
      setVoteCandidates(data.session.voteCandidates);
      setStep('in-session');
    } catch (err: any) {
      setError(err.message || '创建会议失败');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/sessions/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: joinCode.toUpperCase(), userName: joinName }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '加入失败');
      }
      const data = await res.json();
      setSession(data.session);
      setCurrentUser(data.user);
      setUsers(data.session.users);
      setNotes(data.session.notes);
      setVoting(data.session.voting);
      setVoteCandidates(data.session.voteCandidates);
      setStep('in-session');
    } catch (err: any) {
      setError(err.message || '加入会议失败');
    } finally {
      setLoading(false);
    }
  };

  const handleEndSession = () => {
    setStep('home');
    setSession(null);
    setCurrentUser(null);
    setNotes([]);
    setUsers([]);
    setVoting(false);
    setVoteCandidates([]);
    setTitle('');
    setDescription('');
    setDeadline('');
    setHostName('');
    setJoinCode('');
    setJoinName('');
  };

  if (step === 'home') {
    return (
      <div style={styles.homeWrap} className="home-wrap">
        <div style={styles.homeCard} className="home-card">
          <h1 style={styles.homeTitle} className="home-title">IdeaVote</h1>
          <p style={styles.homeSubtitle} className="home-subtitle">团队头脑风暴与投票决策</p>

          <div style={styles.tabBar} className="tab-bar">
            <button
              onClick={() => setMode('create')}
              className="tab-btn"
              style={{
                ...styles.tabBtn,
                ...(mode === 'create' ? styles.tabBtnActive : {}),
              }}
            >
              创建会议
            </button>
            <button
              onClick={() => setMode('join')}
              className="tab-btn"
              style={{
                ...styles.tabBtn,
                ...(mode === 'join' ? styles.tabBtnActive : {}),
              }}
            >
              加入会议
            </button>
          </div>

          {error && <div style={styles.errorBox} className="error-box">{error}</div>}

          {mode === 'create' ? (
            <form onSubmit={handleCreate} style={styles.form} className="form-wrap">
              <label style={styles.label} className="form-label">会议标题 *</label>
              <input
                style={styles.input}
                className="form-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例如：Q3产品方向讨论"
                required
              />
              <label style={styles.label} className="form-label">会议描述</label>
              <textarea
                style={{ ...styles.input, height: 80, resize: 'vertical' }}
                className="form-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="简短描述会议的目标..."
              />
              <label style={styles.label} className="form-label">截止时间</label>
              <input
                type="datetime-local"
                style={styles.input}
                className="form-input"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
              <label style={styles.label} className="form-label">你的名字 *</label>
              <input
                style={styles.input}
                className="form-input"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                placeholder="请输入你的名字"
                required
              />
              <button
                type="submit"
                style={styles.primaryBtn}
                className="form-primary-btn"
                disabled={loading}
              >
                {loading ? '创建中...' : '创建会议'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoin} style={styles.form} className="form-wrap">
              <label style={styles.label} className="form-label">邀请码 *</label>
              <input
                style={{ ...styles.input, textTransform: 'uppercase', letterSpacing: 4 }}
                className="form-input"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="例如：ABCDEF"
                maxLength={6}
                required
              />
              <label style={styles.label} className="form-label">你的名字 *</label>
              <input
                style={styles.input}
                className="form-input"
                value={joinName}
                onChange={(e) => setJoinName(e.target.value)}
                placeholder="请输入你的名字"
                required
              />
              <button
                type="submit"
                style={styles.primaryBtn}
                className="form-primary-btn"
                disabled={loading}
              >
                {loading ? '加入中...' : '加入会议'}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  if (!session || !currentUser) return null;

  const isHost = currentUser.id === session.hostId;

  return (
    <div style={styles.app}>
      <Sidebar
        session={session}
        users={users}
        currentUserId={currentUser.id}
        isHost={isHost}
        onEndSession={handleEndSession}
      />
      <Board
        notes={notes}
        setNotes={setNotes}
        session={session}
        currentUser={currentUser}
        isHost={isHost}
        emit={emit}
        draggingUsers={draggingUsers}
        voting={voting}
        voteCandidates={voteCandidates}
        setVoting={setVoting}
        setVoteCandidates={setVoteCandidates}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  homeWrap: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background:
      'radial-gradient(circle at 20% 20%, #e0e7ff 0%, transparent 50%), radial-gradient(circle at 80% 80%, #fce7f3 0%, transparent 50%), #f1f5f9',
  },
  homeCard: {
    width: 420,
    maxWidth: '92vw',
    background: '#fff',
    borderRadius: 16,
    padding: 36,
    boxShadow: '0 10px 40px rgba(15, 23, 42, 0.08)',
  },
  homeTitle: {
    fontSize: 32,
    fontWeight: 700,
    color: '#1e293b',
    textAlign: 'center',
  },
  homeSubtitle: {
    textAlign: 'center',
    color: '#64748b',
    marginTop: 6,
    marginBottom: 28,
    fontSize: 14,
  },
  tabBar: {
    display: 'flex',
    gap: 8,
    marginBottom: 20,
    background: '#f1f5f9',
    padding: 4,
    borderRadius: 10,
  },
  tabBtn: {
    flex: 1,
    padding: '10px 12px',
    border: 'none',
    borderRadius: 8,
    background: 'transparent',
    color: '#64748b',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontSize: 14,
  },
  tabBtnActive: {
    background: '#fff',
    color: '#1e293b',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 13,
    color: '#475569',
    fontWeight: 500,
    marginTop: 8,
  },
  input: {
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #e2e8f0',
    fontSize: 14,
    outline: 'none',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
  },
  primaryBtn: {
    marginTop: 20,
    padding: '12px 16px',
    borderRadius: 8,
    border: 'none',
    background: '#6366f1',
    color: '#fff',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontSize: 15,
  },
  errorBox: {
    padding: 10,
    background: '#fef2f2',
    color: '#b91c1c',
    borderRadius: 8,
    fontSize: 13,
    marginBottom: 12,
  },
  app: {
    width: '100%',
    height: '100%',
    display: 'flex',
    overflow: 'hidden',
  },
};
