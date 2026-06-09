import React, { useEffect, useState } from 'react';
import { SCALE_C4_B5, type InstrumentType } from '../types';

interface KeyboardProps {
  onNotePress: (note: { name: string; frequency: number; volume: number }) => void;
  disabled?: boolean;
}

export const VirtualKeyboard: React.FC<KeyboardProps> = ({ onNotePress, disabled }) => {
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());
  const [volume, setVolume] = useState(0.7);

  const whiteKeys = SCALE_C4_B5.filter(n => !n.isBlack);
  const blackKeys = SCALE_C4_B5.filter(n => n.isBlack);

  const triggerKey = (note: { name: string; frequency: number; isBlack: boolean }) => {
    if (disabled) return;
    setActiveKeys(prev => {
      const next = new Set(prev);
      next.add(note.name);
      return next;
    });
    onNotePress({ name: note.name, frequency: note.frequency, volume });
    setTimeout(() => {
      setActiveKeys(prev => {
        const next = new Set(prev);
        next.delete(note.name);
        return next;
      });
    }, 300);
  };

  const blackKeyPositions = [
    { name: 'C#4', whiteIdx: 0 },
    { name: 'D#4', whiteIdx: 1 },
    { name: 'F#4', whiteIdx: 3 },
    { name: 'G#4', whiteIdx: 4 },
    { name: 'A#4', whiteIdx: 5 },
    { name: 'C#5', whiteIdx: 7 },
    { name: 'D#5', whiteIdx: 8 },
    { name: 'F#5', whiteIdx: 10 },
    { name: 'G#5', whiteIdx: 11 },
    { name: 'A#5', whiteIdx: 12 }
  ];

  const keyMap: Record<string, { name: string; frequency: number; isBlack: boolean }> = {};
  SCALE_C4_B5.forEach(n => {
    keyMap[n.name] = n;
  });

  const computerKeys = [
    { k: 'a', n: 'C4' }, { k: 'w', n: 'C#4' }, { k: 's', n: 'D4' }, { k: 'e', n: 'D#4' },
    { k: 'd', n: 'E4' }, { k: 'f', n: 'F4' }, { k: 't', n: 'F#4' }, { k: 'g', n: 'G4' },
    { k: 'y', n: 'G#4' }, { k: 'h', n: 'A4' }, { k: 'u', n: 'A#4' }, { k: 'j', n: 'B4' },
    { k: 'k', n: 'C5' }, { k: 'o', n: 'C#5' }, { k: 'l', n: 'D5' }, { k: 'p', n: 'D#5' },
    { k: ';', n: 'E5' }
  ];

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const mapping = computerKeys.find(m => m.k === e.key.toLowerCase());
      if (mapping) {
        const note = keyMap[mapping.n];
        if (note) triggerKey(note);
      }
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled, volume]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-2 text-xs text-[#EAEAEA]">
        <span>音量</span>
        <input
          type="range"
          min={0.1}
          max={1}
          step={0.05}
          value={volume}
          onChange={e => setVolume(parseFloat(e.target.value))}
          className="w-28 accent-[#00FF88] cursor-pointer"
        />
        <span className="w-10 text-right">{Math.round(volume * 100)}%</span>
      </div>

      <div className="relative select-none">
        <div className="flex">
          {whiteKeys.map((note, idx) => {
            const isActive = activeKeys.has(note.name);
            return (
              <div
                key={note.name}
                onMouseDown={() => triggerKey(note)}
                onTouchStart={e => { e.preventDefault(); triggerKey(note); }}
                className={`
                  relative cursor-pointer transition-all duration-100
                  flex flex-col justify-end items-center pb-2
                  border-r border-[#2D2D44] last:border-r-0 rounded-b-md
                  ${isActive
                    ? 'bg-[#2a2a4a] shadow-[0_0_12px_#00FF88,inset_0_0_8px_rgba(0,255,136,0.3)] border-2 border-[#00FF88] -translate-y-0.5'
                    : 'bg-[#EAEAEA] hover:bg-[#DADADA]'
                  }
                `}
                style={{
                  width: '30px',
                  height: '120px'
                }}
              >
                <span className={`text-[9px] font-medium ${isActive ? 'text-[#00FF88]' : 'text-[#1A1A2E]'}`}>
                  {note.name}
                </span>
                {idx < computerKeys.filter(c => !keyMap[c.n]?.isBlack).length && (
                  <span className={`text-[8px] mt-0.5 ${isActive ? 'text-[#00FF88]/70' : 'text-[#1A1A2E]/50'}`}>
                    {computerKeys.filter(c => !keyMap[c.n]?.isBlack)[idx]?.k.toUpperCase()}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {blackKeyPositions.map((pos, pi) => {
          const note = keyMap[pos.name];
          if (!note) return null;
          const isActive = activeKeys.has(note.name);
          const whiteKeyWidth = 30;
          const left = pos.whiteIdx * whiteKeyWidth + whiteKeyWidth - 10;
          const computerKey = computerKeys.find(c => c.n === pos.name);
          return (
            <div
              key={pos.name}
              onMouseDown={() => triggerKey(note)}
              onTouchStart={e => { e.preventDefault(); triggerKey(note); }}
              className={`
                absolute top-0 cursor-pointer transition-all duration-100 z-10
                flex flex-col justify-end items-center pb-1.5 rounded-b-md
                ${isActive
                  ? 'bg-[#4a4a6a] shadow-[0_0_12px_#00FF88,inset_0_0_8px_rgba(0,255,136,0.4)] border-2 border-[#00FF88] -translate-y-0.5'
                  : 'bg-[#1A1A2E] hover:bg-[#2a2a4a] border border-[#3D3D54]'
                }
              `}
              style={{
                left: `${left}px`,
                width: '20px',
                height: '75px'
              }}
            >
              <span className={`text-[8px] font-medium ${isActive ? 'text-[#00FF88]' : 'text-[#888]'}`}>
                {pos.name.replace('#', '♯')}
              </span>
              {computerKey && (
                <span className={`text-[7px] mt-0.5 ${isActive ? 'text-[#00FF88]/70' : 'text-[#666]'}`}>
                  {computerKey.k.toUpperCase()}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="text-[10px] text-[#888] text-center mt-1">
        支持电脑键盘演奏 (白键 A S D F G H J K L ; / 黑键 W E T Y U O P)
      </div>
    </div>
  );
};

export const InstrumentSelector: React.FC<{
  current: InstrumentType;
  onChange: (i: InstrumentType) => void;
  disabled?: boolean;
}> = ({ current, onChange, disabled }) => {
  const instruments: { key: InstrumentType; name: string; color: string; icon: string }[] = [
    { key: 'piano', name: '钢琴', color: '#FFD700', icon: '🎹' },
    { key: 'strings', name: '弦乐', color: '#9B59B6', icon: '🎻' },
    { key: 'synth', name: '电子合成', color: '#00E5FF', icon: '🎛️' }
  ];

  return (
    <div className="flex gap-2">
      {instruments.map(inst => {
        const active = current === inst.key;
        return (
          <button
            key={inst.key}
            disabled={disabled}
            onClick={() => onChange(inst.key)}
            className={`
              relative px-4 py-2 rounded-md text-sm font-medium transition-all duration-200
              flex items-center gap-2 border disabled:opacity-50 disabled:cursor-not-allowed
              active:scale-95
              ${active
                ? 'text-white border-transparent shadow-lg'
                : 'text-[#EAEAEA] bg-[#25253D] border-[#3D3D54] hover:bg-[#2D2D44] hover:border-[#4D4D64] active:scale-[1.02]'
              }
            `}
            style={active ? {
              backgroundColor: inst.color + '33',
              borderColor: inst.color,
              boxShadow: `0 0 16px ${inst.color}44`
            } : {}}
          >
            <span className="text-lg">{inst.icon}</span>
            <span>{inst.name}</span>
            {active && (
              <span
                className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full animate-pulse"
                style={{ backgroundColor: inst.color }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
};
