export class Effects {
  constructor() {
    this.particles = [];
    this.glows = [];
    this.audioCtx = null;
  }

  initAudio() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  spawnBlockParticles(x, y, color, count) {
    const px = x + 20;
    const py = y + 20;
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: px + (Math.random() - 0.5) * 10,
        y: py + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 40,
        vy: -20 - Math.random() * 60,
        life: 0.6 + Math.random() * 0.6,
        maxLife: 0.6 + Math.random() * 0.6,
        color: color,
        size: 2 + Math.random() * 3
      });
    }
  }

  spawnGlow(x, y, color) {
    this.glows.push({
      x: x + 20,
      y: y + 20,
      radius: 5,
      maxRadius: 50,
      life: 0.6,
      maxLife: 0.6,
      color: color
    });
  }

  spawnPortalParticles(x, y) {
    const px = x + 20;
    const py = y + 20;
    for (let i = 0; i < 3; i++) {
      this.particles.push({
        x: px + (Math.random() - 0.5) * 30,
        y: py + 10,
        vx: (Math.random() - 0.5) * 15,
        vy: -30 - Math.random() * 40,
        life: 0.8 + Math.random() * 0.5,
        maxLife: 0.8 + Math.random() * 0.5,
        color: '#ffdd44',
        size: 2 + Math.random() * 2
      });
    }
  }

  playElementSound(element) {
    if (!this.audioCtx) return;

    const now = this.audioCtx.currentTime;

    if (element === 'fire') {
      this._playTone(now, 220, 'square', 0.15, 0.2);
      this._playTone(now + 0.05, 330, 'square', 0.1, 0.1);
    } else if (element === 'water') {
      this._playTone(now, 440, 'sine', 0.12, 0.3);
      this._playTone(now + 0.08, 550, 'sine', 0.08, 0.2);
    } else if (element === 'earth') {
      this._playTone(now, 150, 'triangle', 0.2, 0.35);
      this._playTone(now + 0.1, 200, 'triangle', 0.12, 0.2);
    } else if (element === 'wind') {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(660, now);
      osc.frequency.linearRampToValueAtTime(880, now + 0.15);
      osc.frequency.linearRampToValueAtTime(660, now + 0.3);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0.05, now + 0.3);
      gain.gain.linearRampToValueAtTime(0, now + 0.4);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
    }
  }

  playErrorSound() {
    if (!this.audioCtx) return;
    const now = this.audioCtx.currentTime;
    this._playTone(now, 150, 'sawtooth', 0.15, 0.2);
    this._playTone(now + 0.1, 100, 'sawtooth', 0.1, 0.15);
  }

  playPortalSound() {
    if (!this.audioCtx) return;
    const now = this.audioCtx.currentTime;
    [440, 554, 659, 880].forEach((freq, i) => {
      this._playTone(now + i * 0.12, freq, 'sine', 0.1, 0.4);
    });
  }

  playStepSound() {
    if (!this.audioCtx) return;
    const now = this.audioCtx.currentTime;
    this._playTone(now, 300, 'square', 0.03, 0.04);
  }

  playWinSound() {
    if (!this.audioCtx) return;
    const now = this.audioCtx.currentTime;
    [523, 659, 784, 1047].forEach((freq, i) => {
      this._playTone(now + i * 0.15, freq, 'sine', 0.12, 0.5);
    });
  }

  _playTone(startTime, frequency, type, volume, duration) {
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, startTime);
    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.01);
  }

  update(dt) {
    this.particles = this.particles.filter(p => {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 20 * dt;
      p.size *= 0.995;
      return p.life > 0;
    });

    this.glows = this.glows.filter(g => {
      g.life -= dt;
      g.radius += (g.maxRadius - g.radius) * dt * 4;
      return g.life > 0;
    });
  }

  draw(ctx) {
    this.glows.forEach(g => {
      const alpha = (g.life / g.maxLife) * 0.4;
      const grad = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, g.radius);
      grad.addColorStop(0, g.color + Math.floor(alpha * 255).toString(16).padStart(2, '0'));
      grad.addColorStop(1, g.color + '00');
      ctx.fillStyle = grad;
      ctx.fillRect(g.x - g.radius, g.y - g.radius, g.radius * 2, g.radius * 2);
    });

    ctx.imageSmoothingEnabled = false;
    this.particles.forEach(p => {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      const sz = Math.max(1, Math.floor(p.size));
      ctx.fillRect(Math.floor(p.x), Math.floor(p.y), sz, sz);
    });
    ctx.globalAlpha = 1;
  }

  clear() {
    this.particles = [];
    this.glows = [];
  }
}
