import { useRef, useCallback, useState, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Upload, Music, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppStore, PRESETS, type InfoCardData, type CoreEngine } from './CoreEngine';
import type { BandType } from './AudioAnalyzer';

const BAND_LABELS: Record<BandType, string> = {
  low: '低频',
  mid: '中频',
  high: '高频',
};

const BAND_COLORS: Record<BandType, string> = {
  low: '#e040fb',
  mid: '#00e5ff',
  high: '#ffd740',
};

function ControlPanel({ engine }: { engine: CoreEngine }) {
  const isPlaying = useAppStore(s => s.isPlaying);
  const volume = useAppStore(s => s.volume);
  const currentTrackName = useAppStore(s => s.currentTrackName);
  const hasAudio = useAppStore(s => s.hasAudio);
  const duration = useAppStore(s => s.duration);
  const currentTime = useAppStore(s => s.currentTime);
  const [muted, setMuted] = useState(false);
  const prevVolume = useRef(0.7);

  const formatTime = (t: number) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? Math.min(currentTime / duration, 1) : 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30">
      <div className="glass-panel mx-4 mb-4 px-6 py-3 flex items-center gap-4 rounded-2xl">
        <button
          onClick={() => engine.togglePlay()}
          disabled={!hasAudio}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {isPlaying ? <Pause size={18} className="text-white" /> : <Play size={18} className="text-white ml-0.5" />}
        </button>

        <span className="text-xs text-white/50 font-mono min-w-[36px]">
          {formatTime(currentTime)}
        </span>

        <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden relative group cursor-pointer">
          <div
            className="h-full rounded-full transition-all duration-100"
            style={{
              width: `${progress * 100}%`,
              background: 'linear-gradient(90deg, #e040fb, #00e5ff, #ffd740)',
            }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `calc(${progress * 100}% - 6px)` }}
          />
        </div>

        <span className="text-xs text-white/50 font-mono min-w-[36px]">
          {formatTime(duration)}
        </span>

        <div className="flex items-center gap-2 ml-2">
          <button
            onClick={() => {
              if (muted) {
                engine.setVolume(prevVolume.current);
                setMuted(false);
              } else {
                prevVolume.current = volume;
                engine.setVolume(0);
                setMuted(true);
              }
            }}
            className="text-white/60 hover:text-white transition-colors"
          >
            {muted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={muted ? 0 : volume}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              engine.setVolume(v);
              setMuted(v === 0);
            }}
            className="w-20 accent-white/80 h-1"
          />
        </div>

        {currentTrackName && (
          <div className="flex items-center gap-2 ml-2 text-white/70 text-sm">
            <Music size={14} />
            <span className="truncate max-w-[160px]">{currentTrackName}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function PresetPanel({ engine }: { engine: CoreEngine }) {
  const panelOpen = useAppStore(s => s.panelOpen);
  const currentPreset = useAppStore(s => s.currentPreset);
  const setPanelOpen = useAppStore(s => s.setPanelOpen);

  return (
    <>
      <button
        onClick={() => setPanelOpen(!panelOpen)}
        className="fixed top-4 left-4 z-40 w-10 h-10 flex items-center justify-center rounded-xl glass-panel hover:bg-white/15 transition-all duration-200"
      >
        {panelOpen ? <ChevronLeft size={18} className="text-white/70" /> : <ChevronRight size={18} className="text-white/70" />}
      </button>

      <div
        className={`fixed top-0 left-0 bottom-0 z-30 w-72 glass-panel rounded-r-2xl transition-transform duration-500 ease-out ${
          panelOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
      >
        <div className="p-6 h-full flex flex-col">
          <h2 className="text-lg font-bold text-white mb-1 tracking-wider" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            音律流光
          </h2>
          <p className="text-xs text-white/40 mb-6">Rhythm Lumina</p>

          <div className="mb-6">
            <h3 className="text-sm text-white/60 mb-3 flex items-center gap-2">
              <Music size={14} />
              预设古典乐
            </h3>
            <div className="space-y-2">
              {PRESETS.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => engine.loadPreset(preset.id).then(() => engine.play())}
                  className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 group ${
                    currentPreset === preset.id
                      ? 'bg-white/15 border border-white/20'
                      : 'bg-white/5 hover:bg-white/10 border border-transparent'
                  }`}
                >
                  <div className="text-sm text-white/90 font-medium">{preset.name}</div>
                  <div className="text-xs text-white/40 mt-0.5">{preset.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-auto">
            <UploadSection engine={engine} />
          </div>
        </div>
      </div>
    </>
  );
}

function UploadSection({ engine }: { engine: CoreEngine }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    setError('');
    if (!file.type.startsWith('audio/')) {
      setError('请上传音频文件');
      return;
    }
    const result = await engine.loadFile(file);
    if (result.success) {
      engine.play();
    } else {
      setError(result.error || '加载失败');
    }
  }, [engine]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div>
      <h3 className="text-sm text-white/60 mb-3 flex items-center gap-2">
        <Upload size={14} />
        上传音频
      </h3>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-200 ${
          dragOver ? 'border-white/30 bg-white/10' : 'border-white/10 hover:border-white/20 hover:bg-white/5'
        }`}
      >
        <Upload size={24} className="mx-auto text-white/30 mb-2" />
        <p className="text-xs text-white/40">拖拽或点击上传</p>
        <p className="text-xs text-white/25 mt-1">支持 MP3/WAV/OGG，≤30秒</p>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
    </div>
  );
}

function SpectrumChart({ data }: { data: InfoCardData['spectrum'] }) {
  if (data.labels.length === 0) return null;
  const maxValue = Math.max(...data.values, 0.01);

  return (
    <div className="flex items-end gap-2 h-24 mt-3">
      {data.labels.map((label, i) => {
        const height = (data.values[i] / maxValue) * 100;
        const hue = (i / data.labels.length) * 270;
        return (
          <div key={label} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full rounded-t-md transition-all duration-300"
              style={{
                height: `${Math.max(height, 4)}%`,
                background: `linear-gradient(to top, hsl(${hue}, 80%, 60%), hsl(${hue}, 90%, 70%))`,
                boxShadow: `0 0 8px hsla(${hue}, 80%, 60%, 0.4)`,
              }}
            />
            <span className="text-[10px] text-white/40">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

function InfoCard({ engine }: { engine: CoreEngine }) {
  const infoCard = useAppStore(s => s.infoCard);

  if (!infoCard.visible || !infoCard.band) return null;

  const color = BAND_COLORS[infoCard.band];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => engine.closeInfoCard()}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className="relative glass-panel rounded-2xl p-6 max-w-sm w-full mx-4 animate-fadeIn"
        style={{ borderColor: color + '30' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => engine.closeInfoCard()}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-all"
        >
          <X size={14} className="text-white/60" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: color, boxShadow: `0 0 12px ${color}80` }}
          />
          <span className="text-sm font-medium text-white/80">{BAND_LABELS[infoCard.band]}频谱分析</span>
        </div>

        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-4"
          style={{
            backgroundColor: color + '20',
            color: color,
            border: `1px solid ${color}30`,
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
          {infoCard.emotion}
        </div>

        <SpectrumChart data={infoCard.spectrum} />

        <p className="text-xs text-white/30 mt-4 text-center">点击任意处关闭</p>
      </div>
    </div>
  );
}

function HintOverlay() {
  const hasAudio = useAppStore(s => s.hasAudio);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (hasAudio) {
      const t = setTimeout(() => setVisible(false), 3000);
      return () => clearTimeout(t);
    }
  }, [hasAudio]);

  if (!visible || hasAudio) return null;

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center pointer-events-none">
      <div className="text-center animate-fadeIn">
        <p className="text-white/20 text-lg mb-2" style={{ fontFamily: 'Orbitron, sans-serif' }}>
          Rhythm Lumina
        </p>
        <p className="text-white/15 text-sm">从左侧选择预设或上传音频开始体验</p>
        <p className="text-white/10 text-xs mt-4">拖拽旋转 · 滚轮缩放 · 点击粒子查看频谱</p>
      </div>
    </div>
  );
}

export default function UILayer({ engine }: { engine: CoreEngine }) {
  return (
    <>
      <ControlPanel engine={engine} />
      <PresetPanel engine={engine} />
      <InfoCard engine={engine} />
      <HintOverlay />
    </>
  );
}
