import { useEffect, useRef, useState, useCallback } from 'react';
import { TokenRenderer } from '@/utils/TokenRenderer';
import { soundEngine } from '@/utils/SoundEngine';
import { useStore } from '@/store/useStore';
import { Totem } from '@/types';
import { Mic, Upload, X, Volume2, Clock, Play, Zap } from 'lucide-react';

const renderer = new TokenRenderer();

function DetailCard({ totem, onClose, onResonate }: { totem: Totem; onClose: () => void; onResonate: () => void }) {
  const waveformRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (waveformRef.current && totem) {
      renderer.drawWaveform(waveformRef.current, totem.waveform, totem.colorPrimary, 300, 80);
    }
  }, [totem]);

  if (!totem) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative detail-card rounded-2xl p-6 w-[380px] max-w-[90vw]"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-3 right-3 text-white/60 hover:text-white transition-colors">
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${totem.colorPrimary}, ${totem.colorSecondary})` }}>
            <Volume2 size={18} className="text-white" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-lg" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              声波图腾
            </h3>
            <p className="text-white/40 text-xs">#{totem.id.slice(0, 8)}</p>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-white/50 text-xs mb-2">波形图</p>
          <canvas ref={waveformRef} className="w-full rounded-lg" style={{ height: 80 }} />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="detail-card-inner rounded-lg p-3">
            <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
              <Clock size={12} />
              <span>录制时间</span>
            </div>
            <p className="text-white text-sm">{new Date(totem.createdAt).toLocaleString('zh-CN')}</p>
          </div>
          <div className="detail-card-inner rounded-lg p-3">
            <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
              <Play size={12} />
              <span>播放次数</span>
            </div>
            <p className="text-white text-sm">{totem.playCount} 次</p>
          </div>
        </div>

        {totem.mergedFrom && totem.mergedFrom.length > 0 && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <p className="text-purple-300 text-xs">✨ 融合图腾 — 由 {totem.mergedFrom.length} 个图腾共鸣融合而成</p>
          </div>
        )}

        <button
          onClick={onResonate}
          className="w-full py-3 rounded-xl font-semibold text-white transition-all neon-btn flex items-center justify-center gap-2"
          style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '14px' }}
        >
          <Zap size={16} />
          共鸣
        </button>
      </div>
    </div>
  );
}

function RecordPanel() {
  const { isRecording, setIsRecording, setIsRecordPanelOpen, createTotem, userId, myTotems } = useStore();
  const [countdown, setCountdown] = useState(5);
  const [recording, setRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleStartRecording = useCallback(async () => {
    try {
      await soundEngine.startRecording();
      setRecording(true);
      setCountdown(5);

      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            handleStopRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      console.error('Failed to start recording:', err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStopRecording = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      const audioData = await soundEngine.stopRecording();
      setRecording(false);
      setIsRecording(false);
      await createTotem(audioData);
      setIsRecordPanelOpen(false);
    } catch (err) {
      console.error('Failed to stop recording:', err);
      setRecording(false);
    }
  }, [createTotem, setIsRecording, setIsRecordPanelOpen]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const audioData = reader.result as string;
      await createTotem(audioData);
      setIsRecordPanelOpen(false);
    };
    reader.readAsDataURL(file);
  }, [createTotem, setIsRecordPanelOpen]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const hasTotems = myTotems.length > 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center">
      <div className="detail-card rounded-t-2xl p-6 w-full max-w-[500px]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold text-lg" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            音频实验室
          </h3>
          <button onClick={() => setIsRecordPanelOpen(false)} className="text-white/60 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex gap-4">
          <button
            onClick={recording ? handleStopRecording : handleStartRecording}
            className={`flex-1 py-4 rounded-xl flex flex-col items-center gap-2 transition-all ${
              recording ? 'neon-btn-active' : 'neon-btn'
            }`}
          >
            <Mic size={24} className="text-white" />
            <span className="text-white text-sm font-medium">
              {recording ? `${countdown}s 点击停止` : '录制声音'}
            </span>
            {recording && (
              <div className="w-16 h-1 rounded-full bg-white/20 overflow-hidden">
                <div
                  className="h-full bg-pink-500 transition-all"
                  style={{ width: `${(5 - countdown) * 20}%` }}
                />
              </div>
            )}
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 py-4 rounded-xl flex flex-col items-center gap-2 neon-btn-blue transition-all"
          >
            <Upload size={24} className="text-white" />
            <span className="text-white text-sm font-medium">上传音频</span>
          </button>
          <input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={handleFileUpload} />
        </div>

        <p className="text-white/30 text-xs text-center mt-3">录制不超过5秒，或上传音频文件生成你的声波图腾</p>
      </div>
    </div>
  );
}

export default function WallPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const {
    totems,
    selectedTotemId,
    hoveredTotemId,
    isRecordPanelOpen,
    playingTotemId,
    fetchTotems,
    setSelectedTotemId,
    setHoveredTotemId,
    setIsRecordPanelOpen,
    setPlayingTotemId,
    incrementPlayCount,
    mergeTotems,
    userId,
    myTotems,
  } = useStore();

  const selectedTotem = totems.find((t) => t.id === selectedTotemId);

  useEffect(() => {
    fetchTotems();
  }, [fetchTotems]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    renderer.init(canvas);
    renderer.setCallbacks(
      (id) => setSelectedTotemId(id),
      (id) => setHoveredTotemId(id)
    );

    const handleResize = () => renderer.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      renderer.destroy();
      window.removeEventListener('resize', handleResize);
    };
  }, [setSelectedTotemId, setHoveredTotemId]);

  useEffect(() => {
    renderer.setTotems(totems);
  }, [totems]);

  useEffect(() => {
    if (hoveredTotemId) {
      const totem = totems.find((t) => t.id === hoveredTotemId);
      if (totem && !playingTotemId) {
        setPlayingTotemId(totem.id);
        incrementPlayCount(totem.id);
        soundEngine.playAudio(totem.audioData, 0.05, 0.05, () => {
          setPlayingTotemId(null);
        });
      }
    } else {
      soundEngine.stopPlayback();
      setPlayingTotemId(null);
    }
  }, [hoveredTotemId]);

  const handleResonate = useCallback(async () => {
    if (!selectedTotemId) return;
    const myLatest = myTotems.length > 0 ? myTotems[myTotems.length - 1] : null;
    if (!myLatest) return;
    try {
      await mergeTotems(myLatest.id, selectedTotemId);
      setSelectedTotemId(null);
    } catch (err) {
      console.error('Merge failed:', err);
    }
  }, [selectedTotemId, myTotems, mergeTotems, setSelectedTotemId]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0a0a1a]">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        onMouseMove={(e) => renderer.handleMouseMove(e)}
        onClick={(e) => renderer.handleClick(e)}
      />

      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
        <h1
          className="text-white text-2xl tracking-widest neon-title"
          style={{ fontFamily: 'Orbitron, sans-serif' }}
        >
          回声拼图
        </h1>
        <p className="text-white/30 text-xs text-center mt-1">ECHO PUZZLE</p>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
        <button
          onClick={() => setIsRecordPanelOpen(true)}
          className="neon-btn-pink px-8 py-3 rounded-full flex items-center gap-2 transition-all hover:scale-105"
        >
          <Mic size={18} className="text-white" />
          <span className="text-white font-medium" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            创建图腾
          </span>
        </button>
      </div>

      <div className="absolute top-4 right-4 z-10">
        <a
          href="/profile"
          className="text-white/40 hover:text-white text-sm transition-colors px-4 py-2 rounded-lg hover:bg-white/5"
          style={{ fontFamily: 'Rajdhani, sans-serif' }}
        >
          我的图腾
        </a>
      </div>

      {hoveredTotemId && !selectedTotemId && (
        <div className="absolute top-4 left-4 z-10 text-white/30 text-xs flex items-center gap-2">
          <Volume2 size={14} />
          <span>悬停播放</span>
        </div>
      )}

      {isRecordPanelOpen && <RecordPanel />}
      {selectedTotem && (
        <DetailCard
          totem={selectedTotem}
          onClose={() => setSelectedTotemId(null)}
          onResonate={handleResonate}
        />
      )}
    </div>
  );
}
