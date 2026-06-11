interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  band: 'low' | 'mid' | 'high';
}

const MAX_PARTICLES = 150;
const CANVAS_W = 320;
const CANVAS_H = 180;

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
  }
  return { h, s: s * 100, l: l * 100 };
}

function createParticle(
  band: 'low' | 'mid' | 'high',
  emotionColor: string,
  intensity: number
): Particle {
  const cx = CANVAS_W / 2;
  const cy = CANVAS_H / 2;
  const life = 40 + Math.random() * 60;
  const maxLife = life;

  if (band === 'low') {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.3 + intensity * 1.2;
    return {
      x: cx + (Math.random() - 0.5) * 20,
      y: cy + (Math.random() - 0.5) * 10,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed * 0.3,
      size: 4,
      color: '#1A1A2E',
      alpha: 0.7 + intensity * 0.3,
      life,
      maxLife,
      band: 'low',
    };
  }

  if (band === 'mid') {
    const hsl = hexToHsl(emotionColor);
    const shiftedH = (hsl.h + 30) % 360;
    const color = hslToHex(shiftedH, Math.min(hsl.s + 10, 100), Math.min(hsl.l + 5, 85));
    const speed = 0.5 + intensity * 1.5;
    return {
      x: cx + (Math.random() - 0.5) * 40,
      y: cy + Math.random() * 20,
      vx: (Math.random() - 0.5) * 0.4,
      vy: -speed,
      size: 3,
      color,
      alpha: 0.6 + intensity * 0.4,
      life,
      maxLife,
      band: 'mid',
    };
  }

  const angle = Math.random() * Math.PI * 2;
  const speed = 0.8 + intensity * 2;
  return {
    x: cx,
    y: cy,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    size: 1,
    color: '#FFFFFF',
    alpha: 0.6 + Math.random() * 0.4,
    life,
    maxLife,
    band: 'high',
  };
}

export function playWithVisualizer(
  audioContext: AudioContext,
  canvas: HTMLCanvasElement,
  audioElement: HTMLAudioElement,
  emotionColor: string
): { stop: () => void } {
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.8;

  const source = audioContext.createMediaElementSource(audioElement);
  source.connect(analyser);
  analyser.connect(audioContext.destination);

  const ctx = canvas.getContext('2d')!;
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;

  const particles: Particle[] = [];
  const bufferLength = analyser.frequencyBinCount;
  const frequencyData = new Uint8Array(bufferLength);
  const sampleRate = audioContext.sampleRate;
  const binHz = sampleRate / analyser.fftSize;

  const lowBinEnd = Math.min(Math.ceil(200 / binHz), bufferLength);
  const midBinEnd = Math.min(Math.ceil(2000 / binHz), bufferLength);

  let animationId = 0;
  let running = true;

  function getAverage(data: Uint8Array, start: number, end: number): number {
    if (end <= start) return 0;
    let sum = 0;
    for (let i = start; i < end; i++) {
      sum += data[i];
    }
    return sum / (end - start) / 255;
  }

  function spawnParticles(lowIntensity: number, midIntensity: number, highIntensity: number) {
    const lowCount = Math.floor(lowIntensity * 3);
    const midCount = Math.floor(midIntensity * 4);
    const highCount = Math.floor(highIntensity * 5);
    const totalNew = lowCount + midCount + highCount;
    const available = MAX_PARTICLES - particles.length;
    const spawnCount = Math.min(totalNew, available);

    let spawned = 0;
    for (let i = 0; i < lowCount && spawned < spawnCount; i++, spawned++) {
      particles.push(createParticle('low', emotionColor, lowIntensity));
    }
    for (let i = 0; i < midCount && spawned < spawnCount; i++, spawned++) {
      particles.push(createParticle('mid', emotionColor, midIntensity));
    }
    for (let i = 0; i < highCount && spawned < spawnCount; i++, spawned++) {
      particles.push(createParticle('high', emotionColor, highIntensity));
    }
  }

  function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;

      if (p.band === 'high') {
        p.alpha = 0.6 + ((p.life / p.maxLife) * 0.4);
        if (Math.random() < 0.1) {
          p.alpha = p.alpha > 0.8 ? 0.6 : 1.0;
        }
      } else {
        p.alpha = (p.life / p.maxLife) * (p.band === 'low' ? 0.8 : 0.7);
      }

      if (
        p.life <= 0 ||
        p.x < -10 ||
        p.x > CANVAS_W + 10 ||
        p.y < -10 ||
        p.y > CANVAS_H + 10
      ) {
        particles.splice(i, 1);
      }
    }
  }

  function drawParticles() {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    ctx.fillStyle = 'rgba(26, 26, 46, 0.05)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    for (const p of particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
      ctx.fillStyle = p.color;

      if (p.band === 'low') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = Math.max(0, p.alpha * 0.3);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.band === 'mid') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = Math.max(0, p.alpha * 0.2);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 1.8, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  function animate() {
    if (!running) return;

    analyser.getByteFrequencyData(frequencyData);

    const lowIntensity = getAverage(frequencyData, 0, lowBinEnd);
    const midIntensity = getAverage(frequencyData, lowBinEnd, midBinEnd);
    const highIntensity = getAverage(frequencyData, midBinEnd, bufferLength);

    spawnParticles(lowIntensity, midIntensity, highIntensity);
    updateParticles();
    drawParticles();

    animationId = requestAnimationFrame(animate);
  }

  animate();

  return {
    stop: () => {
      running = false;
      cancelAnimationFrame(animationId);
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      particles.length = 0;
    },
  };
}
