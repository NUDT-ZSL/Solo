import { useEffect, useRef } from 'react';

interface SyncOverlayProps {
  visible: boolean;
  progress: number;
  status: 'syncing' | 'synced' | 'error';
}

interface Particle {
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
  drift: number;
}

const SyncOverlay = ({ visible, progress, status }: SyncOverlayProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    if (!visible) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const initParticles = () => {
      const count = Math.floor(Math.random() * 31) + 20;
      particlesRef.current = [];

      for (let i = 0; i < count; i++) {
        particlesRef.current.push({
          x: Math.random() * canvas.width,
          y: canvas.height + Math.random() * 100,
          size: Math.random() * 30 + 15,
          speed: Math.random() * 1 + 0.5,
          opacity: Math.random() * 0.3 + 0.1,
          drift: (Math.random() - 0.5) * 0.5,
        });
      }
    };

    initParticles();

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach((particle) => {
        particle.y -= particle.speed;
        particle.x += particle.drift + Math.sin(particle.y * 0.01) * 0.3;

        if (particle.y < -particle.size) {
          particle.y = canvas.height + particle.size;
          particle.x = Math.random() * canvas.width;
        }

        const gradient = ctx.createRadialGradient(
          particle.x,
          particle.y,
          0,
          particle.x,
          particle.y,
          particle.size,
        );
        gradient.addColorStop(0, `rgba(255, 248, 220, ${particle.opacity})`);
        gradient.addColorStop(1, 'rgba(255, 248, 220, 0)');

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationRef.current);
    };
  }, [visible]);

  if (!visible) return null;

  const statusText = status === 'syncing' ? '香气飘送中...' : status === 'synced' ? '香气已送达 ✨' : '飘送出错了...';

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(26, 26, 46, 0.7)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          background: 'rgba(255, 248, 220, 0.95)',
          borderRadius: '20px',
          padding: '40px',
          textAlign: 'center',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          color: '#5D4E37',
          minWidth: '280px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🌸</div>
        <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>
          {statusText}
        </div>
        <div
          style={{
            width: '100%',
            height: '6px',
            background: 'rgba(139, 115, 85, 0.2)',
            borderRadius: '3px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              background: 'linear-gradient(90deg, #FFB6C1 0%, #FFBF00 50%, #7CCD7C 100%)',
              borderRadius: '3px',
              transition: 'width 0.3s ease',
              width: `${progress}%`,
            }}
          />
        </div>
        <div style={{ fontSize: '12px', marginTop: '8px', opacity: 0.7 }}>
          {Math.round(progress)}%
        </div>
      </div>
    </div>
  );
};

export default SyncOverlay;
