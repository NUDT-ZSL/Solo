import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  EchoCard,
  resonateCard,
  mapSentimentToColors,
  mapSentimentToGradient,
} from "./EchoCardEngine";

interface CardRendererProps {
  card: EchoCard;
  onShare: (card: EchoCard) => void;
  onResonate: (cardId: string, newCount: number) => void;
}

function drawWaveform(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  waveParams: EchoCard["wave_params"],
  sentiment: EchoCard["sentiment"]["sentiment"],
  time: number
) {
  ctx.clearRect(0, 0, width, height);
  const gradient = mapSentimentToGradient(ctx, sentiment, height);
  const centerY = height / 2;
  const { amplitude, frequency, harmonics, phase, noise } = waveParams;

  ctx.beginPath();
  ctx.moveTo(0, centerY);

  for (let x = 0; x <= width; x += 1) {
    let y = centerY;
    for (let h = 0; h < harmonics.length; h++) {
      const harmAmp = amplitude * harmonics[h];
      const harmFreq = frequency * (h + 1);
      y += harmAmp * Math.sin(harmFreq * x + phase + time * (h + 1) * 0.5);
    }
    const noiseVal = Math.sin(x * 0.1 + time * 2) * noise;
    y += noiseVal;

    if (x === 0) {
      ctx.moveTo(x, y);
    } else {
      const prevX = x - 1;
      let prevY = centerY;
      for (let h = 0; h < harmonics.length; h++) {
        prevY += amplitude * harmonics[h] * Math.sin(frequency * (h + 1) * prevX + phase + time * (h + 1) * 0.5);
      }
      prevY += Math.sin(prevX * 0.1 + time * 2) * noise;
      const cpx = (prevX + x) / 2;
      ctx.quadraticCurveTo(prevX, prevY, cpx, (prevY + y) / 2);
    }
  }

  ctx.strokeStyle = gradient;
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();

  const fillGrad = mapSentimentToGradient(ctx, sentiment, height);
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fillStyle = fillGrad;
  ctx.globalAlpha = 0.08;
  ctx.fill();
  ctx.globalAlpha = 1.0;

  ctx.beginPath();
  for (let x = 0; x <= width; x += 2) {
    let y = centerY;
    for (let h = 0; h < harmonics.length; h++) {
      y += amplitude * harmonics[h] * 0.6 * Math.sin(frequency * (h + 1) * x + phase * 1.3 + time * (h + 1) * 0.3 + 1.5);
    }
    y += Math.sin(x * 0.15 + time * 1.5 + 0.8) * noise * 0.7;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  const colors = mapSentimentToColors(sentiment);
  ctx.strokeStyle = colors.secondary;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.35;
  ctx.stroke();
  ctx.globalAlpha = 1.0;
}

const CardRenderer: React.FC<CardRendererProps> = ({ card, onShare, onResonate }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const [resonating, setResonating] = useState(false);
  const [glowIntensity, setGlowIntensity] = useState(0);
  const [visibleChars, setVisibleChars] = useState(0);
  const [resonanceCount, setResonanceCount] = useState(card.resonances);
  const glowAnimRef = useRef<number>(0);
  const charTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setResonanceCount(card.resonances);
  }, [card.resonances]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    let time = 0;
    let lastFrame = 0;

    const animate = (timestamp: number) => {
      if (timestamp - lastFrame < 16) {
        animFrameRef.current = requestAnimationFrame(animate);
        return;
      }
      lastFrame = timestamp;
      time += 0.015;
      drawWaveform(ctx, rect.width, rect.height, card.wave_params, card.sentiment.sentiment, time);
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [card.wave_params, card.sentiment.sentiment]);

  useEffect(() => {
    const total = card.poetic_comment.length;
    if (visibleChars >= total) return;

    charTimerRef.current = setTimeout(() => {
      setVisibleChars((v) => Math.min(v + 1, total));
    }, 60);

    return () => {
      if (charTimerRef.current) clearTimeout(charTimerRef.current);
    };
  }, [visibleChars, card.poetic_comment]);

  useEffect(() => {
    setVisibleChars(0);
  }, [card.id]);

  const handleResonate = useCallback(async () => {
    if (resonating) return;
    setResonating(true);

    try {
      const result = await resonateCard(card.id);
      const newCount = result.resonances;
      setResonanceCount(newCount);
      onResonate(card.id, newCount);

      setGlowIntensity(1);
      const startTime = performance.now();
      const duration = 2000;

      const animateGlow = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const breathCycle = Math.sin(progress * Math.PI * 3) * (1 - eased);
        setGlowIntensity(Math.max(0, breathCycle));
        if (progress < 1) {
          glowAnimRef.current = requestAnimationFrame(animateGlow);
        } else {
          setGlowIntensity(0);
        }
      };
      glowAnimRef.current = requestAnimationFrame(animateGlow);
    } finally {
      setTimeout(() => setResonating(false), 500);
    }
  }, [card.id, resonating, onResonate]);

  useEffect(() => {
    return () => cancelAnimationFrame(glowAnimRef.current);
  }, []);

  const colors = mapSentimentToColors(card.sentiment.sentiment);

  const sentimentLabel: Record<string, string> = {
    positive: "暖光",
    negative: "幽影",
    neutral: "静水",
  };

  return (
    <div
      className="echo-card"
      style={
        {
          "--glow-color": colors.glow,
          "--glow-intensity": glowIntensity,
          "--accent-color": colors.primary,
        } as React.CSSProperties
      }
    >
      {glowIntensity > 0 && (
        <div className="echo-card__glow" />
      )}

      <div className="echo-card__header">
        <h3 className="echo-card__title">{card.title}</h3>
        <span
          className="echo-card__sentiment-badge"
          style={{ background: colors.primary }}
        >
          {sentimentLabel[card.sentiment.sentiment]}
        </span>
      </div>

      <p className="echo-card__summary">{card.summary}</p>

      <div className="echo-card__waveform">
        <canvas ref={canvasRef} className="echo-card__canvas" />
      </div>

      <p className="echo-card__poem">
        {card.poetic_comment.slice(0, visibleChars)}
        {visibleChars < card.poetic_comment.length && (
          <span className="echo-card__cursor">|</span>
        )}
      </p>

      <div className="echo-card__footer">
        <button
          className={`echo-card__resonate-btn ${resonating ? "echo-card__resonate-btn--active" : ""}`}
          onClick={handleResonate}
          disabled={resonating}
        >
          <span className="echo-card__resonate-icon">✦</span>
          <span>{resonanceCount}</span>
        </button>

        <button
          className="echo-card__share-btn"
          onClick={() => onShare(card)}
          title="分享此卡片"
        >
          ↗ 分享
        </button>

        <a
          className="echo-card__url-link"
          href={card.url}
          target="_blank"
          rel="noopener noreferrer"
          title={card.url}
        >
          访问原页
        </a>
      </div>
    </div>
  );
};

export default CardRenderer;
