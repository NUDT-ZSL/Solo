
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { BASE_SCENTS } from './types';
import type { ScentCard, ScentRatio, BaseScent } from './types';

interface CardDetailProps {
  cards: ScentCard[];
  onBack: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  phase: number;
  life: number;
}

function getTotalRatio(r: ScentRatio) {
  return r.rose + r.sandalwood + r.seaSalt + r.pine + r.incense;
}

function getActiveScents(ratios: ScentRatio): { scent: BaseScent; weight: number }[] {
  const total = getTotalRatio(ratios);
  if (total === 0) return [];
  return BASE_SCENTS
    .filter(s => ratios[s.key] > 0)
    .map(s => ({ scent: s, weight: ratios[s.key] / total }));
}

function getDominantColor(ratios: ScentRatio): string {
  const active = getActiveScents(ratios);
  if (active.length === 0) return '#D4A574';
  active.sort((a, b) => b.weight - a.weight);
  return active[0].scent.color;
}

function pickWeightedColor(active: { scent: BaseScent; weight: number }[]): string {
  const r = Math.random();
  let acc = 0;
  for (const item of active) {
    acc += item.weight;
    if (r <= acc) return item.scent.color;
  }
  return active[active.length - 1].scent.color;
}

function getAverageWarmFrequency(ratios: ScentRatio): number {
  const active = getActiveScents(ratios);
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

function CardDetail({ cards, onBack }: CardDetailProps) {
  const { id } = useParams<{ id: string }>();
  const [card, setCard] = useState<ScentCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [closing, setClosing] = useState(false);
  const [hoveredScent, setHoveredScent] = useState<{ name: string; ratio: number; x: number; y: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioNodesRef = useRef<{ stop: () => void } | null>(null);

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

  const startAudio = useCallback((ratios: ScentRatio) => {
    try {
      const AudioCtx = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      const baseFreq = getAverageWarmFrequency(ratios);
      const activeCount = Math.max(1, getActiveScents(ratios).length);

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

  const startParticles = useCallback((ratios: ScentRatio) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const active = getActiveScents(ratios);
    const particles: Particle[] = [];
    const PARTICLE_COUNT = 200;
    const DURATION = 20000;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: canvas.height + Math.random() * 100,
        vx: (Math.random() - 0.5) * 0.8,
        vy: -(0.5 + Math.random() * 1.2),
        size: 2 + Math.random() * 4,
        color: active.length > 0 ? pickWeightedColor(active) : '#D4A574',
        phase: Math.random() * Math.PI * 2,
        life: 0
      });
    }
    particlesRef.current = particles;
    startTimeRef.current = performance.now();

    const animate = () => {
      const elapsed = performance.now() - startTimeRef.current;
      if (elapsed > DURATION) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setIsPlaying(false);
        stopAudio();
        window.removeEventListener('resize', resize);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const time = elapsed / 1000;

      particles.forEach(p => {
        p.x += p.vx + Math.sin(time * 2 + p.phase) * 0.3;
        p.y += p.vy;
        p.life += 0.01;

        const sizeVar = 2 + Math.sin(time * 3 + p.phase) * 2;
        const displaySize = Math.max(2, Math.min(6, sizeVar));

        const alpha = Math.max(0, Math.min(1, 1 - (p.y / canvas.height)));
        ctx.beginPath();
        ctx.arc(p.x, p.y, displaySize, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha * 0.8;
        ctx.fill();
        ctx.globalAlpha = 1;

        if (p.y < -20) {
          p.y = canvas.height + 20;
          p.x = Math.random() * canvas.width;
        }
      });

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    setIsPlaying(true);
    startAudio(ratios);

    return () => {
      window.removeEventListener('resize', resize);
    };
  }, [startAudio, stopAudio]);

  const stopParticles = useCallback(() => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    particlesRef.current = [];
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
      startParticles(card.scentRatios);
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

  const total = getTotalRatio(card.scentRatios);
  const dominantColor = getDominantColor(card.scentRatios);
  const cx = 90, cy = 90, outerR = 80, innerR = 55;

  return (
    <div className="detail-page">
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
                  return BASE_SCENTS.map(scent => {
                    const val = card.scentRatios[scent.key];
                    if (val <= 0) return null;
                    const angle = (val / total) * Math.PI * 2;
                    const endAngle = startAngle + angle;
                    const midAngle = (startAngle + endAngle) / 2;
                    const midR = (outerR + innerR) / 2;
                    const tipX = cx + midR * Math.cos(midAngle);
                    const tipY = cy + midR * Math.sin(midAngle);

                    const path = describeArc(cx, cy, outerR, startAngle, endAngle);
                    const innerPath = describeArc(cx, cy, innerR, startAngle, endAngle);

                    startAngle = endAngle;

                    return (
                      <g key={scent.key}>
                        <path
                          className="ring-segment"
                          d={`${path} ${innerPath.replace('M', 'L').replace(/Z/g, '')} Z`}
                          fill={scent.color}
                          stroke="#1A1A1A"
                          strokeWidth={1}
                          onMouseEnter={() => setHoveredScent({
                            name: scent.name,
                            ratio: Math.round((val / total) * 100),
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
