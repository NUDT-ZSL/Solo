import React, { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  Track,
  User,
  ServerMessage,
  ClientMessage,
  INSTRUMENTS,
  USER_COLORS,
  SavedArrangement,
} from './types';
import { audioEngine } from './audioEngine';
import { Sequencer } from './components/Sequencer';
import { Mixer } from './components/Mixer';
import { Waveform } from './components/Waveform';

const STORAGE_KEY = 'virtual_band_arrangements';
const MAX_SAVED = 20;

const defaultColors = [
  '#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3',
  '#F38181', '#AA96DA', '#FCBAD3', '#A8D8EA',
];

const createDefaultTracks = (): Track[] => {
  return INSTRUMENTS.map((inst, idx) => ({
    id: idx,
    name: inst.name,
    instrument: inst.type,
    color: defaultColors[idx],
    volume: 75,
    pan: 0,
    reverb: 20,
    delay: 10,
    distortion: 0,
    steps: new Array(16).fill(false),
  }));
};

const generateRoomCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const App: React.FC = () => {
  const [tracks, setTracks] = useState<Track[]>(createDefaultTracks());
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [playheadPosition, setPlayheadPosition] = useState(0);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<User[]>([]);
  const [savedCount, setSavedCount] = useState(0);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [userName, setUserName] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [audioInitialized, setAudioInitialized] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const playheadRafRef = useRef<number | null>(null);
  const cursorSendTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const arr: SavedArrangement[] = JSON.parse(saved);
        setSavedCount(arr.length);
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    audioEngine.setBPM(bpm);
  }, [bpm]);

  useEffect(() => {
    if (!isPlaying) {
      if (playheadRafRef.current) {
        cancelAnimationFrame(playheadRafRef.current);
        playheadRafRef.current = null;
      }
      setPlayheadPosition(0);
      return;
    }

    const update = () => {
      const pos = audioEngine.getPlayheadPosition();
      setPlayheadPosition(pos);
      playheadRafRef.current = requestAnimationFrame(update);
    };
    playheadRafRef.current = requestAnimationFrame(update);

    return () => {
      if (playheadRafRef.current) {
        cancelAnimationFrame(playheadRafRef.current);
      }
    };
  }, [isPlaying]);

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const saveArrangement = useCallback(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    let arrangements: SavedArrangement[] = [];
    if (saved) {
      try {
        arrangements = JSON.parse(saved);
      } catch {
        arrangements = [];
      }
    }

    const newArrangement: SavedArrangement = {
      id: uuidv4(),
      name: `Arrangement ${arrangements.length + 1}`,
      tracks: JSON.parse(JSON.stringify(tracks)),
      timestamp: Date.now(),
    };

    arrangements.unshift(newArrangement);
    if (arrangements.length > MAX_SAVED) {
      arrangements = arrangements.slice(0, MAX_SAVED);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(arrangements));
    setSavedCount(arrangements.length);
  }, [tracks]);

  const initAudio = useCallback(async () => {
    if (audioInitialized) return;
    await audioEngine.init();
    tracks.forEach(track => {
      audioEngine.initTrack(track);
    });
    setAudioInitialized(true);
    audioEngine.resume();
  }, [audioInitialized, tracks]);

  const handlePlay = async () => {
    await initAudio();
    if (isPlaying) return;
    audioEngine.startPlayback(tracks, () => {});
    setIsPlaying(true);
  };

  const handleStop = () => {
    audioEngine.stopPlayback();
    setIsPlaying(false);
    setPlayheadPosition(0);
  };

  const handleRecord = async () => {
    await initAudio();
    if (isRecording) {
      setIsRecording(false);
      saveArrangement();
    } else {
      setIsRecording(true);
      if (!isPlaying) {
        audioEngine.startPlayback(tracks, () => {});
        setIsPlaying(true);
      }
    }
  };

  const handleCellClick = useCallback((trackId: number, stepIndex: number, active: boolean) => {
    setTracks(prev => {
      const newTracks = prev.map(t => {
        if (t.id === trackId) {
          const newSteps = [...t.steps];
          newSteps[stepIndex] = active;
          return { ...t, steps: newSteps };
        }
        return t;
      });
      return newTracks;
    });

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && currentUser) {
      const msg: ClientMessage = {
        type: 'cell_click',
        data: { trackId, stepIndex, active, userId: currentUser.id },
      };
      wsRef.current.send(JSON.stringify(msg));
    }
  }, [currentUser]);

  const handleTrackColorChange = useCallback((trackId: number, color: string) => {
    setTracks(prev => prev.map(t => (t.id === trackId ? { ...t, color } : t)));

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && currentUser) {
      const msg: ClientMessage = {
        type: 'track_color',
        data: { trackId, color, userId: currentUser.id },
      };
      wsRef.current.send(JSON.stringify(msg));
    }
  }, [currentUser]);

  const handleMixerParamChange = useCallback(
    (trackId: number, param: 'volume' | 'pan' | 'reverb' | 'delay' | 'distortion', value: number) => {
      setTracks(prev => prev.map(t => (t.id === trackId ? { ...t, [param]: value } : t)));

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && currentUser) {
        const msg: ClientMessage = {
          type: 'mixer_change',
          data: { trackId, param, value, userId: currentUser.id },
        };
        wsRef.current.send(JSON.stringify(msg));
      }
    },
    [currentUser]
  );

  const handleWebSocketMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const msg: ServerMessage = JSON.parse(event.data);

        switch (msg.type) {
          case 'init':
            setTracks(msg.tracks);
            setRemoteUsers(msg.users.filter(u => u.id !== currentUser?.id));
            break;
          case 'cell_click':
            if (msg.data.userId !== currentUser?.id) {
              setTracks(prev =>
                prev.map(t => {
                  if (t.id === msg.data.trackId) {
                    const newSteps = [...t.steps];
                    newSteps[msg.data.stepIndex] = msg.data.active;
                    return { ...t, steps: newSteps };
                  }
                  return t;
                })
              );
            }
            break;
          case 'mixer_change':
            if (msg.data.userId !== currentUser?.id) {
              setTracks(prev =>
                prev.map(t =>
                  t.id === msg.data.trackId ? { ...t, [msg.data.param]: msg.data.value } : t
                )
              );
              audioEngine.updateTrackParam(msg.data.trackId, msg.data.param, msg.data.value);
            }
            break;
          case 'track_color':
            if (msg.data.userId !== currentUser?.id) {
              setTracks(prev =>
                prev.map(t => (t.id === msg.data.trackId ? { ...t, color: msg.data.color } : t))
              );
            }
            break;
          case 'user_joined':
            if (msg.user.id !== currentUser?.id) {
              setRemoteUsers(prev => [...prev.filter(u => u.id !== msg.user.id), msg.user]);
            }
            break;
          case 'user_left':
            setRemoteUsers(prev => prev.filter(u => u.id !== msg.userId));
            break;
          case 'cursor_move':
            if (msg.user.id !== currentUser?.id) {
              setRemoteUsers(prev =>
                prev.map(u => (u.id === msg.user.id ? { ...u, x: msg.user.x, y: msg.user.y } : u))
              );
            }
            break;
        }
      } catch (e) {
        console.error('WebSocket message error:', e);
      }
    },
    [currentUser]
  );

  const connectWebSocket = useCallback(
    (code: string, userId: string, name: string, create: boolean) => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//localhost:3001`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        const msg: ClientMessage = create
          ? { type: 'create_room', userId, userName: name }
          : { type: 'join_room', roomCode: code, userId, userName: name };
        ws.send(JSON.stringify(msg));
      };

      ws.onmessage = handleWebSocketMessage;

      ws.onerror = (e) => {
        console.error('WebSocket error:', e);
      };

      ws.onclose = () => {
        console.log('WebSocket closed');
      };
    },
    [handleWebSocketMessage]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
      if (cursorSendTimeoutRef.current) return;

      cursorSendTimeoutRef.current = window.setTimeout(() => {
        cursorSendTimeoutRef.current = null;
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          const msg: ClientMessage = {
            type: 'cursor_move',
            x: e.clientX,
            y: e.clientY,
          };
          wsRef.current.send(JSON.stringify(msg));
        }
      }, 30);
    },
    []
  );

  const handleCreateRoom = () => {
    if (!userName.trim()) return;
    const userId = uuidv4();
    const colorIdx = Math.floor(Math.random() * USER_COLORS.length);
    const user: User = {
      id: userId,
      name: userName.trim().slice(0, 3).toUpperCase(),
      color: USER_COLORS[colorIdx],
    };
    setCurrentUser(user);
    const code = generateRoomCode();
    setRoomCode(code);
    setShowCreateModal(false);
    connectWebSocket(code, userId, userName, true);
  };

  const handleJoinRoom = () => {
    if (!userName.trim() || !joinCode.trim()) return;
    const userId = uuidv4();
    const colorIdx = Math.floor(Math.random() * USER_COLORS.length);
    const user: User = {
      id: userId,
      name: userName.trim().slice(0, 3).toUpperCase(),
      color: USER_COLORS[colorIdx],
    };
    setCurrentUser(user);
    setRoomCode(joinCode.trim());
    setShowJoinModal(false);
    connectWebSocket(joinCode.trim(), userId, userName, false);
  };

  const getInitials = (name: string) => {
    return name.slice(0, 3).toUpperCase();
  };

  return (
    <div className="app-container" onMouseMove={handleMouseMove}>
      <div className="header">
        <div className="header-left">
          <div className="app-title">🎵 Virtual Band</div>
          {currentUser && (
            <div className="user-info">
              <div className="user-color-dot" style={{ backgroundColor: currentUser.color }} />
              <span>{currentUser.name}</span>
            </div>
          )}
          {remoteUsers.length > 0 && (
            <div className="user-info" style={{ gap: '4px' }}>
              <span style={{ color: '#8892B0' }}>Online:</span>
              {remoteUsers.map(u => (
                <div
                  key={u.id}
                  className="user-color-dot"
                  style={{ backgroundColor: u.color }}
                  title={u.name}
                />
              ))}
            </div>
          )}
        </div>

        <div className="header-center">
          <button className="btn btn-play" onClick={handlePlay}>
            ▶ Play
          </button>
          <button className="btn btn-stop" onClick={handleStop}>
            ■ Stop
          </button>
          <button
            className={`btn btn-record ${isRecording ? 'active' : ''}`}
            onClick={handleRecord}
          >
            ● {isRecording ? 'Stop Rec' : 'Record'}
          </button>
          <div className="tempo-control">
            <span>BPM</span>
            <input
              type="number"
              className="tempo-input"
              min={40}
              max={240}
              value={bpm}
              onChange={(e) => setBpm(Math.max(40, Math.min(240, Number(e.target.value))))}
            />
          </div>
        </div>

        <div className="header-right">
          {roomCode ? (
            <div className="room-info">
              <span>Room:</span>
              <span className="room-code">{roomCode}</span>
            </div>
          ) : (
            <>
              <button className="btn btn-share" onClick={() => setShowCreateModal(true)}>
                + Create Room
              </button>
              <button className="btn" onClick={() => setShowJoinModal(true)}>
                🔗 Join Room
              </button>
            </>
          )}
        </div>
      </div>

      <div className="main-content">
        <div className="sequencer-wrapper">
          <Sequencer
            tracks={tracks}
            onCellClick={handleCellClick}
            onTrackColorChange={handleTrackColorChange}
            isPlaying={isPlaying}
            playheadPosition={playheadPosition}
            bpm={bpm}
          />
          <Waveform />
          <div className="saved-count">
            Saved arrangements: <strong>{savedCount}</strong> / {MAX_SAVED}
          </div>
        </div>

        <Mixer tracks={tracks} onParamChange={handleMixerParamChange} />
      </div>

      {remoteUsers.map(user => (
        user.x !== undefined && user.y !== undefined && (
          <div
            key={user.id}
            className="remote-cursor"
            style={{
              transform: `translate(${user.x}px, ${user.y}px)`,
            }}
          >
            <svg viewBox="0 0 16 16" fill="none">
              <path
                d="M1 1L6 14L8.5 9L13 6.5L1 1Z"
                fill={user.color}
                stroke="white"
                strokeWidth="1"
                strokeLinejoin="round"
              />
            </svg>
            <div
              className="remote-cursor-label"
              style={{
                backgroundColor: user.color,
                color: '#0A0E27',
              }}
            >
              {getInitials(user.name)}
            </div>
          </div>
        )
      ))}

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Create New Room</div>
            <input
              type="text"
              className="modal-input"
              placeholder="Your name (3 chars)"
              maxLength={10}
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateRoom()}
            />
            <div className="modal-buttons">
              <button className="btn" onClick={() => setShowCreateModal(false)}>
                Cancel
              </button>
              <button className="btn btn-share" onClick={handleCreateRoom}>
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {showJoinModal && (
        <div className="modal-overlay" onClick={() => setShowJoinModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Join Room</div>
            <input
              type="text"
              className="modal-input"
              placeholder="Your name (3 chars)"
              maxLength={10}
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
            />
            <input
              type="text"
              className="modal-input"
              placeholder="6-digit room code"
              maxLength={6}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
            />
            <div className="modal-buttons">
              <button className="btn" onClick={() => setShowJoinModal(false)}>
                Cancel
              </button>
              <button className="btn btn-share" onClick={handleJoinRoom}>
                Join
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
