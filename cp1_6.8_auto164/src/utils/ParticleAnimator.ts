interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
  groupId: string;
  type: 'marker' | 'floating';
  baseX: number;
  baseY: number;
  phase: number;
}

const MAX_PARTICLES = 500;

function lerpColor(warmth: number): string {
  if (warmth >= 0.5) return '#E8935A';
  return '#5AB8A8';
}

export class ParticleAnimator {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private particles: Particle[] = [];
  private animFrameId: number | null = null;
  private running = false;
  private width = 0;
  private height = 0;
  private audioDataMap: Map<string, Float32Array> = new Map();
  private time = 0;

  init(container: HTMLElement): void {
    this.canvas = document.createElement('canvas');
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '10';
    this.canvas.style.transition = 'background-color 1s ease';

    const rect = container.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    this.ctx = this.canvas.getContext('2d');
    container.appendChild(this.canvas);
  }

  startAnimation(): void {
    if (this.running) return;
    this.running = true;
    this.time = 0;
    this.loop();
  }

  stopAnimation(): void {
    this.running = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private loop(): void {
    if (!this.running || !this.ctx || !this.canvas) return;
    this.time += 0.016;

    this.ctx.clearRect(0, 0, this.width, this.height);

    for (const p of this.particles) {
      if (p.type === 'marker') {
        const audioData = this.audioDataMap.get(p.groupId);
        let amplitude = 0;
        if (audioData && audioData.length > 0) {
          const binIndex = Math.floor(Math.abs(p.phase * 10)) % audioData.length;
          amplitude = Math.abs(audioData[binIndex]);
        }

        const displacement = 3 + amplitude * 20;
        p.x = p.baseX + Math.sin(this.time * 2 + p.phase) * displacement;
        p.y = p.baseY + Math.cos(this.time * 2 + p.phase * 1.3) * displacement;
        p.opacity = 0.4 + amplitude * 0.6;
      } else {
        p.x += p.vx;
        p.y += p.vy;
        p.x += Math.sin(this.time + p.phase) * 0.3;

        if (p.y < -10) {
          p.y = this.height + 10;
          p.x = Math.random() * this.width;
        }
        if (p.x < -10) p.x = this.width + 10;
        if (p.x > this.width + 10) p.x = -10;
      }

      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = p.opacity;
      this.ctx.fill();
    }

    this.ctx.globalAlpha = 1;
    this.animFrameId = requestAnimationFrame(() => this.loop());
  }

  addMarkerParticles(x: number, y: number, warmth: number): string {
    const groupId = `marker_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const color = lerpColor(warmth);

    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20;
      const radius = 15 + Math.random() * 10;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;

      if (this.particles.length >= MAX_PARTICLES) break;

      this.particles.push({
        x: px,
        y: py,
        vx: 0,
        vy: 0,
        size: 2 + Math.random() * 2,
        opacity: 0.5 + Math.random() * 0.3,
        color,
        groupId,
        type: 'marker',
        baseX: x + Math.cos(angle) * radius * 0.5,
        baseY: y + Math.sin(angle) * radius * 0.5,
        phase: Math.random() * Math.PI * 2,
      });
    }

    return groupId;
  }

  removeMarkerParticles(id: string): void {
    this.particles = this.particles.filter((p) => p.groupId !== id);
    this.audioDataMap.delete(id);
  }

  updateWithAudioData(waveformData: Float32Array, markerId: string): void {
    this.audioDataMap.set(markerId, waveformData);
  }

  setBackgroundTint(warmth: number): void {
    if (!this.canvas) return;
    const r = Math.round(90 + warmth * (232 - 90));
    const g = Math.round(184 + warmth * (147 - 184));
    const b = Math.round(168 + warmth * (90 - 168));
    this.canvas.style.backgroundColor = `rgba(${r}, ${g}, ${b}, 0.1)`;
  }

  addFloatingParticles(count: number): void {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= MAX_PARTICLES) break;

      const size = 2 + Math.random() * 2;
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -0.2 - Math.random() * 0.3,
        size,
        opacity: 0.15 + Math.random() * 0.2,
        color: '#ffffff',
        groupId: 'floating',
        type: 'floating',
        baseX: 0,
        baseY: 0,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    if (this.canvas) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
  }

  destroy(): void {
    this.stopAnimation();
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    this.canvas = null;
    this.ctx = null;
    this.particles = [];
    this.audioDataMap.clear();
  }
}
