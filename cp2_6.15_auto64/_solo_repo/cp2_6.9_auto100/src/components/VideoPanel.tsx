import React, { useEffect, useRef } from 'react';
import { LandmarkPoint } from '../HandDetector';

interface VideoPanelProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  landmarks: LandmarkPoint[];
  connections: [number, number][];
  isMobile: boolean;
}

const VideoPanel: React.FC<VideoPanelProps> = ({ videoRef, landmarks, connections, isMobile }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    drawLandmarks();
  }, [landmarks]);

  const drawLandmarks = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = isMobile ? 300 : 480;
    const height = isMobile ? 225 : 360;
    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);

    if (landmarks.length < 21) return;

    ctx.strokeStyle = 'rgba(144, 238, 144, 0.7)';
    ctx.lineWidth = 2;

    for (const [a, b] of connections) {
      if (landmarks[a] && landmarks[b]) {
        ctx.beginPath();
        ctx.moveTo((1 - landmarks[a].x) * width, landmarks[a].y * height);
        ctx.lineTo((1 - landmarks[b].x) * width, landmarks[b].y * height);
        ctx.stroke();
      }
    }

    ctx.fillStyle = 'rgba(144, 238, 144, 0.9)';
    for (let i = 0; i < landmarks.length; i++) {
      const pt = landmarks[i];
      ctx.beginPath();
      ctx.arc((1 - pt.x) * width, pt.y * height, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const width = isMobile ? 300 : 480;
  const height = isMobile ? 225 : 360;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: `${width}px`,
        height: `${height}px`,
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 0 30px rgba(78, 205, 196, 0.5), 0 0 60px rgba(78, 205, 196, 0.3), inset 0 0 20px rgba(78, 205, 196, 0.2)',
        border: '2px solid rgba(78, 205, 196, 0.6)',
        background: '#000'
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: 'scaleX(-1)',
          display: 'block'
        }}
      />
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none'
        }}
      />
    </div>
  );
};

export default VideoPanel;
