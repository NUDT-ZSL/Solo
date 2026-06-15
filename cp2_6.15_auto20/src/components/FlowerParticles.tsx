import React, { useEffect, useRef } from 'react';

const COLORS = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff'];

interface Particle {
  x: number;
  y: number;
  radius: number;
  color: string;
  angle: number;
  distance: number;
  speed: number;
  pulsePhase: number;
}

const FlowerParticles: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const angleRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const container = canvas.parentElement;
      if (container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
      }
    };
    resize();
    window.addEventListener('resize', resize);

    const particles: Particle[] = [];
    for (let i = 0; i < 50; i++) {
      particles.push({
        x: 0,
        y: 0,
        radius: 3 + Math.random() * 3,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        angle: (Math.PI * 2 * i) / 50,
        distance: 60 + Math.random() * 100,
        speed: 0.02 + Math.random() * 0.03,
        pulsePhase: Math.random() * Math.PI * 2,
      });
    }
    particlesRef.current = particles;

    let frame = 0;
    const animate = () => {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      angleRef.current += 0.05;
      frame++;

      particlesRef.current.forEach(p => {
        const currentAngle = p.angle + angleRef.current;
        const pulse = 1 + Math.sin(frame * 0.03 + p.pulsePhase) * 0.2;
        const currentRadius = p.radius * pulse;
        const currentDistance = p.distance * (0.8 + Math.sin(frame * 0.02 + p.pulsePhase) * 0.2);

        p.x = centerX + Math.cos(currentAngle) * currentDistance;
        p.y = centerY + Math.sin(currentAngle) * currentDistance;

        ctx.beginPath();
        ctx.arc(p.x, p.y, currentRadius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.9;
        ctx.fill();

        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, currentRadius * 2);
        gradient.addColorStop(0, p.color + '80');
        gradient.addColorStop(1, p.color + '00');
        ctx.beginPath();
        ctx.arc(p.x, p.y, currentRadius * 2, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.globalAlpha = 0.5;
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      ctx.beginPath();
      ctx.arc(centerX, centerY, 25, 0, Math.PI * 2);
      const centerGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 35);
      centerGradient.addColorStop(0, '#ffd93d');
      centerGradient.addColorStop(0.5, '#ff6b6b');
      centerGradient.addColorStop(1, '#ff6b6b00');
      ctx.fillStyle = centerGradient;
      ctx.fill();

      animationRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />;
};

export default FlowerParticles;
