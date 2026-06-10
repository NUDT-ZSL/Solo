
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { getTotalScentsValue } from './types';
import type { ScentCard, ScentItem } from './types';

interface CardDetailProps {
  cards: ScentCard[];
  onBack: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseSize: number;
  color: string;
  phase: number;
  speed: number;
  active: boolean;
}

const PARTICLE_COUNT = 200;
const DURATION = 20000;

function getActiveScents(card: ScentCard): { scent: ScentItem; weight: number }[] {
  const total = getTotalScentsValue(card.scents);
  if (total === 0) return [];
  return card.scents
    .filter(s => s.value > 0)
    .map(s => ({ scent: s, weight: s.value / total }));
}

function getDominantColor(card: ScentCard): string {
  const active = getActiveScents(card);
  if (active.length === 0) return '#D4A574';
  active.sort((a, b) => b.weight - a.weight);
  return active[0].scent.color;
}

function pickWeightedColor(active: { scent: ScentItem; weight: number }[]): string {
  const r = Math.random();
  let acc = 0;
  for (const item of active) {
    acc += item.weight;
    if (r <= acc) return item.scent.color;
  }
  return active[active.length - 1].scent.color;
}

function getAverageWarmFrequency(card: ScentCard): number {
  const active = getActiveScents(card);
  if (active.length === 0) return 300;
  let warmTotal = 0;
  let coolTotal = 0;
  active.forEach(({ scent, weight }) => {
    if (scent.warm) warmTotal += weight;
    else coolTotal += weight;
  });
  const warmRatio = warmTotal / (warmTotal + coolTotal);
  return 150 + (1 - warmRatio) * 500;
}

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  return {
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle)
  };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= Math.PI ? '0' : '1';
  return [
    'M', start.x, start.y,
    'A', r, r, 0, largeArcFlag, 0, end.x, end.y,
    'L', cx, cy,
    'Z'
  ].join(' ');
}

function createParticlePool(count: number): Particle[] {
  const pool: Particle[] = [];
  for (let i = 0; i < count; i++) {
    pool.push({
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      baseSize: 0,
      color: '#ffffff',
      phase: 0,
      speed: 0,
      active: false
    });
  }
  return pool;
}

function resetParticle(p: Particle, canvasWidth: number, canvasHeight: number, activeScents: { scent: ScentItem; weight: number }[]) {
  p.x = Math.random() * canvasWidth;
  p.y = canvasHeight + Math.random() * 100;
  p.vx = (Math.random() - 0.5) * 0.6;
  p.vy = -(0.4 + Math.random() * 1.0);
  p.baseSize = 2 + Math.random() * 4;
  p.color = activeScents.length > 0 ? pickWeightedColor(activeScents) : '#D4A574';
  p.phase = Math.random() * Math.PI * 2;
  p.speed = 0.8 + Math.random() * 0.4;
  p.active = true;
}

