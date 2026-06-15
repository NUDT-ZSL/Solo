import React, { useState, useEffect, useCallback, useRef } from 'react';

interface PianoKeyboardProps {
  onNoteOn: (note: string, velocity: number) => void;
  onNoteOff: (note: string) => void;
  activeNotes: Set<string>;
  remoteActiveNotes: Set<string>;
}

const WHITE_KEYS = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'B5'];
const BLACK_KEYS = ['C#4', 'D#4', 'F#4', 'G#4', 'A#4', 'C#5', 'D#5', 'F#5', 'G#5', 'A#5'];

const KEYBOARD_MAP: Record<string, string> = {
  'a': 'C4',
  'w': 'C#4',
  's': 'D4',
  'e': 'D#4',
  'd': 'E4',
  'f': 'F4',
  't': 'F#4',
  'g': 'G4',
  'y': 'G#4',
  'h': 'A4',
  'u': 'A#4',
  'j': 'B4',
  'k': 'C5',
  'o': 'C#5',
  'l': 'D5',
  'p': 'D#5',
  ';': 'E5',
  "'": 'F5',
};

const PianoKeyboard: React.FC<PianoKeyboardProps> = ({
  onNoteOn,
  onNoteOff,
  activeNotes,
  remoteActiveNotes,
}) => {
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());
  const pressedKeysRef = useRef<Set<string>>(new Set());

  const handleNoteOn = useCallback(
    (note: string) => {
      if (!pressedKeysRef.current.has(note)) {
        pressedKeysRef.current.add(note);
        setPressedKeys(new Set(pressedKeysRef.current));
        onNoteOn(note, 0.8);
      }
    },
    [onNoteOn]
  );

  const handleNoteOff = useCallback(
    (note: string) => {
      if (pressedKeysRef.current.has(note)) {
        pressedKeysRef.current.delete(note);
        setPressedKeys(new Set(pressedKeysRef.current));
        onNoteOff(note);
      }
    },
    [onNoteOff]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const note = KEYBOARD_MAP[e.key.toLowerCase()];
      if (note) {
        e.preventDefault();
        handleNoteOn(note);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const note = KEYBOARD_MAP[e.key.toLowerCase()];
      if (note) {
        e.preventDefault();
        handleNoteOff(note);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleNoteOn, handleNoteOff]);

  const getBlackKeyPosition = (note: string): number => {
    const whiteKeyIndex = WHITE_KEYS.findIndex((k) => k === note.replace('#', ''));
    const octaveOffset = note.includes('5') ? 7 : 0;
    const noteName = note.replace(/[45]/, '');
    const offsets: Record<string, number> = {
      'C#': 0.65,
      'D#': 1.65,
      'F#': 3.65,
      'G#': 4.65,
      'A#': 5.65,
    };
    return (offsets[noteName] ?? 0) + octaveOffset;
  };

  const isKeyActive = (note: string) => activeNotes.has(note) || pressedKeys.has(note);
  const isKeyRemoteActive = (note: string) => remoteActiveNotes.has(note);

  const getKeyClass = (note: string, isBlack: boolean) => {
    const baseClass = isBlack ? 'black-key' : 'white-key';
    if (isKeyActive(note)) return `${baseClass} active`;
    if (isKeyRemoteActive(note)) return `${baseClass} remote-active`;
    return baseClass;
  };

  return (
    <div className="piano-container">
      <div className="piano-keyboard">
        {WHITE_KEYS.map((note) => (
          <div
            key={note}
            className={getKeyClass(note, false)}
            onMouseDown={(e) => {
              e.preventDefault();
              handleNoteOn(note);
            }}
            onMouseUp={() => handleNoteOff(note)}
            onMouseLeave={() => {
              if (pressedKeys.has(note)) {
                handleNoteOff(note);
              }
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              handleNoteOn(note);
            }}
            onTouchEnd={() => handleNoteOff(note)}
          >
            <span className="key-label">{note.replace(/[45]/, '')}</span>
          </div>
        ))}
        {BLACK_KEYS.map((note) => {
          const position = getBlackKeyPosition(note);
          return (
            <div
              key={note}
              className={getKeyClass(note, true)}
              style={{ left: `${position * 30}px` }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleNoteOn(note);
              }}
              onMouseUp={(e) => {
                e.stopPropagation();
                handleNoteOff(note);
              }}
              onMouseLeave={() => {
                if (pressedKeys.has(note)) {
                  handleNoteOff(note);
                }
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleNoteOn(note);
              }}
              onTouchEnd={() => handleNoteOff(note)}
            />
          );
        })}
      </div>
      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginTop: '8px' }}>
        使用键盘 A-K 和 W-U-O-P 演奏
      </p>
    </div>
  );
};

export default PianoKeyboard;
