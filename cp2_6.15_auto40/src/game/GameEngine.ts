import { AudioAnalyzer } from './AudioAnalyzer';

export interface GameEngineOptions {
  canvas?: HTMLCanvasElement;
  audioUrl?: string;
  onScoreChange?: (score: number) => void;
  onGameEnd?: (result: { score: number; duration: number }) => void;
  useMicrophone?: boolean;
}

interface LightPoint {
  id: number;
  x: number;
  y: number;
  baseX: number;
  radius: number;
  color: string;
  hue: number;
  collected: boolean;
  collectProgress: number;
  side: 'left' | 'right';
}

interface Obstacle {
  id: number;
  x: number;
  y: number;
  baseX: number;
  sides: number;
  radius: number;
  rotation: number;
  rotationSpeed: number;
  broken: boolean;
  breakProgress: number;
  fragments: Fragment[];
}

interface Fragment {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  rotationSpeed: number;
  life: number;
  maxLife: number;
  color: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
}

interface BeatParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
  side: 'left' | 'right';
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private audioAnalyzer: AudioAnalyzer;
  private options: GameEngineOptions;

  private readonly BASE_WIDTH = 500;
  private readonly BASE_HEIGHT = 600;
  private scale: number = 1;
  private offsetX: number = 0;
  private offsetY: number = 0;

  private rafId: number | null = null;
  private lastTime: number = 0;
  private elapsedTime: number = 0;
  private running: boolean = false;

  private ballX: number = 250;
  private ballY: number = 480;
  private ballRadius: number = 14;
  private ballJumping: boolean = false;
  private ballJumpProgress: number = 0;
  private ballJumpDuration: number = 0.4;
  private ballBaseY: number = 480;
  private ballJumpHeight: number = 120;

  private score: number = 0;
  private trackOffset: number = 0;
  private trackSpeed: number = 80;
  private beatColorHue: number = 0;
  private targetBeatColorHue: number = 0;
  private beatColorProgress: number = 1;
  private readonly BEAT_COLOR_TRANSITION = 0.2;

  private lightPoints: LightPoint[] = [];
  private obstacles: Obstacle[] = [];
  private particles: Particle[] = [];
  private beatParticles: BeatParticle[] = [];

  private lastBeatTime: number = 0;
  private beatIndex: number = 0;
  private nextId: number = 1;
  private currentSide: 'left' | 'right' = 'left';

  private ballAuraPulse: number = 0;

  private readonly TRACK_AMPLITUDE = 35;
  private readonly TRACK_FREQUENCY = 0.012;
  private readonly TRACK_VERTICAL_STEP = 3;

  constructor(options: GameEngineOptions = {}) {
    this.options = options;

    if (options.canvas) {
      this.canvas = options.canvas;
    } else {
      this.canvas = document.createElement('canvas');
      document.body.appendChild(this.canvas);
    }

    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;

    this.audioAnalyzer = new AudioAnalyzer({
      onBeat: (info) => this.handleBeat(info),
      onSpectrum: (spectrum) => this.handleSpectrum(spectrum)
    });

    this.setupCanvas();
    this.setupInput();
    window.addEventListener('resize', () => this.setupCanvas());
  }

  private setupCanvas(): void {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      || window.innerWidth < 768;

    let targetWidth: number;
    let targetHeight: number;

    if (isMobile) {
      targetWidth = Math.min(window.innerWidth * 0.9, this.BASE_WIDTH);
      const aspectRatio = this.BASE_HEIGHT / this.BASE_WIDTH;
      targetHeight = targetWidth * aspectRatio;
    } else {
      targetWidth = this.BASE_WIDTH;
      targetHeight = this.BASE_HEIGHT;
    }

    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = targetWidth * dpr;
    this.canvas.height = targetHeight * dpr;
    this.canvas.style.width = targetWidth + 'px';
    this.canvas.style.height = targetHeight + 'px';

    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.scale = targetWidth / this.BASE_WIDTH;
    this.offsetX = 0;
    this.offsetY = 0;
  }

  private setupInput(): void {
    const handleJump = (e: KeyboardEvent | TouchEvent | MouseEvent) => {
      if ('key' in e && e.key !== ' ' && e.key !== 'ArrowUp') return;
      if ('preventDefault' in e) e.preventDefault();
      if (!this.running) return;
      this.jump();
    };

    window.addEventListener('keydown', handleJump);
    this.canvas.addEventListener('touchstart', handleJump, { passive: false });
    this.canvas.addEventListener('mousedown', handleJump);
  }

  private jump(): void {
    if (!this.ballJumping) {
      this.ballJumping = true;
      this.ballJumpProgress = 0;
    }
  }

  private handleBeat(info: { bpm: number; energy: number; time: number }): void {
    if (info.time - this.lastBeatTime < 0.2) return;
    this.lastBeatTime = info.time;
    this.beatIndex++;

    this.targetBeatColorHue = (this.targetBeatColorHue + 47) % 360;
    this.beatColorProgress = 0;

    this.generateLightPoints();
    this.generateBeatParticles();

    const bpm = info.bpm || 120;
    this.trackSpeed = 60 + (bpm / 120) * 60;
  }

  private handleSpectrum(spectrum: Uint8Array): void {
    let lowSum = 0;
    const lowCount = Math.floor(spectrum.length * 0.1);
    for (let i = 0; i < lowCount; i++) {
      lowSum += spectrum[i];
    }
    const lowAvg = lowSum / lowCount / 255;
    this.trackSpeed = 80 + lowAvg * 60;
  }

  private generateLightPoints(): void {
    const baseY = -20;

    for (let i = 0; i < 4; i++) {
      const yOffset = i * 35;
      const y = baseY - yOffset;

      let side: 'left' | 'right';
      if (i === 0) {
        side = this.currentSide;
        this.currentSide = this.currentSide === 'left' ? 'right' : 'left';
      } else {
        side = i % 2 === 1 ? (this.currentSide === 'left' ? 'right' : 'left') : this.currentSide;
      }

      const t = (this.beatIndex * 4 + i) * 0.1;
      const hue = (170 + t * 80) % 360;
      const color = this.hslToHex(hue, 100, 50);

      const baseX = side === 'left' ? 120 : 380;
      const waveOffset = Math.sin(y * this.TRACK_FREQUENCY + this.beatIndex * 0.5) * this.TRACK_AMPLITUDE;

      this.lightPoints.push({
        id: this.nextId++,
        x: baseX + waveOffset,
        y: y,
        baseX: baseX,
        radius: 12,
        color: color,
        hue: hue,
        collected: false,
        collectProgress: 0,
        side: side
      });
    }

    if (this.beatIndex % 2 === 0) {
      this.generateObstacle();
    }
  }

  private generateObstacle(): void {
    const y = -80;
    const sides = 5 + Math.floor(Math.random() * 3);
    const posChoice = Math.random();

    let baseX: number;
    const waveOffset = Math.sin(y * this.TRACK_FREQUENCY + this.beatIndex * 0.3) * this.TRACK_AMPLITUDE;

    if (posChoice < 0.5) {
      baseX = 120 + waveOffset + (Math.random() > 0.5 ? -30 : 30);
    } else {
      baseX = 380 + waveOffset + (Math.random() > 0.5 ? -30 : 30);
    }

    const isWavePeak = Math.sin(y * this.TRACK_FREQUENCY) > 0.5;
    const isWaveValley = Math.sin(y * this.TRACK_FREQUENCY) < -0.5;

    if (isWavePeak || isWaveValley || Math.random() > 0.5) {
      this.obstacles.push({
        id: this.nextId++,
        x: baseX,
        y: y,
        baseX: baseX,
        sides: sides,
        radius: 22,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 3,
        broken: false,
        breakProgress: 0,
        fragments: []
      });
    }
  }

  private generateBeatParticles(): void {
    for (let i = 0; i < 30; i++) {
      const side: 'left' | 'right' = i < 15 ? 'left' : 'right';
      const edgeX = side === 'left' ? 80 + Math.random() * 20 : 400 + Math.random() * 20;
      const y = Math.random() * this.BASE_HEIGHT;

      const angle = side === 'left'
        ? -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.6
        : Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.6;

      const speed = 40 + Math.random() * 80;
      const size = 2 + Math.random() * 6;

      const hue = (this.beatColorHue + Math.random() * 60) % 360;

      this.beatParticles.push({
        x: edgeX,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: size,
        life: 0.5,
        maxLife: 0.5,
        color: this.hslToHex(hue, 90, 60),
        side: side
      });
    }
  }

  private generateBreakParticles(x: number, y: number, color: string): Fragment[] {
    const fragments: Fragment[] = [];
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 + Math.random() * 0.3;
      const speed = 80 + Math.random() * 120;
      fragments.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 50,
        size: 4 + Math.random() * 8,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 10,
        life: 0.6,
        maxLife: 0.6,
        color: color
      });
    }
    return fragments;
  }

  private generateCollectParticles(x: number, y: number, color: string): void {
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const speed = 60 + Math.random() * 100;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 4,
        life: 0.4,
        maxLife: 0.4,
        color: color
      });
    }
  }

  public async start(): Promise<void> {
    if (this.running) return;

    this.reset();

    if (this.options.useMicrophone) {
      await this.audioAnalyzer.startWithMicrophone();
    } else if (this.options.audioUrl) {
      await this.audioAnalyzer.loadAudio(this.options.audioUrl);
      await this.audioAnalyzer.start();
    } else {
      this.startAutoBeat();
    }

    this.running = true;
    this.lastTime = performance.now();
    this.gameLoop();
  }

  private autoBeatTimer: number | null = null;
  private autoBpm: number = 120;

  private startAutoBeat(): void {
    const beatInterval = (60 / this.autoBpm) * 1000;
    let beatCount = 0;

    const tick = () => {
      beatCount++;
      this.handleBeat({
        bpm: this.autoBpm,
        energy: 0.8,
        time: beatCount * (60 / this.autoBpm)
      });
      this.autoBeatTimer = window.setTimeout(tick, beatInterval);
    };
    tick();
  }

  public pause(): void {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  public resume(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.gameLoop();
  }

  public stop(): void {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.autoBeatTimer) {
      clearTimeout(this.autoBeatTimer);
      this.autoBeatTimer = null;
    }
    this.audioAnalyzer.stop();

    if (this.options.onGameEnd) {
      this.options.onGameEnd({
        score: this.score,
        duration: this.elapsedTime
      });
    }
  }

  private reset(): void {
    this.score = 0;
    this.elapsedTime = 0;
    this.trackOffset = 0;
    this.beatIndex = 0;
    this.ballY = this.ballBaseY;
    this.ballJumping = false;
    this.ballJumpProgress = 0;
    this.lightPoints = [];
    this.obstacles = [];
    this.particles = [];
    this.beatParticles = [];
    this.currentSide = 'left';
    this.beatColorHue = 0;
    this.targetBeatColorHue = 0;
    this.beatColorProgress = 1;

    if (this.options.onScoreChange) {
      this.options.onScoreChange(0);
    }
  }

  private gameLoop = (): void => {
    if (!this.running) return;

    const now = performance.now();
    const deltaTime = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    this.update(deltaTime);
    this.render();

    this.rafId = requestAnimationFrame(this.gameLoop);
  };

  private update(dt: number): void {
    this.elapsedTime += dt;
    this.ballAuraPulse += dt * 3;

    if (this.beatColorProgress < 1) {
      this.beatColorProgress = Math.min(1, this.beatColorProgress + dt / this.BEAT_COLOR_TRANSITION);
      const t = this.easeOutCubic(this.beatColorProgress);
      let delta = this.targetBeatColorHue - this.beatColorHue;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      this.beatColorHue = (this.beatColorHue + delta * t + 360) % 360;
    }

    this.trackOffset += this.trackSpeed * dt;
    this.ballX = 250 + Math.sin((this.ballBaseY + this.trackOffset) * this.TRACK_FREQUENCY) * this.TRACK_AMPLITUDE;

    if (this.ballJumping) {
      this.ballJumpProgress += dt;
      if (this.ballJumpProgress >= this.ballJumpDuration) {
        this.ballJumpProgress = this.ballJumpDuration;
        this.ballJumping = false;
      }
      const t = this.ballJumpProgress / this.ballJumpDuration;
      const jumpCurve = Math.sin(t * Math.PI);
      this.ballY = this.ballBaseY - jumpCurve * this.ballJumpHeight;
    } else {
      this.ballY = this.ballBaseY;
    }

    this.updateLightPoints(dt);
    this.updateObstacles(dt);
    this.updateParticles(dt);
    this.updateBeatParticles(dt);
    this.checkCollisions();
  }

  private updateLightPoints(dt: number): void {
    for (let i = this.lightPoints.length - 1; i >= 0; i--) {
      const lp = this.lightPoints[i];
      lp.y += this.trackSpeed * dt;

      const waveOffset = Math.sin((lp.y + this.trackOffset) * this.TRACK_FREQUENCY) * this.TRACK_AMPLITUDE;
      lp.x = lp.baseX + waveOffset;

      if (lp.collected) {
        lp.collectProgress += dt * 3;
        if (lp.collectProgress >= 1) {
          this.lightPoints.splice(i, 1);
        }
      } else if (lp.y > this.BASE_HEIGHT + 50) {
        this.lightPoints.splice(i, 1);
      }
    }
  }

  private updateObstacles(dt: number): void {
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.y += this.trackSpeed * dt;
      obs.rotation += obs.rotationSpeed * dt;

      const waveOffset = Math.sin((obs.y + this.trackOffset) * this.TRACK_FREQUENCY) * this.TRACK_AMPLITUDE;
      obs.x = obs.baseX + waveOffset;

      if (obs.broken) {
        obs.breakProgress += dt * 2;

        for (let j = obs.fragments.length - 1; j >= 0; j--) {
          const f = obs.fragments[j];
          f.x += f.vx * dt;
          f.y += f.vy * dt;
          f.vy += 300 * dt;
          f.rotation += f.rotationSpeed * dt;
          f.life -= dt;

          if (f.life <= 0) {
            obs.fragments.splice(j, 1);
          }
        }

        if (obs.breakProgress >= 1 && obs.fragments.length === 0) {
          this.obstacles.splice(i, 1);
        }
      } else if (obs.y > this.BASE_HEIGHT + 80) {
        this.obstacles.splice(i, 1);
      }
    }
  }

  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.life -= dt;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private updateBeatParticles(dt: number): void {
    for (let i = this.beatParticles.length - 1; i >= 0; i--) {
      const p = this.beatParticles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.97;
      p.vy *= 0.97;
      p.life -= dt;

      if (p.life <= 0) {
        this.beatParticles.splice(i, 1);
      }
    }
  }

  private checkCollisions(): void {
    const ballEffectiveRadius = this.ballJumping
      ? this.ballRadius * 1.2
      : this.ballRadius;

    for (const lp of this.lightPoints) {
      if (lp.collected) continue;

      const dx = lp.x - this.ballX;
      const dy = lp.y - this.ballY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < ballEffectiveRadius + lp.radius) {
        lp.collected = true;
        lp.collectProgress = 0;
        this.score += 10;

        if (this.options.onScoreChange) {
          this.options.onScoreChange(this.score);
        }

        this.audioAnalyzer.playRiseSound();
        this.generateCollectParticles(lp.x, lp.y, lp.color);
      }
    }

    for (const obs of this.obstacles) {
      if (obs.broken) continue;

      if (this.ballJumping) continue;

      const dx = obs.x - this.ballX;
      const dy = obs.y - this.ballY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < ballEffectiveRadius + obs.radius) {
        obs.broken = true;
        obs.breakProgress = 0;
        obs.fragments = this.generateBreakParticles(obs.x, obs.y, '#ff3333');
        this.audioAnalyzer.playBreakSound();

        setTimeout(() => {
          if (this.running) {
            this.stop();
          }
        }, 100);
      }
    }
  }

  private render(): void {
    const ctx = this.ctx;

    ctx.save();
    ctx.scale(this.scale, this.scale);

    this.renderBackground();
    this.renderTrack();
    this.renderBeatParticles();
    this.renderLightPoints();
    this.renderObstacles();
    this.renderBall();
    this.renderParticles();
    this.renderScore();

    ctx.restore();
  }

  private renderBackground(): void {
    const ctx = this.ctx;
    const gradient = ctx.createLinearGradient(0, 0, 0, this.BASE_HEIGHT);
    gradient.addColorStop(0, '#0a0a1a');
    gradient.addColorStop(0.5, '#0d0d25');
    gradient.addColorStop(1, '#0a0a1a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.BASE_WIDTH, this.BASE_HEIGHT);
  }

  private renderTrack(): void {
    const ctx = this.ctx;

    const hue = this.beatColorHue;
    const trackColor = `hsla(${hue}, 80%, 55%, 0.6)`;
    const trackGlow = `hsla(${hue}, 90%, 60%, 0.15)`;

    ctx.lineWidth = 4;
    ctx.strokeStyle = trackColor;
    ctx.shadowColor = `hsla(${hue}, 90%, 60%, 0.8)`;
    ctx.shadowBlur = 15;

    ctx.beginPath();
    let started = false;
    for (let y = -50; y <= this.BASE_HEIGHT + 50; y += this.TRACK_VERTICAL_STEP) {
      const waveY = y + this.trackOffset;
      const x = 120 + Math.sin(waveY * this.TRACK_FREQUENCY) * this.TRACK_AMPLITUDE;
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    ctx.beginPath();
    started = false;
    for (let y = -50; y <= this.BASE_HEIGHT + 50; y += this.TRACK_VERTICAL_STEP) {
      const waveY = y + this.trackOffset;
      const x = 380 + Math.sin(waveY * this.TRACK_FREQUENCY + Math.PI) * this.TRACK_AMPLITUDE;
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = trackGlow;
    ctx.lineWidth = 20;

    ctx.beginPath();
    started = false;
    for (let y = -50; y <= this.BASE_HEIGHT + 50; y += this.TRACK_VERTICAL_STEP) {
      const waveY = y + this.trackOffset;
      const x = 120 + Math.sin(waveY * this.TRACK_FREQUENCY) * this.TRACK_AMPLITUDE;
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    ctx.beginPath();
    started = false;
    for (let y = -50; y <= this.BASE_HEIGHT + 50; y += this.TRACK_VERTICAL_STEP) {
      const waveY = y + this.trackOffset;
      const x = 380 + Math.sin(waveY * this.TRACK_FREQUENCY + Math.PI) * this.TRACK_AMPLITUDE;
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  }

  private renderLightPoints(): void {
    const ctx = this.ctx;

    for (const lp of this.lightPoints) {
      ctx.save();
      ctx.translate(lp.x, lp.y);

      let alpha = 1;
      let scale = 1;

      if (lp.collected) {
        const t = lp.collectProgress;
        alpha = 1 - t;
        scale = 1 + t * 1.5;
      }

      ctx.globalAlpha = alpha;
      ctx.scale(scale, scale);

      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, lp.radius * 2);
      gradient.addColorStop(0, lp.color);
      gradient.addColorStop(0.5, lp.color);
      gradient.addColorStop(1, this.hslToHex(lp.hue, 100, 50, 0));

      ctx.shadowColor = lp.color;
      ctx.shadowBlur = 20;
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, lp.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(-lp.radius * 0.3, -lp.radius * 0.3, lp.radius * 0.25, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  private renderObstacles(): void {
    const ctx = this.ctx;

    for (const obs of this.obstacles) {
      if (obs.broken) {
        this.renderFragments(obs.fragments);
        continue;
      }

      ctx.save();
      ctx.translate(obs.x, obs.y);
      ctx.rotate(obs.rotation);

      ctx.shadowColor = '#ff3333';
      ctx.shadowBlur = 15;

      ctx.fillStyle = '#ff3333';
      ctx.strokeStyle = '#ff6666';
      ctx.lineWidth = 2;

      ctx.beginPath();
      for (let i = 0; i < obs.sides; i++) {
        const angle = (i / obs.sides) * Math.PI * 2 - Math.PI / 2;
        const x = Math.cos(angle) * obs.radius;
        const y = Math.sin(angle) * obs.radius;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.beginPath();
      for (let i = 0; i < obs.sides; i++) {
        const angle = (i / obs.sides) * Math.PI * 2 - Math.PI / 2;
        const x = Math.cos(angle) * obs.radius * 0.6;
        const y = Math.sin(angle) * obs.radius * 0.6 - obs.radius * 0.15;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }
  }

  private renderFragments(fragments: Fragment[]): void {
    const ctx = this.ctx;

    for (const f of fragments) {
      const alpha = f.life / f.maxLife;

      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.rotation);
      ctx.globalAlpha = alpha;

      ctx.shadowColor = f.color;
      ctx.shadowBlur = 8;
      ctx.fillStyle = f.color;

      ctx.beginPath();
      const sides = 3;
      for (let i = 0; i < sides; i++) {
        const angle = (i / sides) * Math.PI * 2;
        const x = Math.cos(angle) * f.size;
        const y = Math.sin(angle) * f.size;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }
  }

  private renderBall(): void {
    const ctx = this.ctx;

    let ballScale = 1;
    let ballAlpha = 1;

    if (this.ballJumping) {
      const t = this.ballJumpProgress / this.ballJumpDuration;
      ballScale = 1 + Math.sin(t * Math.PI) * 0.2;
      ballAlpha = 0.65 + Math.sin(t * Math.PI) * 0.2;
    }

    const pulse = Math.sin(this.ballAuraPulse) * 0.5 + 0.5;
    const auraRadius = this.ballRadius + 20 + pulse * 8;
    const auraAlpha = 0.3 + pulse * 0.3;

    const auraGradient = ctx.createRadialGradient(
      this.ballX, this.ballY, this.ballRadius,
      this.ballX, this.ballY, auraRadius
    );
    auraGradient.addColorStop(0, `rgba(255, 255, 255, ${auraAlpha})`);
    auraGradient.addColorStop(0.5, `rgba(255, 255, 255, ${auraAlpha * 0.4})`);
    auraGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = auraGradient;
    ctx.beginPath();
    ctx.arc(this.ballX, this.ballY, auraRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(this.ballX, this.ballY);
    ctx.scale(ballScale, ballScale);
    ctx.globalAlpha = ballAlpha;

    const ballGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.ballRadius);
    ballGradient.addColorStop(0, '#ffffff');
    ballGradient.addColorStop(0.3, '#aaddff');
    ballGradient.addColorStop(0.7, '#6699ff');
    ballGradient.addColorStop(1, '#3366cc');

    ctx.shadowColor = '#66aaff';
    ctx.shadowBlur = 25;
    ctx.fillStyle = ballGradient;
    ctx.beginPath();
    ctx.arc(0, 0, this.ballRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();
    ctx.arc(-this.ballRadius * 0.35, -this.ballRadius * 0.35, this.ballRadius * 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private renderParticles(): void {
    const ctx = this.ctx;

    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      const scale = 1 + (1 - alpha) * 0.5;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.scale(scale, scale);

      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(0, 0, p.size, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  private renderBeatParticles(): void {
    const ctx = this.ctx;

    for (const p of this.beatParticles) {
      const alpha = p.life / p.maxLife;
      const easeAlpha = this.easeOutQuad(alpha);

      ctx.save();
      ctx.globalAlpha = easeAlpha;
      ctx.translate(p.x, p.y);

      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.fillStyle = p.color;

      ctx.beginPath();
      ctx.arc(0, 0, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  private renderScore(): void {
    const ctx = this.ctx;

    ctx.save();
    ctx.font = 'bold 28px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    ctx.shadowColor = `hsla(${this.beatColorHue}, 90%, 60%, 0.8)`;
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#ffffff';

    ctx.fillText(this.score.toString(), this.BASE_WIDTH / 2, 20);

    ctx.font = '14px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.shadowBlur = 0;
    ctx.fillText('SCORE', this.BASE_WIDTH / 2, 52);

    ctx.restore();
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private easeOutQuad(t: number): number {
    return 1 - (1 - t) * (1 - t);
  }

  private hslToHex(h: number, s: number, l: number, a: number = 1): string {
    s /= 100;
    l /= 100;
    const k = (n: number) => (n + h / 30) % 12;
    const color = l - l * s * Math.max(-1, Math.min(Math.min(k(0) - 3, 9 - k(0)), 1));
    const conv = (x: number) => {
      const num = Math.round(255 * (l + (color - l) * Math.max(Math.min(Math.min(x, 1), -1), 0)));
      return num.toString(16).padStart(2, '0');
    };
    const r = conv(k(0));
    const g = conv(k(8));
    const b = conv(k(4));
    if (a < 1) {
      const alpha = Math.round(a * 255).toString(16).padStart(2, '0');
      return `#${r}${g}${b}${alpha}`;
    }
    return `#${r}${g}${b}`;
  }

  public getScore(): number {
    return this.score;
  }

  public isRunning(): boolean {
    return this.running;
  }

  public destroy(): void {
    this.stop();
  }
}
