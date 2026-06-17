import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, StopCircle, Play, RefreshCw } from 'lucide-react';

interface AudioRecorderProps {
  audioUrl: string | null;
  onAudioReady: (audioUrl: string | null) => void;
}

const MAX_DURATION_MS = 30_000;
const MAX_FILE_SIZE = 500 * 1024;
const BAR_COUNT = 30;
const PULSE_INTERVAL = 800;

export default function AudioRecorder({ audioUrl: externalAudioUrl, onAudioReady }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [internalAudioUrl, setInternalAudioUrl] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [pulseRed, setPulseRed] = useState(true);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const displayUrl = internalAudioUrl ?? externalAudioUrl;

  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = 0;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (pulseIntervalRef.current) {
      clearInterval(pulseIntervalRef.current);
      pulseIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    chunksRef.current = [];
  }, []);

  useEffect(() => {
    return () => {
      cleanup();
      if (internalAudioUrl) URL.revokeObjectURL(internalAudioUrl);
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current = null;
      }
    };
  }, [cleanup, internalAudioUrl]);

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const barWidth = width / BAR_COUNT - 2;
    const step = Math.floor(dataArray.length / BAR_COUNT);

    for (let i = 0; i < BAR_COUNT; i++) {
      const value = dataArray[i * step] / 255;
      const barHeight = Math.max(2, value * height);
      const x = i * (barWidth + 2);
      const y = (height - barHeight) / 2;
      const opacity = 0.3 + value * 0.7;

      ctx.fillStyle = `rgba(124, 77, 255, ${opacity})`;
      ctx.fillRect(x, y, barWidth, barHeight);
    }

    animationFrameRef.current = requestAnimationFrame(drawWaveform);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
          const totalSize = chunksRef.current.reduce((acc, c) => acc + c.size, 0);
          if (totalSize > MAX_FILE_SIZE) {
            mediaRecorder.stop();
          }
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        if (internalAudioUrl) URL.revokeObjectURL(internalAudioUrl);
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setInternalAudioUrl(url);
        onAudioReady(url);
        setIsRecording(false);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = 0;
        }
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
        if (pulseIntervalRef.current) {
          clearInterval(pulseIntervalRef.current);
          pulseIntervalRef.current = null;
        }
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setTimer(0);

      timerIntervalRef.current = setInterval(() => {
        setTimer(prev => {
          const next = prev + 1;
          if (next >= MAX_DURATION_MS / 1000) {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
              mediaRecorderRef.current.stop();
            }
            return MAX_DURATION_MS / 1000;
          }
          return next;
        });
      }, 1000);

      pulseIntervalRef.current = setInterval(() => {
        setPulseRed(prev => !prev);
      }, PULSE_INTERVAL);

      drawWaveform();
    } catch {
      console.error('Failed to start recording');
    }
  }, [drawWaveform, internalAudioUrl, onAudioReady]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const handlePlay = useCallback(() => {
    if (!displayUrl) return;
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current = null;
    }
    const audio = new Audio(displayUrl);
    audioElementRef.current = audio;
    audio.onended = () => setIsPlaying(false);
    audio.play();
    setIsPlaying(true);
  }, [displayUrl]);

  const handleReRecord = useCallback(() => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current = null;
    }
    setIsPlaying(false);
    setAudioBlob(null);
    if (internalAudioUrl) URL.revokeObjectURL(internalAudioUrl);
    setInternalAudioUrl(null);
    onAudioReady(null);
  }, [internalAudioUrl, onAudioReady]);

  const hasRecording = !!displayUrl && !isRecording;

  if (hasRecording) {
    return (
      <div className="flex items-center gap-3">
        <button
          onClick={handlePlay}
          className="flex items-center justify-center w-10 h-10 rounded-full transition-colors"
          style={{ backgroundColor: '#7c4dff' }}
        >
          <Play className="w-5 h-5 text-white" fill="white" />
        </button>
        <button
          onClick={handleReRecord}
          className="flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors"
          style={{ borderColor: '#7c4dff', color: '#7c4dff' }}
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>
    );
  }

  if (isRecording) {
    return (
      <div className="flex flex-col items-center gap-3">
        <canvas
          ref={canvasRef}
          width={240}
          height={60}
          className="rounded-lg"
          style={{ backgroundColor: 'rgba(124, 77, 255, 0.05)' }}
        />
        <span className="text-sm font-mono" style={{ color: '#7c4dff' }}>
          {timer}s / 30s
        </span>
        <button
          onClick={stopRecording}
          className="flex items-center justify-center w-14 h-14 rounded-full transition-all"
          style={{
            backgroundColor: pulseRed ? '#ff5252' : '#ff8a80',
            border: `3px solid ${pulseRed ? '#ff8a80' : '#ff5252'}`,
            animation: 'pulse 800ms ease-in-out infinite',
          }}
        >
          <StopCircle className="w-7 h-7 text-white" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={startRecording}
      className="flex items-center justify-center w-14 h-14 rounded-full transition-colors hover:opacity-90"
      style={{ backgroundColor: '#7c4dff' }}
    >
      <Mic className="w-7 h-7 text-white" />
    </button>
  );
}
