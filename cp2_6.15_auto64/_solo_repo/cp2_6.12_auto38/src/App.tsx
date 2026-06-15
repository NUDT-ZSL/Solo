import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
  const [recentRemoteActions, setRecentRemoteActions] = useState<Map<string, { type: string; time: number; prev?: Note }>>(new Map());
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const playbackSpeedRef = useRef(playbackSpeed);
  const isPlayingRef = useRef(isPlaying);
  const notesRef = useRef(notes);

  useEffect(() => { playbackSpeedRef.current = playbackSpeed; }, [playbackSpeed]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { notesRef.current = notes; }, [notes]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const myInfo = useMemo(() => ({
    id: userId,
    name: USER_NAMES[userIndex],
    color: USER_COLORS[userIndex],
    avatar: USER_NAMES[userIndex].slice(-1),
  }), [userId, userIndex]);

  const addRemoteAction = useCallback((noteId: string, type: string, prev?: Note) => {
    setRecentRemoteActions(prevMap => {
      const m = new Map(prevMap);
      m.set(noteId, { type, time: Date.now(), prev });
      return m;
    });
    setTimeout(() => {
      setRecentRemoteActions(prevMap => {
        const m = new Map(prevMap);
        m.delete(noteId);
        return m;
      });
    }, 300);
  }, []);

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
      if (uid !== userId) {
        addRemoteAction(note.id, 'add');
        setNotes(prev => [...prev, note]);
      }
    });

    s.on('note:update', ({ noteId, changes, userId: uid }: { noteId: string; changes: Partial<Note>; userId: string }) => {
      if (uid !== userId) {
        const prevNote = notesRef.current.find(n => n.id === noteId);
        if (prevNote) {
          addRemoteAction(noteId, 'update', { ...prevNote });
        }
        setNotes(prev => prev.map(n => n.id === noteId ? { ...n, ...changes } : n));
      }
    });

    s.on('note:delete', ({ noteId, userId: uid }: { noteId: string; userId: string }) => {
      if (uid !== userId) {
        const prevNote = notesRef.current.find(n => n.id === noteId);
        addRemoteAction(noteId, 'delete', prevNote);
        setTimeout(() => {
          setNotes(prev => prev.filter(n => n.id !== noteId));
        }, 300);
      } else {
        setNotes(prev => prev.filter(n => n.id !== noteId));
      }
      setSelectedNoteId(prev => prev === noteId ? null : prev);
    });

    s.on('cursor:update', ({ userId: uid, x, y, noteId }: { userId: string; x: number; y: number; noteId: string | null }) => {
      setCollaborators(prev => prev.map(c =>
        c.id === uid
          ? { ...c, cursorX: x, cursorY: y, selectedNoteId: noteId }
          : c
      ));
    });

    return () => { s.disconnect(); };
  }, [id, userId, myInfo, addRemoteAction]);

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

    const currentNotes = [...notesRef.current].sort((a, b) => a.x - b.x);
    const speed = playbackSpeedRef.current;
    const baseMs = 500;
    const highlightMs = 200;

    for (let i = 0; i < currentNotes.length; i++) {
      if (!isPlayingRef.current) break;
      const note = currentNotes[i];
      const durationMultiplier = DURATION_VALUES[note.duration];
      const noteDurationMs = durationMultiplier * baseMs / speed;
      const audioDurationSec = noteDurationMs / 1000;

      setPlayingNoteId(note.id);
      playTone(audioCtx, note.pitch, audioDurationSec);

      await new Promise(r => setTimeout(r, highlightMs));
      setPlayingNoteId(null);

      const remainingDelay = noteDurationMs - highlightMs + 30;
      if (remainingDelay > 0) {
        await new Promise(r => setTimeout(r, remainingDelay));
      }
    }
    setIsPlaying(false);
    setPlayingNoteId(null);
    audioCtx.close();
  };

  const playTone = (ctx: AudioContext, pitch: number, duration: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = midiToFreq(pitch);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration + 0.02);
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

      {isMobile && (
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
      )}

      <div className="editor-main">
        <div className={`side-panel ${!isMobile || mobileLeftOpen ? 'open' : ''}`}>
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

        <div className={`side-panel right ${!isMobile || mobileRightOpen ? 'open' : ''}`}>
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
