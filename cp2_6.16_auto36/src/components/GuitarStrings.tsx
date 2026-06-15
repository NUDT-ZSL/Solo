import React, { useState, useCallback, useEffect, useRef } from 'react';

interface GuitarStringsProps {
  onNoteOn: (note: string, velocity: number) => void;
  onNoteOff: (note: string) => void;
  activeNotes: Set<string>;
  remoteActiveNotes: Set<string>;
}

const GUITAR_STRINGS = [
  { note: 'E4', name: '1弦', color: '#c0c0c0' },
  { note: 'B3', name: '2弦', color: '#c8c8c8' },
  { note: 'G3', name: '3弦', color: '#d0d0d0' },
  { note: 'D3', name: '4弦', color: '#d8d8d8' },
  { note: 'A2', name: '5弦', color: '#e0e0e0' },
  { note: 'E2', name: '6弦', color: '#e8e8e8' },
];

const GUITAR_KEYBOARD_MAP: Record<string, string> = {
  'z': 'E4',
  'x': 'B3',
  'c': 'G3',
  'v': 'D3',
  'b': 'A2',
  'n': 'E2',
};

const GuitarStrings: React.FC<GuitarStringsProps> = ({
  onNoteOn,
  onNoteOff,
  activeNotes,
  remoteActiveNotes,
}) => {
  const [pressedStrings, setPressedStrings] = useState<Set<string>>(new Set());
  const pressedRef = useRef<Set<string>>(new Set());

  const handleStringPluck = useCallback(
    (note: string) => {
      if (pressedRef.current.has(note)) return;
      pressedRef.current.add(note);
      setPressedStrings(new Set(pressedRef.current));
      onNoteOn(note, 0.7);
      setTimeout(() => {
        pressedRef.current.delete(note);
        setPressedStrings(new Set(pressedRef.current));
        onNoteOff(note);
      }, 500);
    },
    [onNoteOn, onNoteOff]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const note = GUITAR_KEYBOARD_MAP[e.key.toLowerCase()];
      if (note) {
        e.preventDefault();
        handleStringPluck(note);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleStringPluck]);

  const isStringActive = (note: string) => activeNotes.has(note) || pressedStrings.has(note);
  const isStringRemoteActive = (note: string) => remoteActiveNotes.has(note);

  const getStringClass = (note: string) => {
    let baseClass = 'guitar-string';
    if (isStringActive(note)) baseClass += ' active';
    else if (isStringRemoteActive(note)) baseClass += ' remote-active';
    return baseClass;
  };

  return (
    <div className="guitar-container">
      <div className="guitar-body">
        <div className="guitar-strings">
          {GUITAR_STRINGS.map((string) => (
            <div
              key={string.note}
              className={getStringClass(string.note)}
              onMouseDown={(e) => {
                e.preventDefault();
                handleStringPluck(string.note);
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                handleStringPluck(string.note);
              }}
              style={{
                height: `${4 + (6 - GUITAR_STRINGS.findIndex((s) => s.note === string.note))}px`,
              }}
            >
              <span className="string-name">{string.name}</span>
            </div>
          ))}
        </div>
      </div>
      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginTop: '8px' }}>
        使用键盘 Z X C V B N 演奏
      </p>
    </div>
  );
};

export default GuitarStrings;
