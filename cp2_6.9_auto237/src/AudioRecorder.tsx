import { useState, useRef, useEffect, useCallback } from 'react';

interface AudioRecorderProps {
  visible: boolean;
  onClose: () => void;
  onRecordingComplete: (blob: Blob, duration: number, waveform: number[]) => void;
}

const AudioRecorder = ({ visible, onClose, onRecordingComplete }: AudioRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [waveform, setWaveform] = useState<number[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const animationRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const liveWaveformRef = useRef<number[]>([]);

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteTimeDomainData(dataArray);

    ctx.fillStyle = '#1A1A2E';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.lineWidth = 2;
    ctx.strokeStyle = '#00E5FF';
    ctx.beginPath();

    const sliceWidth = canvas.width / bufferLength;
    let x = 0;
    const samples: number[] = [];

    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * canvas.height) / 2;
      samples.push(v - 1);

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      x += sliceWidth;
    }

    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();

    if (samples.length > 0) {
      const step = Math.floor(samples.length / 50);
      const compressed: number[] = [];
      for (let i = 0; i < samples.length; i += step) {
        compressed.push(Math.abs(samples[i]));
      }
      liveWaveformRef.current = compressed.slice(0, 100);
    }

    if (isRecording) {
      animationRef.current = requestAnimationFrame(drawWaveform);
    }
  }, [isRecording]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setWaveform([...liveWaveformRef.current]);
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setDuration(0);
      setAudioBlob(null);
      setWaveform([]);
      setPreviewUrl(null);

      const startTime = Date.now();
      timerRef.current = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setDuration(elapsed);
        if (elapsed >= 15) {
          stopRecording();
        }
      }, 100);

      drawWaveform();
    } catch (err) {
      console.error('录音启动失败:', err);
      alert('无法访问麦克风，请检查权限设置');
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    setIsRecording(false);
  };

  const togglePlayPreview = () => {
    if (!audioRef.current || !previewUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSubmit = () => {
    if (audioBlob && waveform.length > 0) {
      onRecordingComplete(audioBlob, duration, waveform);
      resetState();
    }
  };

  const resetState = () => {
    setIsRecording(false);
    setDuration(0);
    setAudioBlob(null);
    setWaveform([]);
    setPreviewUrl(null);
    setIsPlaying(false);
  };

  const handleClose = () => {
    stopRecording();
    resetState();
    onClose();
  };

  useEffect(() => {
    if (audioRef.current && previewUrl) {
      audioRef.current.onended = () => setIsPlaying(false);
    }
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  if (!visible) return null;

  return (
    <>
      <style>{`
        .recorder-panel {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: 150px;
          background: #1A1A2E;
          border-top: 1px solid #2A2A3A;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }
        .record-btn {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: #FF3B30;
          border: 3px solid #fff;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .record-btn.recording {
          animation: pulse 0.5s infinite;
        }
        .record-btn:hover {
          transform: scale(1.05);
        }
        .record-btn:active {
          transform: scale(0.97);
        }
        .waveform-canvas {
          position: absolute;
          left: 50%;
          top: 10px;
          transform: translateX(-50%);
          border-radius: 8px;
        }
        .close-recorder-btn {
          position: absolute;
          top: 15px;
          right: 15px;
          background: transparent;
          border: 1px solid #4A4A4A;
          color: #B0B0B0;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 16px;
          transition: all 0.3s ease;
        }
        .close-recorder-btn:hover {
          color: #FF6B6B;
          border-color: #FF6B6B;
        }
        .timer {
          position: absolute;
          top: 20px;
          left: 20px;
          color: #00E5FF;
          font-size: 18px;
          font-weight: 600;
        }
        .submit-btn {
          position: absolute;
          right: 60px;
          background: #00E5FF;
          color: #0F0F1A;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.3s ease;
        }
        .submit-btn:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 12px rgba(0, 229, 255, 0.3);
        }
        .submit-btn:active {
          transform: scale(0.97);
        }
        .submit-btn:disabled {
          background: #4A4A4A;
          color: #888;
          cursor: not-allowed;
          transform: none;
        }
        .play-preview-btn {
          margin-left: 20px;
          background: transparent;
          border: 1px solid #00E5FF;
          color: #00E5FF;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 16px;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .play-preview-btn:hover {
          background: #00E5FF;
          color: #0F0F1A;
        }
        .rerecord-btn {
          margin-right: 20px;
          background: transparent;
          border: 1px solid #FFD93D;
          color: #FFD93D;
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .rerecord-btn:hover {
          background: #FFD93D;
          color: #0F0F1A;
        }
      `}</style>
      <div className="recorder-panel">
        <div className="timer">{duration.toFixed(1)}s / 15s</div>
        <button className="close-recorder-btn" onClick={handleClose}>✕</button>
        <canvas ref={canvasRef} className="waveform-canvas" width="400" height="60" />
        <audio ref={audioRef} src={previewUrl || undefined} />

        {!audioBlob ? (
          <button
            className={`record-btn ${isRecording ? 'recording' : ''}`}
            onClick={isRecording ? stopRecording : startRecording}
          />
        ) : (
          <>
            <button className="rerecord-btn" onClick={() => { setAudioBlob(null); setPreviewUrl(null); }}>
              重新录制
            </button>
            <button className="play-preview-btn" onClick={togglePlayPreview}>
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button className="submit-btn" onClick={handleSubmit}>
              确认上传
            </button>
          </>
        )}
      </div>
    </>
  );
};

export default AudioRecorder;
