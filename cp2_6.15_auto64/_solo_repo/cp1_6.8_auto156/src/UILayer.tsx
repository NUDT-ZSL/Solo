import React from 'react';
import { Play, Pause, RotateCcw, Music, Gauge } from 'lucide-react';
import { useGameStore } from './store';
import { ALL_PITCHES, ALL_RHYTHMS, RHYTHM_LABELS, type PitchName, type RhythmType } from './types';

const NoteSelector: React.FC = () => {
  const { selectedPitch, selectedRhythm, setSelectedPitch, setSelectedRhythm, setDragging } = useGameStore();

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragging(true, clientX, clientY);
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="text-xs font-exo text-neon-blue/70 uppercase tracking-widest mb-2 flex items-center gap-1.5">
          <Music size={12} />
          音高
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {ALL_PITCHES.map((pitch) => (
            <button
              key={pitch}
              onClick={() => setSelectedPitch(pitch)}
              onMouseDown={handleDragStart}
              className={`
                relative px-2 py-2 rounded-lg font-orbitron text-sm font-bold
                transition-all duration-200 cursor-pointer select-none
                ${selectedPitch === pitch
                  ? 'bg-gradient-to-br from-neon-blue to-neon-purple text-white shadow-[0_0_12px_rgba(0,212,255,0.4)] scale-105'
                  : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80'
                }
              `}
            >
              {pitch}4
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="text-xs font-exo text-neon-purple/70 uppercase tracking-widest mb-2 flex items-center gap-1.5">
          <Gauge size={12} />
          节奏
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {ALL_RHYTHMS.map((rhythm) => {
            const symbols: Record<RhythmType, string> = { whole: '𝅝', half: '𝅗𝅥', quarter: '♩', eighth: '♪' };
            return (
              <button
                key={rhythm}
                onClick={() => setSelectedRhythm(rhythm)}
                className={`
                  relative px-3 py-2 rounded-lg font-exo text-sm
                  transition-all duration-200 cursor-pointer select-none
                  ${selectedRhythm === rhythm
                    ? 'bg-gradient-to-br from-neon-purple to-neon-pink text-white shadow-[0_0_12px_rgba(180,74,255,0.4)] scale-105'
                    : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80'
                  }
                `}
              >
                <span className="text-base mr-1">{symbols[rhythm]}</span>
                {RHYTHM_LABELS[rhythm]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="text-[10px] font-exo text-white/30 leading-relaxed mt-1">
        点击网格放置 · 右键删除<br />
        也可拖拽音符到网格
      </div>
    </div>
  );
};

const PlayPauseButton: React.FC = () => {
  const { playing, togglePlay } = useGameStore();

  return (
    <button
      onClick={togglePlay}
      className={`
        w-12 h-12 rounded-full flex items-center justify-center
        transition-all duration-300 cursor-pointer
        ${playing
          ? 'bg-neon-pink/20 text-neon-pink shadow-[0_0_20px_rgba(255,45,123,0.3)] hover:bg-neon-pink/30'
          : 'bg-neon-blue/20 text-neon-blue shadow-[0_0_20px_rgba(0,212,255,0.3)] hover:bg-neon-blue/30'
        }
      `}
    >
      {playing ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
    </button>
  );
};

const BpmSlider: React.FC = () => {
  const { bpm, setBpm } = useGameStore();

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-exo text-white/40 uppercase tracking-wider w-8">BPM</span>
      <input
        type="range"
        min={60}
        max={200}
        value={bpm}
        onChange={(e) => setBpm(Number(e.target.value))}
        className="w-28 h-1 appearance-none bg-white/10 rounded-full outline-none
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-gradient-to-br
          [&::-webkit-slider-thumb]:from-neon-blue [&::-webkit-slider-thumb]:to-neon-purple
          [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(0,212,255,0.5)]
          [&::-webkit-slider-thumb]:cursor-pointer"
      />
      <span className="text-sm font-orbitron text-neon-blue w-8 text-right">{bpm}</span>
    </div>
  );
};

const BeatIndicator: React.FC = () => {
  const { currentBeat, totalBeats } = useGameStore();

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-exo text-white/40">节拍</span>
      <span className="font-orbitron text-sm">
        <span className="text-neon-pink">{currentBeat}</span>
        <span className="text-white/30"> / </span>
        <span className="text-white/50">{totalBeats}</span>
      </span>
    </div>
  );
};

const ResetButton: React.FC<{ onReset: () => void }> = ({ onReset }) => {
  return (
    <button
      onClick={onReset}
      className="flex items-center gap-1.5 px-3 py-2 rounded-lg
        bg-white/5 text-white/40 hover:bg-neon-pink/10 hover:text-neon-pink
        transition-all duration-200 cursor-pointer text-sm font-exo"
    >
      <RotateCcw size={14} />
      重置
    </button>
  );
};

export const UILayer: React.FC<{ onReset: () => void }> = ({ onReset }) => {
  return (
    <>
      <aside
        className="absolute top-4 left-4 w-44 p-4 rounded-2xl
          bg-black/40 backdrop-blur-[16px] border border-white/[0.06]
          shadow-[0_8px_32px_rgba(0,0,0,0.4)] z-10"
      >
        <h2 className="font-orbitron text-sm font-bold bg-gradient-to-r from-neon-blue to-neon-purple bg-clip-text text-transparent mb-4">
          音符选择
        </h2>
        <NoteSelector />
      </aside>

      <div
        className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-5
          px-6 py-3 rounded-2xl
          bg-black/40 backdrop-blur-[16px] border border-white/[0.06]
          shadow-[0_8px_32px_rgba(0,0,0,0.4)] z-10"
      >
        <PlayPauseButton />
        <div className="w-px h-8 bg-white/10" />
        <BpmSlider />
        <div className="w-px h-8 bg-white/10" />
        <BeatIndicator />
        <div className="w-px h-8 bg-white/10" />
        <ResetButton onReset={onReset} />
      </div>

      <h1
        className="absolute top-4 left-1/2 -translate-x-1/2 font-orbitron text-lg font-bold
          bg-gradient-to-r from-neon-blue via-neon-purple to-neon-pink bg-clip-text text-transparent
          pointer-events-none z-10 tracking-wider"
      >
        幻音织网
      </h1>
    </>
  );
};
