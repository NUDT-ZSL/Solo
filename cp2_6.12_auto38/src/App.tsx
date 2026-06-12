import React, { useState, useEffect, useMemo } from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import StaffEditor from './components/StaffEditor';
import NoteToolbar from './components/NoteToolbar';
import CollaboratorPanel from './components/CollaboratorPanel';
import type { Note, Score, Collaborator, NoteDuration } from './types';
import { DURATION_VALUES, midiToFreq } from './types';

const USER_COLORS = ['#3b82f6', '#f97316', '#22c55e', '#a855f7', '#ec4899'];
const USER_NAMES = ['用户A', '用户B', '用户C', '用户D', '用户E'];

const App: React.FC = () => {
  return (
    <div className="app-container">
      <Routes>
        <Route path="/" element={<ScoreListPage />} />
        <Route path="/score/:id" element={<EditorPage />} />
      </Routes>
    </div>
  );
};

const ScoreListPage: React.FC = () => {
  const navigate = useNavigate();
  const [scores, setScores] = useState<Score[]>([]);
  const [newName, setNewName] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const s = io('http://localhost:3001', { transports: ['websocket', 'polling'] });
    setSocket(s);
    s.emit('score:list', (list: Score[]) => setScores(list));
    s.on('score:list', (list: Score[]) => setScores(list));
    return () => { s.disconnect(); };
  }, []);

  const handleCreate = () => {
    if (!newName.trim() || !socket) return;
    socket.emit('score:create', newName.trim(), (score: Score) => {
      setNewName('');
      navigate(`/score/${score.id}`);
    });
  };

  return (
    <div className="score-list-page">
      <h1 className="page-title">🎼 协同乐谱编辑器</h1>
      <p className="page-subtitle">多人实时协作编辑，五线谱可视化编辑，Web Audio 实时播放</p>

      <div className="create-section">
        <input
          className="name-input"
          placeholder="输入新乐谱名称..."
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
        />
        <button className="btn btn-primary" onClick={handleCreate}>+ 创建乐谱</button>
      </div>

      {scores.length === 0 ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
          暂无乐谱，创建一个开始吧~
        </div>
      ) : (
        <div className="score-list">
          {scores.map(s => (
            <div key={s.id} className="score-card" onClick={() => navigate(`/score/${s.id}`)}>
              <div className="score-card-title">📜 {s.name}</div>
              <div className="score-card-meta">
                {s.notes.length} 个音符 · {new Date(s.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const EditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [score, setScore] = useState<Score | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingNoteId, setPlayingNoteId] = useState<string | null>(null);
  const [userId] = useState(() => 'u_' + Math.random().toString(36).slice(2, 9));
  const [userIndex] = useState(() => Math.floor(Math.random() * 5));
  const [mobileLeftOpen, setMobileLeftOpen] = useState(false);
  const [mobileRightOpen, setMobileRightOpen] = useState(false);
  const [recentRemoteActions, setRecentRemoteActions] = useState<Map<string, { type: string; time: number }>>(new Map());

  const myInfo = useMemo(() => ({
    id: userId,
    name: USER_NAMES[userIndex],
    color: USER_COLORS[userIndex],
    avatar: USER_NAMES[userIndex].slice(-1),
  }), [userId, userIndex]);

  useEffect(() => {
    if (!id) return;
    const s = io('http://localhost:3001', { transports: ['websocket', 'polling'] });
    setSocket(s);

    s.emit('score:join', { scoreId: id, user: { ...myInfo, selectedNoteId: null } });

    s.on('score:state', (state: { score: Score; collaborators: Collaborator[] }) => {
      setScore(state.score);
      setNotes(state.score.notes);
      setCollaborators(state.collaborators.filter(c => c.id !== userId));
    });

    s.on('collaborators', (list: Collaborator[]) => {
      setCollaborators(list.filter(c => c.id !== userId));
    });

    s.on('note:add', ({ note, userId: uid }: { note: Note; userId: string }) => {
      setNotes(prev => [...prev, note]);
      if (uid !== userId) {
        setRecentRemoteActions(prev => {
          const m = new Map(prev);
          m.set(note.id, { type: 'add', time: Date.now() });
          return m;
        });
        setTimeout(() => {
          setRecentRemoteActions(prev => {
            const m = new Map(prev);
            m.delete(note.id);
            return m;
          });
        }, 300);
      }
    });

    s.on('note:update', ({ noteId, changes, userId: uid }: { noteId: string; changes: Partial<Note>; userId: string }) => {
      setNotes(prev => prev.map(n => n.id === noteId ? { ...n, ...changes } : n));
    });

    s.on('note:delete', ({ noteId, userId: uid }: { noteId: string; userId: string }) => {
      if (uid !== userId) {
        setRecentRemoteActions(prev => {
          const m = new Map(prev);
          m.set(noteId, { type: 'delete', time: Date.now() });
          return m;
        });
        setTimeout(() => {
          setNotes(prev => prev.filter(n => n.id !== noteId));
          setRecentRemoteActions(prev => {
            const m = new Map(prev);
            m.delete(noteId);
            return m;
          });
        }, 300);
      } else {
        setNotes(prev => prev.filter(n => n.id !== noteId));
      }
      setSelectedNoteId(prev => prev === noteId ? null : prev);
    });

    return () => { s.disconnect(); };
  }, [id, userId, myInfo]);

  const addNote = (note: Note) => {
    if (!socket) return;
    socket.emit('note:add', { scoreId: id, note });
    setNotes(prev => [...prev, note]);
    setSelectedNoteId(note.id);
    emitCursor(note.x, note.y, note.id);
  };

  const updateNote = (noteId: string, changes: Partial<Note>) => {
    if (!socket) return;
    socket.emit('note:update', { scoreId: id, noteId, changes });
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, ...changes } : n));
  };

  const deleteNote = (noteId: string) => {
    if (!socket) return;
    socket.emit('note:delete', { scoreId: id, noteId });
    setNotes(prev => prev.filter(n => n.id !== noteId));
    if (selectedNoteId === noteId) setSelectedNoteId(null);
  };

  const emitCursor = (x: number, y: number, noteId: string | null) => {
    if (!socket) return;
    socket.emit('cursor:move', { scoreId: id, x, y, noteId, userId });
  };

  const handleSelect = (noteId: string | null) => {
    setSelectedNoteId(noteId);
    if (noteId) {
      const note = notes.find(n => n.id === noteId);
      if (note) emitCursor(note.x, note.y, noteId);
    }
  };

  const selectedNote = notes.find(n => n.id === selectedNoteId) || null;

  const handlePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }
    if (notes.length === 0) return;
    setIsPlaying(true);
    playNotes();
  };

  const playNotes = async () => {
    let audioCtx: AudioContext | null = null;
    try {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch { return; }

    const sorted = [...notes].sort((a, b) => a.x - b.x);
    const baseMs = 500 / playbackSpeed;

    for (let i = 0; i < sorted.length; i++) {
      if (!isPlayingRef.current) break;
      const note = sorted[i];
      setPlayingNoteId(note.id);
      playTone(audioCtx, note.pitch, DURATION_VALUES[note.duration] * baseMs / 1000);

      const delay = DURATION_VALUES[note.duration] * baseMs;
      await new Promise(r => setTimeout(r, delay));
      setPlayingNoteId(null);
      // small gap between notes
      await new Promise(r => setTimeout(r, 30));
    }
    setIsPlaying(false);
    setPlayingNoteId(null);
    audioCtx.close();
  };

  const isPlayingRef = React.useRef(isPlaying);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  const playTone = (ctx: AudioContext, pitch: number, duration: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = midiToFreq(pitch);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  };

  return (
    <div className="editor-layout">
      <div className="editor-header">
        <div className="header-left">
          <button className="back-btn" onClick={() => navigate('/')}>← 返回</button>
          <span className="score-title-display">📜 {score?.name || '加载中...'}</span>
        </div>
        <div className="header-right">
          <span style={{ color: '#94a3b8', fontSize: 12 }}>{myInfo.name}</span>
          <select
            className="speed-select"
            value={playbackSpeed}
            onChange={e => setPlaybackSpeed(Number(e.target.value))}
          >
            <option value={0.5}>0.5x</option>
            <option value={1}>1x</option>
            <option value={1.5}>1.5x</option>
            <option value={2}>2x</option>
          </select>
          <button className={`play-btn ${isPlaying ? 'playing' : ''}`} onClick={handlePlay}>
            {isPlaying ? '⏹ 停止' : '▶ 播放'}
          </button>
        </div>
      </div>

      <div className="mobile-toolbar">
        <button
          className={`panel-toggle ${mobileLeftOpen ? 'active' : ''}`}
          onClick={() => { setMobileLeftOpen(o => !o); setMobileRightOpen(false); }}
        >🎵 音符属性</button>
        <button
          className={`panel-toggle ${mobileRightOpen ? 'active' : ''}`}
          onClick={() => { setMobileRightOpen(o => !o); setMobileLeftOpen(false); }}
        >👥 协作者 ({collaborators.length})</button>
      </div>

      <div className="editor-main">
        <div className={`side-panel ${mobileLeftOpen ? 'open' : ''}`}>
          <NoteToolbar
            selectedNote={selectedNote}
            onUpdateNote={updateNote}
            onDeleteNote={deleteNote}
          />
        </div>

        <div className="staff-container">
          <StaffEditor
            notes={notes}
            selectedNoteId={selectedNoteId}
            playingNoteId={playingNoteId}
            collaborators={collaborators}
            remoteActions={recentRemoteActions}
            onAddNote={addNote}
            onUpdateNote={updateNote}
            onSelectNote={handleSelect}
            onCursorMove={emitCursor}
          />
        </div>

        <div className={`side-panel right ${mobileRightOpen ? 'open' : ''}`}>
          <CollaboratorPanel
            me={myInfo}
            collaborators={collaborators}
            notes={notes}
            selectedNoteId={selectedNoteId}
          />
        </div>
      </div>
    </div>
  );
};

export default App;
