import React, { useState, useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import InstrumentSelector from './components/InstrumentSelector';
import PianoKeyboard from './components/PianoKeyboard';
import DrumPad from './components/DrumPad';
import GuitarStrings from './components/GuitarStrings';
import useAudioEngine from './hooks/useAudioEngine';
import useWebSocket from './hooks/useWebSocket';
import { Instrument, InstrumentType, NoteEvent, User, DrumSoundType } from './types';

const INSTRUMENTS: Instrument[] = [
  { id: 'piano', name: '钢琴', icon: '🎹' },
  { id: 'drums', name: '架子鼓', icon: '🥁' },
  { id: 'guitar', name: '吉他', icon: '🎸' },
];

const App: React.FC = () => {
  const [selectedInstrument, setSelectedInstrument] = useState<InstrumentType>('piano');
  const [activePianoNotes, setActivePianoNotes] = useState<Set<string>>(new Set());
  const [activeDrumPads, setActiveDrumPads] = useState<Set<string>>(new Set());
  const [activeGuitarNotes, setActiveGuitarNotes] = useState<Set<string>>(new Set());
  const [remotePianoNotes, setRemotePianoNotes] = useState<Set<string>>(new Set());
  const [remoteDrumPads, setRemoteDrumPads] = useState<Set<string>>(new Set());
  const [remoteGuitarNotes, setRemoteGuitarNotes] = useState<Set<string>>(new Set());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userId] = useState(() => uuidv4());
  const [userName] = useState(() => `玩家${Math.floor(Math.random() * 1000)}`);
  const [roomId] = useState('default-room');
  const [users, setUsers] = useState<User[]>([]);

  const audioEngine = useAudioEngine();
  const remoteNoteTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const handleNoteReceived = useCallback(
    (event: NoteEvent) => {
      if (event.instrument === 'piano') {
        const noteKey = event.note;
        if (event.type === 'noteOn') {
          setRemotePianoNotes((prev) => new Set([...prev, noteKey]));
          audioEngine.playPianoNote(noteKey, event.velocity * 0.6);

          const existingTimeout = remoteNoteTimeouts.current.get(`piano-${noteKey}`);
          if (existingTimeout) clearTimeout(existingTimeout);

          const timeout = setTimeout(() => {
            setRemotePianoNotes((prev) => {
              const next = new Set(prev);
              next.delete(noteKey);
              return next;
            });
            remoteNoteTimeouts.current.delete(`piano-${noteKey}`);
          }, 1000);
          remoteNoteTimeouts.current.set(`piano-${noteKey}`, timeout);
        } else {
          setRemotePianoNotes((prev) => {
            const next = new Set(prev);
            next.delete(noteKey);
            return next;
          });
          audioEngine.stopPianoNote(noteKey);
        }
      } else if (event.instrument === 'drums') {
        const padId = event.note;
        if (event.type === 'noteOn') {
          setRemoteDrumPads((prev) => new Set([...prev, padId]));
          audioEngine.playDrumSound(padId as DrumSoundType, event.velocity * 0.6);

          setTimeout(() => {
            setRemoteDrumPads((prev) => {
              const next = new Set(prev);
              next.delete(padId);
              return next;
            });
          }, 150);
        }
      } else if (event.instrument === 'guitar') {
        const noteKey = event.note;
        if (event.type === 'noteOn') {
          setRemoteGuitarNotes((prev) => new Set([...prev, noteKey]));
          audioEngine.playGuitarNote(noteKey, event.velocity * 0.6);

          setTimeout(() => {
            setRemoteGuitarNotes((prev) => {
              const next = new Set(prev);
              next.delete(noteKey);
              return next;
            });
          }, 500);
        }
      }
    },
    [audioEngine]
  );

  const { isConnected, sendNote } = useWebSocket({
    roomId,
    userId,
    onNoteReceived: handleNoteReceived,
    onUsersUpdate: setUsers,
  });

  useEffect(() => {
    const handleFirstInteraction = () => {
      audioEngine.initAudio();
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };

    window.addEventListener('click', handleFirstInteraction);
    window.addEventListener('keydown', handleFirstInteraction);
    window.addEventListener('touchstart', handleFirstInteraction);

    return () => {
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, [audioEngine]);

  const handleInstrumentSelect = useCallback((instrumentId: string) => {
    setSelectedInstrument(instrumentId as InstrumentType);
    setMobileMenuOpen(false);
  }, []);

  const handlePianoNoteOn = useCallback(
    (note: string, velocity: number) => {
      audioEngine.playPianoNote(note, velocity);
      setActivePianoNotes((prev) => new Set([...prev, note]));

      const event: NoteEvent = {
        id: uuidv4(),
        userId,
        instrument: 'piano',
        note,
        velocity,
        timestamp: Date.now(),
        type: 'noteOn',
      };
      sendNote(event);
    },
    [audioEngine, userId, sendNote]
  );

  const handlePianoNoteOff = useCallback(
    (note: string) => {
      audioEngine.stopPianoNote(note);
      setActivePianoNotes((prev) => {
        const next = new Set(prev);
        next.delete(note);
        return next;
      });

      const event: NoteEvent = {
        id: uuidv4(),
        userId,
        instrument: 'piano',
        note,
        velocity: 0,
        timestamp: Date.now(),
        type: 'noteOff',
      };
      sendNote(event);
    },
    [audioEngine, userId, sendNote]
  );

  const handleDrumPadHit = useCallback(
    (soundType: DrumSoundType, velocity: number) => {
      audioEngine.playDrumSound(soundType, velocity);
      setActiveDrumPads((prev) => new Set([...prev, soundType]));

      setTimeout(() => {
        setActiveDrumPads((prev) => {
          const next = new Set(prev);
          next.delete(soundType);
          return next;
        });
      }, 100);

      const event: NoteEvent = {
        id: uuidv4(),
        userId,
        instrument: 'drums',
        note: soundType,
        velocity,
        timestamp: Date.now(),
        type: 'noteOn',
      };
      sendNote(event);
    },
    [audioEngine, userId, sendNote]
  );

  const handleGuitarNoteOn = useCallback(
    (note: string, velocity: number) => {
      audioEngine.playGuitarNote(note, velocity);
      setActiveGuitarNotes((prev) => new Set([...prev, note]));

      const event: NoteEvent = {
        id: uuidv4(),
        userId,
        instrument: 'guitar',
        note,
        velocity,
        timestamp: Date.now(),
        type: 'noteOn',
      };
      sendNote(event);
    },
    [audioEngine, userId, sendNote]
  );

  const handleGuitarNoteOff = useCallback(
    (note: string) => {
      audioEngine.stopGuitarNote(note);
      setActiveGuitarNotes((prev) => {
        const next = new Set(prev);
        next.delete(note);
        return next;
      });

      const event: NoteEvent = {
        id: uuidv4(),
        userId,
        instrument: 'guitar',
        note,
        velocity: 0,
        timestamp: Date.now(),
        type: 'noteOff',
      };
      sendNote(event);
    },
    [audioEngine, userId, sendNote]
  );

  const renderInstrument = () => {
    switch (selectedInstrument) {
      case 'piano':
        return (
          <PianoKeyboard
            onNoteOn={handlePianoNoteOn}
            onNoteOff={handlePianoNoteOff}
            activeNotes={activePianoNotes}
            remoteActiveNotes={remotePianoNotes}
          />
        );
      case 'drums':
        return (
          <DrumPad
            onPadHit={handleDrumPadHit}
            activePads={activeDrumPads}
            remoteActivePads={remoteDrumPads}
          />
        );
      case 'guitar':
        return (
          <GuitarStrings
            onNoteOn={handleGuitarNoteOn}
            onNoteOff={handleGuitarNoteOff}
            activeNotes={activeGuitarNotes}
            remoteActiveNotes={remoteGuitarNotes}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="app-container">
      <button
        className="mobile-menu-btn"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        aria-label="菜单"
      >
        <span />
        <span />
        <span />
      </button>

      <div className="main-layout">
        <InstrumentSelector
          instruments={INSTRUMENTS}
          selectedInstrument={selectedInstrument}
          onSelect={handleInstrumentSelect}
          isOpen={mobileMenuOpen}
        />

        <main className="main-content">
          <div className="content-header">
            <div className="room-info">
              <h1 className="room-title">虚拟合奏室</h1>
              <p className={`room-status ${isConnected ? 'connected' : ''}`}>
                {isConnected ? '● 已连接' : '○ 连接中...'}
              </p>
            </div>

            <div className="controls-panel">
              <div className="volume-control">
                <span className="volume-icon">🔊</span>
                <input
                  type="range"
                  className="volume-slider"
                  min="0"
                  max="1"
                  step="0.01"
                  value={audioEngine.volume}
                  onChange={(e) => audioEngine.setVolume(parseFloat(e.target.value))}
                  aria-label="音量"
                />
              </div>
            </div>
          </div>

          <div className="instrument-display">{renderInstrument()}</div>

          <div className="users-panel">
            <h3 className="users-title">在线合奏者 ({users.length})</h3>
            <div className="users-list">
              {users.map((user) => (
                <div key={user.id} className="user-item">
                  <div
                    className="user-avatar"
                    style={{
                      background:
                        user.id === userId
                          ? 'var(--accent-gold)'
                          : 'var(--accent-blue)',
                    }}
                  >
                    {user.name.charAt(0)}
                  </div>
                  <div className="user-info">
                    <span className="user-name">
                      {user.name}
                      {user.id === userId && ' (我)'}
                    </span>
                    <span className="user-instrument">
                      {INSTRUMENTS.find((i) => i.id === user.instrument)?.name || '未知'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
