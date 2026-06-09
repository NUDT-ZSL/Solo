import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  radius: number;
  baseY: number;
  amplitude: number;
  speed: number;
  phase: number;
  opacity: number;
}

const WaveParticles: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    const initParticles = () => {
      const count = 50;
      const particles: Particle[] = [];
      for (let i = 0; i < count; i++) {
        const y = Math.random() * canvas.height;
        particles.push({
          x: Math.random() * canvas.width,
          y,
          baseY: y,
          radius: Math.random() * 4 + 2,
          amplitude: Math.random() * 30 + 10,
          speed: Math.random() * 0.008 + 0.002,
          phase: Math.random() * Math.PI * 2,
          opacity: Math.random() * 0.3 + 0.1,
        });
      }
      particlesRef.current = particles;
    };

    const animate = (time: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particlesRef.current) {
        p.y = p.baseY + Math.sin(time * p.speed + p.phase) * p.amplitude;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(144, 224, 239, ${p.opacity})`;
        ctx.fill();
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    resize();
    window.addEventListener('resize', resize);
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
};

export default WaveParticles;
