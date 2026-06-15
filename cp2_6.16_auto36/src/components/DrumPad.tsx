import React, { useState, useCallback, useEffect, useRef } from 'react';
import { DrumPadConfig, DrumSoundType } from '../types';

interface DrumPadProps {
  onPadHit: (soundType: DrumSoundType, velocity: number) => void;
  activePads: Set<string>;
  remoteActivePads: Set<string>;
}

const DRUM_PADS: DrumPadConfig[] = [
  { id: 'kick', label: 'K', color: 'linear-gradient(135deg, #e74c3c, #c0392b)', soundType: 'kick' },
  { id: 'snare', label: 'S', color: 'linear-gradient(135deg, #e67e22, #d35400)', soundType: 'snare' },
  { id: 'hihat', label: 'H', color: 'linear-gradient(135deg, #f39c12, #e67e22)', soundType: 'hihat' },
  { id: 'tom', label: 'T', color: 'linear-gradient(135deg, #9b59b6, #8e44ad)', soundType: 'tom' },
  { id: 'clap', label: 'C', color: 'linear-gradient(135deg, #3498db, #2980b9)', soundType: 'clap' },
  { id: 'ride', label: 'R', color: 'linear-gradient(135deg, #1abc9c, #16a085)', soundType: 'ride' },
];

const DRUM_KEYBOARD_MAP: Record<string, string> = {
  '1': 'kick',
  '2': 'snare',
  '3': 'hihat',
  'q': 'tom',
  'w': 'clap',
  'e': 'ride',
};

interface Ripple {
  id: number;
  padId: string;
}

const DrumPad: React.FC<DrumPadProps> = ({ onPadHit, activePads, remoteActivePads }) => {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const rippleIdRef = useRef(0);
  const pressedPadsRef = useRef<Set<string>>(new Set());

  const triggerRipple = useCallback((padId: string) => {
    const id = rippleIdRef.current++;
    setRipples((prev) => [...prev, { id, padId }]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 300);
  }, []);

  const handlePadHit = useCallback(
    (padId: string, soundType: DrumSoundType) => {
      if (pressedPadsRef.current.has(padId)) return;
      pressedPadsRef.current.add(padId);
      onPadHit(soundType, 0.9);
      triggerRipple(padId);
    },
    [onPadHit, triggerRipple]
  );

  const handlePadRelease = useCallback((padId: string) => {
    pressedPadsRef.current.delete(padId);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const padId = DRUM_KEYBOARD_MAP[e.key.toLowerCase()];
      if (padId) {
        e.preventDefault();
        const pad = DRUM_PADS.find((p) => p.id === padId);
        if (pad) {
          handlePadHit(padId, pad.soundType);
          triggerRipple(padId);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const padId = DRUM_KEYBOARD_MAP[e.key.toLowerCase()];
      if (padId) {
        e.preventDefault();
        handlePadRelease(padId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handlePadHit, handlePadRelease, triggerRipple]);

  const isPadActive = (padId: string) => activePads.has(padId);
  const isPadRemoteActive = (padId: string) => remoteActivePads.has(padId);

  const getPadClass = (padId: string) => {
    let baseClass = 'drum-pad';
    if (isPadActive(padId)) baseClass += ' active';
    else if (isPadRemoteActive(padId)) baseClass += ' remote-active';
    return baseClass;
  };

  return (
    <div className="drum-container">
      <div className="drum-pads">
        {DRUM_PADS.map((pad) => (
          <div
            key={pad.id}
            className={getPadClass(pad.id)}
            style={{ background: pad.color }}
            onMouseDown={(e) => {
              e.preventDefault();
              handlePadHit(pad.id, pad.soundType);
            }}
            onMouseUp={() => handlePadRelease(pad.id)}
            onMouseLeave={() => handlePadRelease(pad.id)}
            onTouchStart={(e) => {
              e.preventDefault();
              handlePadHit(pad.id, pad.soundType);
            }}
            onTouchEnd={() => handlePadRelease(pad.id)}
          >
            <div className="drum-pad-content">
              <span className="drum-pad-label">{pad.label}</span>
            </div>
            {ripples
              .filter((r) => r.padId === pad.id)
              .map((ripple) => (
                <div key={ripple.id} className="ripple" />
              ))}
          </div>
        ))}
      </div>
      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
        使用键盘 1 2 3 Q W E 演奏
      </p>
    </div>
  );
};

export default DrumPad;
