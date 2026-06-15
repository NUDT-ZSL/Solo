import { useRef, useEffect, useCallback, useState } from 'react';
import { BubbleEngine } from '../BubbleEngine';
import { ParticleEngine } from '../ParticleEngine';
import { useDiaryStore } from '../DiaryStore';
import { DiaryEntry, MoodColor } from '../types';
import { PREVIEW_TEXT_LENGTH, MOOD_LABEL_MAP } from '../constants';
import DiaryCard from './DiaryCard';

export default function WallScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<BubbleEngine | null>(null);
  const particleRef = useRef<ParticleEngine | null>(null);
  const animFrameRef = useRef<number>(0);
  const [hoveredInfo, setHoveredInfo] = useState<{
    x: number;
    y: number;
    text: string;
  } | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<DiaryEntry | null>(null);

  const entries = useDiaryStore((s) => s.entries);
  const prevLenRef = useRef(entries.length);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (engineRef.current) {
        engineRef.current.resize(rect.width, rect.height);
      }
    };

    resizeCanvas();

    const rect = canvas.getBoundingClientRect();
    const engine = new BubbleEngine(rect.width, rect.height);
    const particles = new ParticleEngine();
    engineRef.current = engine;
    particleRef.current = particles;

    for (let i = 0; i < entries.length; i++) {
      engine.addBubble(entries[i].id, entries[i].moodColor, i * 80);
    }

    let lastTime = performance.now();

    const animate = (time: number) => {
      const dt = Math.min(time - lastTime, 50);
      lastTime = time;

      const r = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, r.width, r.height);

      const bgGrad = ctx.createLinearGradient(0, 0, 0, r.height);
      bgGrad.addColorStop(0, '#FFF8F0');
      bgGrad.addColorStop(1, '#FFE4E8');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, r.width, r.height);

      engine.update(dt);
      engine.render(ctx);

      particles.update(dt);
      particles.render(ctx);

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    const handleResize = () => resizeCanvas();
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    if (entries.length > prevLenRef.current) {
      const newEntries = entries.slice(prevLenRef.current);
      for (const entry of newEntries) {
        engine.addBubble(entry.id, entry.moodColor);
      }
    }
    prevLenRef.current = entries.length;
  }, [entries]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      const engine = engineRef.current;
      if (!canvas || !engine) return;

      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const hit = engine.hitTest(mx, my);

      for (const b of engine.bubbles) {
        b.hovered = b === hit;
      }

      if (hit) {
        const entry = entries.find((en) => en.id === hit.diaryId);
        if (entry) {
          const displayY = engine.getDisplayY(hit);
          setHoveredInfo({
            x: hit.x,
            y: displayY - hit.radius * hit.scale - 14,
            text:
              entry.text.slice(0, PREVIEW_TEXT_LENGTH) +
              (entry.text.length > PREVIEW_TEXT_LENGTH ? '...' : ''),
          });
        }
        canvas.style.cursor = 'pointer';
      } else {
        setHoveredInfo(null);
        canvas.style.cursor = 'default';
      }
    },
    [entries]
  );

  const handleMouseLeave = useCallback(() => {
    const engine = engineRef.current;
    if (engine) {
      for (const b of engine.bubbles) {
        b.hovered = false;
      }
    }
    setHoveredInfo(null);
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      const engine = engineRef.current;
      const particles = particleRef.current;
      if (!canvas || !engine || !particles) return;

      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const hit = engine.hitTest(mx, my);

      if (hit) {
        const displayY = engine.getDisplayY(hit);
        particles.emit(hit.x, displayY, hit.color as MoodColor);

        const entry = entries.find((en) => en.id === hit.diaryId);
        if (entry) {
          setSelectedEntry(entry);
        }
      }
    },
    [entries]
  );

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      />
      {hoveredInfo && (
        <div
          className="absolute pointer-events-none px-3.5 py-1.5 rounded-full text-xs whitespace-nowrap z-10"
          style={{
            left: hoveredInfo.x,
            top: hoveredInfo.y,
            transform: 'translate(-50%, -100%)',
            background: 'rgba(90,74,66,0.6)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            color: 'rgba(255,255,255,0.9)',
          }}
        >
          {hoveredInfo.text}
        </div>
      )}
      {selectedEntry && (
        <DiaryCard entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
      )}
    </div>
  );
}
