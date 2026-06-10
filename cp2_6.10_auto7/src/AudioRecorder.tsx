import React, { useState, useRef, useEffect, useCallback } from 'react';

interface AudioRecorderProps {
  onRecorded: (blob: Blob, audioId: string) => void;
  existingAudioId?: string;
  existingAudioUrl?: string;
}

const CANVAS_W = 200;
const CANVAS_H = 80;
const MAX_DURATION = 15;
const GRADIENT_START = '#2A1E38';
const GRADIENT_END = '#1E2A38';
const COLOR_RECORDING = '#7B9FFF';
const COLOR_PLAYBACK = '#5B7FFF';
const LINE_WIDTH = 2;

function generateId(): string {
  return `aud_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function drawGradientBg(ctx: CanvasRenderingContext2D) {
  const grad = ctx.createLinearGradient(0, 0, CANVAS_W, CANVAS_H);
  grad.addColorStop(0, GRADIENT_START);
  grad.addColorStop(1, GRADIENT_END);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
}

function drawStaticWaveform(ctx: CanvasRenderingContext2D) {
  drawGradientBg(ctx);
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(123,159,255,0.35)';
  ctx.lineWidth = LINE_WIDTH;
  const mid = CANVAS_H / 2;
  for (let x = 0; x < CANVAS_W; x++) {
    const y = mid + Math.sin(x * 0.08) * 8 * Math.sin(x * 0.03);
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function drawLiveWaveform(ctx: CanvasRenderingContext2D, data: Uint8Array, color: string) {
  drawGradientBg(ctx);
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = LINE_WIDTH;
  ctx.lineJoin = 'round';
  const sliceWidth = CANVAS_W / data.length;
  let x = 0;
  for (let i = 0; i < data.length; i++) {
    const v = data[i] / 128.0;
    const y = (v * CANVAS_H) / 2;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
    x += sliceWidth;
  }
  ctx.stroke();
}

export default function AudioRecorder({ onRecorded, existingAudioId, existingAudioUrl }: AudioRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(MAX_DURATION);
  const [hasRecording, setHasRecording] = useState(false);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);
  const chunksRef = useRef<Blob[]>([]);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playAudioCtxRef = useRef<AudioContext | null>(null);
  const playAnalyserRef = useRef<AnalyserNode | null>(null);
  const playSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const playAnimRef = useRef<number>(0);
  const recordedBlobRef = useRef<Blob | null>(null);
  const rippleCounter = useRef(0);

  const stopDrawing = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = 0;
    }
    if (playAnimRef.current) {
      cancelAnimationFrame(playAnimRef.current);
      playAnimRef.current = 0;
    }
  }, []);

  const drawRecordingWaveform = useCallback(() => {
    const analyser = analyserRef.current;
    const canvas = canvasRef.current;
    if (!analyser || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const bufLen = analyser.fftSize;
    const data = new Uint8Array(bufLen);

    const draw = () => {
      analyser.getByteTimeDomainData(data);
      drawLiveWaveform(ctx, data, COLOR_RECORDING);
      animationFrameRef.current = requestAnimationFrame(draw);
    };
    draw();
  }, []);

  const drawPlaybackWaveform = useCallback(() => {
    const analyser = playAnalyserRef.current;
    const canvas = canvasRef.current;
    if (!analyser || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const bufLen = analyser.fftSize;
    const data = new Uint8Array(bufLen);

    const draw = () => {
      analyser.getByteTimeDomainData(data);
      drawLiveWaveform(ctx, data, COLOR_PLAYBACK);
      playAnimRef.current = requestAnimationFrame(draw);
    };
    draw();
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        recordedBlobRef.current = blob;
        const url = URL.createObjectURL(blob);
        setRecordedUrl(url);
        setHasRecording(true);
        const audioId = generateId();
        onRecorded(blob, audioId);
      };

      recorder.start();
      setRecording(true);
      setTimeLeft(MAX_DURATION);

      countdownRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          stopRecording();
        }
      }, MAX_DURATION * 1000);

      drawRecordingWaveform();
    } catch {
      // microphone access denied
    }
  }, [onRecorded, drawRecordingWaveform]);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === 'recording') {
      recorder.stop();
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    analyserRef.current = null;
    stopDrawing();
    setRecording(false);
  }, [stopDrawing]);

  const playAudio = useCallback(() => {
    const url = recordedUrl || existingAudioUrl;
    if (!url) return;

    const audio = new Audio(url);
    audioElementRef.current = audio;

    const audioCtx = new AudioContext();
    playAudioCtxRef.current = audioCtx;
    const source = audioCtx.createMediaElementSource(audio);
    playSourceRef.current = source;
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
    playAnalyserRef.current = analyser;

    audio.onended = () => {
      setPlaying(false);
      stopDrawing();
      if (playAudioCtxRef.current) {
        playAudioCtxRef.current.close();
        playAudioCtxRef.current = null;
      }
      playAnalyserRef.current = null;
      playSourceRef.current = null;
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) drawStaticWaveform(ctx);
      }
    };

    setPlaying(true);
    audio.play();
    drawPlaybackWaveform();
  }, [recordedUrl, existingAudioUrl, drawPlaybackWaveform, stopDrawing]);

  const stopPlayback = useCallback(() => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
      audioElementRef.current = null;
    }
    if (playAudioCtxRef.current) {
      playAudioCtxRef.current.close();
      playAudioCtxRef.current = null;
    }
    playAnalyserRef.current = null;
    playSourceRef.current = null;
    stopDrawing();
    setPlaying(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) drawStaticWaveform(ctx);
    }
  }, [stopDrawing]);

  const handleRecordClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = ++rippleCounter.current;
    setRipples((prev) => [...prev, { id, x, y }]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 600);

    if (recording) {
      stopRecording();
    } else {
      if (playing) stopPlayback();
      startRecording();
    }
  }, [recording, playing, startRecording, stopRecording, stopPlayback]);

  const handlePlayClick = useCallback(() => {
    if (playing) {
      stopPlayback();
    } else {
      playAudio();
    }
  }, [playing, playAudio, stopPlayback]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (!recording && !playing && !hasRecording && !existingAudioUrl) {
      drawStaticWaveform(ctx);
    }
  }, [recording, playing, hasRecording, existingAudioUrl]);

  useEffect(() => {
    if (existingAudioUrl) {
      setHasRecording(true);
    }
  }, [existingAudioUrl]);

  useEffect(() => {
    return () => {
      stopDrawing();
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      if (audioContextRef.current) audioContextRef.current.close();
      if (playAudioCtxRef.current) playAudioCtxRef.current.close();
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current = null;
      }
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    };
  }, []);

  const micIcon = (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="1" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0014 0" />
      <line x1="12" y1="17" x2="12" y2="22" />
      <line x1="8" y1="22" x2="16" y2="22" />
    </svg>
  );

  const stopIcon = (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="white">
      <rect x="3" y="3" width="14" height="14" rx="2" />
    </svg>
  );

  const playIcon = (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="white">
      <polygon points="4,1 18,10 4,19" />
    </svg>
  );

  const pauseIcon = (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="white">
      <rect x="3" y="2" width="5" height="16" rx="1" />
      <rect x="12" y="2" width="5" height="16" rx="1" />
    </svg>
  );

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 12,
      padding: 16,
      borderRadius: 16,
      background: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.1)',
    }}>
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        style={{
          borderRadius: 8,
          display: 'block',
          width: CANVAS_W,
          height: CANVAS_H,
        }}
      />

      {recording && (
        <div style={{
          color: '#FF7A7A',
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: 0.5,
        }}>
          {timeLeft}s
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button
          onClick={handleRecordClick}
          style={{
            position: 'relative',
            width: 56,
            height: 56,
            borderRadius: '50%',
            border: 'none',
            background: recording
              ? '#FF5A5A'
              : '#5B7FFF',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            overflow: 'hidden',
            outline: 'none',
            transition: 'background 200ms ease, transform 150ms ease',
            animation: recording ? 'recPulse 1s ease-in-out infinite' : 'none',
            padding: 0,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.06)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          {ripples.map((r) => (
            <span
              key={r.id}
              style={{
                position: 'absolute',
                left: r.x - 28,
                top: r.y - 28,
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.35)',
                animation: 'ripple 0.6s ease-out forwards',
                pointerEvents: 'none',
              }}
            />
          ))}
          {recording ? stopIcon : micIcon}
        </button>

        {(hasRecording || existingAudioUrl) && !recording && (
          <button
            onClick={handlePlayClick}
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              border: 'none',
              background: playing ? '#FF5A5A' : '#7B9FFF',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              outline: 'none',
              transition: 'background 200ms ease, transform 150ms ease',
              padding: 0,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.06)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            {playing ? pauseIcon : playIcon}
          </button>
        )}
      </div>

      <style>{`
        @keyframes recPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,90,90,0.5); }
          50% { box-shadow: 0 0 0 14px rgba(255,90,90,0); }
        }
        @keyframes ripple {
          0% { transform: scale(0.5); opacity: 0.7; }
          100% { transform: scale(2.2); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
