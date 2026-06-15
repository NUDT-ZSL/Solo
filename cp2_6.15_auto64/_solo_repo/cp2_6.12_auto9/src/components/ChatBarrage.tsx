import { useRef, useEffect, useState, useCallback } from 'react';
import useActivityStore from '@/store';
import { getSocket } from '@/App';

const PRESET_COLORS = [
  '#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff',
  '#9b59b6', '#ff9ff3', '#54a0ff', '#00d2ff',
];
const MAX_VISIBLE = 30;
const MAX_CHARS = 30;
const COOLDOWN_THRESHOLD = 3;
const COOLDOWN_WINDOW = 5000;
const COOLDOWN_DURATION = 3000;

interface BarrageItem {
  id: string;
  text: string;
  color: string;
  x: number;
  y: number;
  speed: number;
  opacity: number;
  scale: number;
  born: number;
}

export default function ChatBarrage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<BarrageItem[]>([]);
  const animFrameRef = useRef<number>(0);
  const { barrageMessages } = useActivityStore();

  const [input, setInput] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [cooldownEnd, setCooldownEnd] = useState(0);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const sendTimesRef = useRef<number[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      canvas.width = rect.width;
      canvas.height = rect.height;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const draw = () => {
      const now = Date.now();
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      itemsRef.current = itemsRef.current.filter((item) => {
        const elapsed = (now - item.born) / 1000;
        const totalDuration = item.speed;
        const progress = elapsed / totalDuration;

        if (progress > 1.1) return false;

        item.x = canvas.width - (canvas.width + 300) * progress;

        const fadeIn = Math.min(elapsed * 5, 1);
        const fadeOut = progress > 0.9 ? Math.max(1 - (progress - 0.9) / 0.2, 0) : 1;
        item.opacity = fadeIn * fadeOut;
        item.scale = Math.min(elapsed * 8, 1);

        ctx.save();
        ctx.globalAlpha = item.opacity;
        ctx.font = `bold ${16 * item.scale}px "Noto Sans SC", sans-serif`;
        ctx.fillStyle = item.color;
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 4;
        ctx.fillText(item.text, item.x, item.y);
        ctx.restore();

        return true;
      });

      while (itemsRef.current.length > MAX_VISIBLE) {
        itemsRef.current.shift();
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    animFrameRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  useEffect(() => {
    if (barrageMessages.length === 0) return;
    const latest = barrageMessages[barrageMessages.length - 1];
    const canvas = canvasRef.current;
    if (!canvas) return;

    const y = 20 + Math.random() * (canvas.height - 60);
    const speed = 3 + Math.random() * 4;

    itemsRef.current.push({
      id: latest.id,
      text: latest.text,
      color: latest.color,
      x: canvas.width,
      y,
      speed,
      opacity: 0,
      scale: 0.8,
      born: Date.now(),
    });
  }, [barrageMessages]);

  useEffect(() => {
    if (cooldownEnd === 0) {
      setCooldownLeft(0);
      return;
    }
    const interval = setInterval(() => {
      const left = Math.max(cooldownEnd - Date.now(), 0);
      setCooldownLeft(left);
      if (left === 0) setCooldownEnd(0);
    }, 50);
    return () => clearInterval(interval);
  }, [cooldownEnd]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || text.length > MAX_CHARS) return;
    if (cooldownLeft > 0) return;

    const now = Date.now();
    sendTimesRef.current.push(now);
    sendTimesRef.current = sendTimesRef.current.filter((t) => now - t < COOLDOWN_WINDOW);

    if (sendTimesRef.current.length >= COOLDOWN_THRESHOLD) {
      setCooldownEnd(now + COOLDOWN_DURATION);
      sendTimesRef.current = [];
    }

    const socket = getSocket();
    socket.emit('send_barrage', { text, color: selectedColor });
    setInput('');
  }, [input, selectedColor, cooldownLeft]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSend();
  };

  const cooldownPct = cooldownLeft > 0 ? ((COOLDOWN_DURATION - cooldownLeft) / COOLDOWN_DURATION) * 100 : 0;

  return (
    <div ref={containerRef} className="glass-panel relative flex h-full flex-col overflow-hidden rounded-2xl">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
      />

      <div className="relative z-10 mt-auto flex items-center gap-2 border-t border-white/10 bg-darkLight/80 p-3 backdrop-blur-md">
        <div className="flex items-center gap-1.5">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setSelectedColor(c)}
              className={`h-5 w-5 rounded-full border-2 transition-transform hover:scale-110 ${
                selectedColor === c ? 'border-white scale-110' : 'border-transparent'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        <input
          value={input}
          onChange={(e) => setInput(e.target.value.slice(0, MAX_CHARS))}
          onKeyDown={handleKeyDown}
          placeholder="发送弹幕..."
          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white placeholder-gray-500 outline-none transition-all focus:border-primary/50 focus:shadow-[0_0_10px_rgba(0,210,255,0.3)]"
        />

        <button
          onClick={handleSend}
          disabled={cooldownLeft > 0 || !input.trim()}
          className="ripple-btn relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-r from-primary to-secondary text-sm font-bold text-white disabled:opacity-40"
        >
          {cooldownLeft > 0 ? (
            <svg className="h-6 w-6 -rotate-90" viewBox="0 0 36 36">
              <circle
                cx="18" cy="18" r="15"
                fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="3"
              />
              <circle
                cx="18" cy="18" r="15"
                fill="none" stroke="white" strokeWidth="3"
                strokeDasharray={`${cooldownPct} 100`}
                strokeLinecap="round"
              />
            </svg>
          ) : (
            '➤'
          )}
        </button>
      </div>
    </div>
  );
}
