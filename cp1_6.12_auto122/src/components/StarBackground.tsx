import { useEffect, useRef } from 'react';

interface StarParticle {
  x: number;
  y: number;
  size: number;
  opacity: number;
  floatSpeed: number;
  floatPhase: number;
  driftSpeed: number;
  driftDirection: number;
}

export default function StarBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<StarParticle[]>([]);
  const animationRef = useRef<number>();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const particles: StarParticle[] = [];
    for (let i = 0; i < 30; i++) {
      particles.push({
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 1 + Math.random() * 2,
        opacity: 0.3 + Math.random() * 0.3,
        floatSpeed: 2 + Math.random() * 2,
        floatPhase: Math.random() * Math.PI * 2,
        driftSpeed: 0.02 + Math.random() * 0.03,
        driftDirection: Math.random() > 0.5 ? 1 : -1
      });
    }
    particlesRef.current = particles;

    const particleElements: HTMLDivElement[] = [];
    particles.forEach((p, i) => {
      const el = document.createElement('div');
      el.className = 'star-particle';
      el.style.width = `${p.size}px`;
      el.style.height = `${p.size}px`;
      el.style.left = `${p.x}%`;
      el.style.top = `${p.y}%`;
      el.style.opacity = String(p.opacity);
      container.appendChild(el);
      particleElements.push(el);
    });

    const startTime = Date.now();
    const animate = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      particles.forEach((p, i) => {
        const floatY = Math.sin(elapsed / p.floatSpeed * 2 + p.floatPhase) * 0.5;
        const driftX = elapsed * p.driftSpeed * p.driftDirection;
        const x = (p.x + driftX) % 100;
        const y = p.y + floatY;
        particleElements[i].style.left = `${x < 0 ? x + 100 : x}%`;
        particleElements[i].style.top = `${y}%`;
      });
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      particleElements.forEach(el => el.remove());
    };
  }, []);

  return <div ref={containerRef} className="star-bg" />;
}
