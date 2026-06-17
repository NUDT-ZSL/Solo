import React, { useRef, useCallback, useEffect, useState } from 'react';
import { saveAs } from 'file-saver';
import { FPS } from './types';

interface VideoExporterProps {
  canvas: HTMLCanvasElement | null;
  duration: number;
  isRecording: boolean;
  onRecordingStart: () => void;
  onRecordingEnd: () => void;
}

const VideoExporter: React.FC<VideoExporterProps> = ({
  canvas,
  duration,
  isRecording,
  onRecordingStart,
  onRecordingEnd,
}) => {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [blinkState, setBlinkState] = useState(false);
  const blinkIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (isRecording) {
      blinkIntervalRef.current = window.setInterval(() => {
        setBlinkState(prev => !prev);
      }, 500);
    } else {
      if (blinkIntervalRef.current) {
        clearInterval(blinkIntervalRef.current);
        blinkIntervalRef.current = null;
      }
      setBlinkState(false);
    }

    return () => {
      if (blinkIntervalRef.current) {
        clearInterval(blinkIntervalRef.current);
      }
    };
  }, [isRecording]);

  const startRecording = useCallback(() => {
    if (!canvas) {
      alert('请先输入代码并预览动画');
      return;
    }

    if (duration <= 0) {
      alert('请先输入代码');
      return;
    }

    chunksRef.current = [];

    try {
      const stream = canvas.captureStream(FPS);
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 5_000_000,
      });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        saveAs(blob, `code-animation-${timestamp}.webm`);
        chunksRef.current = [];
        onRecordingEnd();
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      onRecordingStart();

      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      }, duration + 500);

    } catch (err) {
      console.error('录制失败:', err);
      alert('录制失败，请检查浏览器是否支持 MediaRecorder API');
      onRecordingEnd();
    }
  }, [canvas, duration, onRecordingStart, onRecordingEnd]);

  const handleRecordClick = () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    } else {
      startRecording();
    }
  };

  const buttonBaseStyles: React.CSSProperties = {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s, transform 0.1s',
  };

  const recordButtonStyles: React.CSSProperties = {
    ...buttonBaseStyles,
    backgroundColor: isRecording
      ? (blinkState ? '#E74C3C' : '#C0392B')
      : '#E74C3C',
    opacity: isRecording && !blinkState ? 0.5 : 1,
    transition: isRecording ? 'opacity 0.25s, background-color 0.25s' : 'background-color 0.2s',
  };

  const innerIconStyles: React.CSSProperties = {
    width: '20px',
    height: '20px',
    borderRadius: isRecording ? '4px' : '50%',
    backgroundColor: 'white',
    transition: 'border-radius 0.2s',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      <button
        onClick={handleRecordClick}
        style={recordButtonStyles}
        onMouseEnter={(e) => {
          if (!isRecording) {
            e.currentTarget.style.backgroundColor = '#C0392B';
          }
        }}
        onMouseLeave={(e) => {
          if (!isRecording) {
            e.currentTarget.style.backgroundColor = '#E74C3C';
          }
        }}
        onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
        onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        title={isRecording ? '停止录制' : '开始录制'}
      >
        <div style={innerIconStyles} />
      </button>
      <span style={{ fontSize: '12px', color: '#CCCCCC' }}>
        {isRecording ? '录制中...' : '录制'}
      </span>
    </div>
  );
};

export default VideoExporter;
