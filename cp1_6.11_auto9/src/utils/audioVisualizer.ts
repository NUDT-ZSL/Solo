const MAX_PARTICLES = 150;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
}

export function playWithVisualizer(
  audioContext: AudioContext,
  canvas: HTMLCanvasElement,
  audioElement: HTMLAudioElement,
  tagColor: string
): { stop: () => void } {
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;

  const source = audioContext.createMediaElementSource(audioElement);
  source.connect(analyser);
  analyser.connect(audioContext.destination);

  const ctx = canvas.getContext('2d')!;
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  const particles: Particle[] = [];
  let animId = 0;
  let running = true;

  const tagHsl = hexToHsl(tagColor);
  const midHue = (tagHsl.h + 30) % 360;

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

  function spawnParticles() {
    analyser.getByteFrequencyData(dataArray);

    const sampleRate = audioContext.sampleRate;
    const binSize = sampleRate / analyser.fftSize;
    const lowEnd = Math.min(Math.floor(200 / binSize), bufferLength - 1);
    const midEnd = Math.min(Math.floor(2000 / binSize), bufferLength - 1);
    const highEnd = Math.min(Math.floor(22000 / binSize), bufferLength - 1);

    let lowSum = 0;
    for (let i = 0; i <= lowEnd; i++) lowSum += dataArray[i];
    const lowAvg = lowEnd > 0 ? lowSum / (lowEnd + 1) : 0;

    let midSum = 0;
    for (let i = lowEnd + 1; i <= midEnd; i++) midSum += dataArray[i];
    const midAvg = midEnd > lowEnd ? midSum / (midEnd - lowEnd) : 0;

    let highSum = 0;
    for (let i = midEnd + 1; i <= highEnd; i++) highSum += dataArray[i];
    const highAvg = highEnd > midEnd ? highSum / (highEnd - midEnd) : 0;

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    if (lowAvg > 30 && particles.length < MAX_PARTICLES) {
      const count = Math.floor(lowAvg / 60);
      for (let i = 0; i < count && particles.length < MAX_PARTICLES; i++) {
        particles.push({
          x: cx,
          y: cy,
          vx: (Math.random() - 0.5) * 3 * (lowAvg / 128),
          vy: 0,
          life: 0,
          maxLife: 40 + Math.random() * 20,
          size: 4,
          color: '#1A1A2E',
          alpha: 0.8,
        });
      }
    }

    if (midAvg > 20 && particles.length < MAX_PARTICLES) {
      const count = Math.floor(midAvg / 50);
      for (let i = 0; i < count && particles.length < MAX_PARTICLES; i++) {
        particles.push({
          x: cx + (Math.random() - 0.5) * 60,
          y: cy + 20,
          vx: (Math.random() - 0.5) * 1,
          vy: -(1 + Math.random() * 2) * (midAvg / 128),
          life: 0,
          maxLife: 50 + Math.random() * 30,
          size: 3,
          color: `hsl(${midHue}, ${tagHsl.s}%, ${tagHsl.l}%)`,
          alpha: 0.9,
        });
      }
    }

    if (highAvg > 15 && particles.length < MAX_PARTICLES) {
      const count = Math.floor(highAvg / 40);
      for (let i = 0; i < count && particles.length < MAX_PARTICLES; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 2;
        particles.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0,
          maxLife: 25 + Math.random() * 15,
          size: 1,
          color: '#FFFFFF',
          alpha: 0.6 + Math.random() * 0.4,
        });
      }
    }
  }

  function draw() {
    if (!running) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    spawnParticles();

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life++;

      const lifeRatio = p.life / p.maxLife;
      const fadeAlpha = lifeRatio > 0.7 ? 1 - (lifeRatio - 0.7) / 0.3 : 1;

      ctx.globalAlpha = p.alpha * fadeAlpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();

      if (p.life >= p.maxLife) {
        particles.splice(i, 1);
      }
    }

    ctx.globalAlpha = 1;
    animId = requestAnimationFrame(draw);
  }

  draw();

  return {
    stop: () => {
      running = false;
      cancelAnimationFrame(animId);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.length = 0;
    },
  };
}