function CardDetail({ cards, onBack }: CardDetailProps) {
  const { id } = useParams<{ id: string }>();
  const [card, setCard] = useState<ScentCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [closing, setClosing] = useState(false);
  const [hoveredScent, setHoveredScent] = useState<{ name: string; ratio: number; x: number; y: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlePoolRef = useRef<Particle[]>(createParticlePool(PARTICLE_COUNT));
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioNodesRef = useRef<{ stop: () => void } | null>(null);
  const playingRef = useRef(false);

  useEffect(() => {
    const existing = cards.find(c => c.id === id);
    if (existing) {
      setCard(existing);
      setLoading(false);
    } else if (id) {
      fetch(`/api/cards/${id}`)
        .then(r => r.json())
        .then(data => {
          if (data.success) {
            setCard(data.data);
          }
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [id, cards]);

  const startAudio = useCallback((c: ScentCard) => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      const baseFreq = getAverageWarmFrequency(c);
      const activeCount = Math.max(1, getActiveScents(c).length);

      const masterGain = ctx.createGain();
      masterGain.gain.value = 0.08;
      masterGain.connect(ctx.destination);

      const oscillators: OscillatorNode[] = [];
      for (let i = 0; i < activeCount; i++) {
        const osc = ctx.createOscillator();
        osc.type = i === 0 ? 'sine' : 'triangle';
        osc.frequency.value = baseFreq * (1 + i * 0.5);
        const oscGain = ctx.createGain();
        oscGain.gain.value = 0.3 / activeCount;
        osc.connect(oscGain);
        oscGain.connect(masterGain);
        osc.start();
        oscillators.push(osc);
      }

      const bufferSize = 2 * ctx.sampleRate;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * 0.5;
      }
      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'lowpass';
      noiseFilter.frequency.value = 800;

      const noiseGain = ctx.createGain();
      noiseGain.gain.value = 0.04;

      whiteNoise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(masterGain);
      whiteNoise.start();

      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.3;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.03;
      lfo.connect(lfoGain);
      lfoGain.connect(masterGain.gain);
      lfo.start();

      audioNodesRef.current = {
        stop: () => {
          oscillators.forEach(o => { try { o.stop(); } catch {} });
          try { whiteNoise.stop(); } catch {}
          try { lfo.stop(); } catch {}
        }
      };
    } catch (e) {
      console.warn('Audio init failed:', e);
    }
  }, []);

  const stopAudio = useCallback(() => {
    if (audioNodesRef.current) {
      try { audioNodesRef.current.stop(); } catch {}
      audioNodesRef.current = null;
    }
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close(); } catch {}
      audioCtxRef.current = null;
    }
  }, []);

  const startParticles = useCallback((c: ScentCard) => {
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

    const activeScents = getActiveScents(c);
    const pool = particlePoolRef.current;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      resetParticle(pool[i], canvas.width, canvas.height, activeScents);
      pool[i].y = Math.random() * canvas.height;
    }

    startTimeRef.current = performance.now();
    playingRef.current = true;

    const animate = () => {
      if (!playingRef.current) return;

      const elapsed = performance.now() - startTimeRef.current;
      if (elapsed > DURATION) {
        playingRef.current = false;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setIsPlaying(false);
        stopAudio();
        window.removeEventListener('resize', resizeCanvas);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const time = elapsed * 0.001;
      const sin = Math.sin;

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const p = pool[i];
        if (!p.active) continue;

        p.x += p.vx + sin(time * 2 + p.phase) * 0.25;
        p.y += p.vy * p.speed;

        const sizeVar = 2 + sin(time * 3 + p.phase) * 2;
        const displaySize = sizeVar < 2 ? 2 : sizeVar > 6 ? 6 : sizeVar;

        const alphaRaw = 1 - (p.y / canvas.height);
        const alpha = alphaRaw < 0 ? 0 : alphaRaw > 1 ? 1 : alphaRaw;

        ctx.beginPath();
        ctx.arc(p.x, p.y, displaySize, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha * 0.8;
        ctx.fill();

        if (p.y < -20) {
          p.x = Math.random() * canvas.width;
          p.y = canvas.height + 20;
        }
      }

      ctx.globalAlpha = 1;

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    setIsPlaying(true);
    startAudio(c);
  }, [startAudio, stopAudio]);

  const stopParticles = useCallback(() => {
    playingRef.current = false;
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    stopAudio();
    setIsPlaying(false);
  }, [stopAudio]);

  useEffect(() => {
    return () => {
      stopParticles();
    };
  }, [stopParticles]);

  const handlePlay = () => {
    if (!card) return;
    if (isPlaying) {
      stopParticles();
    } else {
      startParticles(card);
    }
  };

  const handleClose = () => {
    stopParticles();
    setClosing(true);
    setTimeout(() => {
      onBack();
    }, 380);
  };

  if (loading) {
    return (
      <div className="detail-page">
        <div style={{ color: 'white' }}>加载中...</div>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="detail-page">
        <div style={{ color: 'white' }}>
          卡片不存在
          <button className="btn" style={{ marginLeft: 16 }} onClick={onBack}>返回</button>
        </div>
      </div>
    );
  }

  const total = getTotalScentsValue(card.scents);
  const dominantColor = getDominantColor(card);
  const cx = 90, cy = 90, outerR = 80, innerR = 55;

  return (
    <div className={`detail-page ${closing ? 'closing' : ''}`}>
      <canvas ref={canvasRef} className="particle-canvas" />

      <div className={`detail-card ${closing ? 'closing' : ''}`}>
        <button className="close-btn" onClick={handleClose}>×</button>

        {card.imageData ? (
          <img src={card.imageData} alt={card.title} className="detail-image" />
        ) : (
          <div
            className="detail-image-placeholder"
            style={{
              background: `radial-gradient(circle at 30% 30%, ${dominantColor}99 0%, transparent 70%), #2A2A2A`
            }}
          />
        )}

        <h2 className="detail-title">{card.title}</h2>
        <p className="detail-description">{card.description}</p>

        <div className="detail-palette-wrapper">
          <div className="ring-palette">
            <svg viewBox="0 0 180 180">
              {total === 0 ? (
                <circle cx={cx} cy={cy} r={outerR} fill="#3A3A3A" />
              ) : (
                (() => {
                  let startAngle = 0;
                  return card.scents.map(scent => {
                    if (scent.value <= 0) return null;
                    const angle = (scent.value / total) * Math.PI * 2;
                    const endAngle = startAngle + angle;
                    const midAngle = (startAngle + endAngle) / 2;
                    const midR = (outerR + innerR) / 2;
                    const tipX = cx + midR * Math.cos(midAngle);
                    const tipY = cy + midR * Math.sin(midAngle);

                    const outerPath = describeArc(cx, cy, outerR, startAngle, endAngle);
                    const innerPath = describeArc(cx, cy, innerR, startAngle, endAngle);
                    const innerReversed = innerPath.replace(/M ([\d.]+) ([\d.]+)/, 'L $1 $2').replace(/Z/g, '');

                    startAngle = endAngle;

                    return (
                      <g key={scent.key}>
                        <path
                          className="ring-segment"
                          d={`${outerPath} ${innerReversed} Z`}
                          fill={scent.color}
                          stroke="#1A1A1A"
                          strokeWidth={1}
                          onMouseEnter={() => setHoveredScent({
                            name: scent.name,
                            ratio: Math.round((scent.value / total) * 100),
                            x: tipX,
                            y: tipY
                          })}
                          onMouseLeave={() => setHoveredScent(null)}
                        />
                      </g>
                    );
                  });
                })()
              )}
              <circle cx={cx} cy={cy} r={innerR} fill="#2A2A2A" />
            </svg>
            {hoveredScent && (
              <div
                className="scent-tooltip"
                style={{
                  left: `${(hoveredScent.x / 180) * 100}%`,
                  top: `${(hoveredScent.y / 180) * 100}%`
                }}
              >
                {hoveredScent.name} · {hoveredScent.ratio}%
              </div>
            )}
          </div>
        </div>

        <div className="detail-actions">
          <button className="btn" onClick={handlePlay}>
            {isPlaying ? '■ 停止' : '▶ 播放体验'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CardDetail;
