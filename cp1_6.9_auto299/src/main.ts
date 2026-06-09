import { TrackSystem } from './track';
import { Player } from './player';
import { BarrierSystem, Barrier } from './barrier';
import { FragmentSystem, NOTE_CONFIG } from './fragment';

interface StarParticle {
  x: number;
  y: number;
  size: number;
  speed: number;
  alpha: number;
}

class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number = 1280;
  height: number = 720;
  isMobile: boolean;
  dpr: number;

  trackSystem!: TrackSystem;
  player!: Player;
  barrierSystem!: BarrierSystem;
  fragmentSystem!: FragmentSystem;

  scrollOffset: number = 0;
  lastTime: number = 0;
  barrierSpawnTimer: number = 0;
  fragmentSpawnTimer: number = 0;
  stars: StarParticle[] = [];
  scanlinePhase: number = 0;
  hitCooldown: number = 0;

  audioReady: boolean = false;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;

    this.isMobile = window.innerWidth < 768;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.resize();
    window.addEventListener('resize', () => this.resize());

    this.initSystems();
    this.initInput();
    this.initStars();

    requestAnimationFrame((t) => this.loop(t));
  }

  resize(): void {
    const isMobileNow = window.innerWidth < 768;
    const wasMobile = this.isMobile;
    this.isMobile = isMobileNow;

    let targetW: number, targetH: number;
    if (this.isMobile) {
      targetW = Math.min(window.innerWidth, 500);
      targetH = Math.min(window.innerHeight, 800);
    } else {
      const maxW = Math.min(window.innerWidth - 40, 1400);
      const maxH = Math.min(window.innerHeight - 40, 800);
      const ratio = 16 / 9;
      if (maxW / maxH > ratio) {
        targetH = maxH;
        targetW = targetH * ratio;
      } else {
        targetW = maxW;
        targetH = targetW / ratio;
      }
    }

    this.width = Math.floor(targetW);
    this.height = Math.floor(targetH);

    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    if (this.trackSystem) {
      this.trackSystem.isMobile = this.isMobile;
      if (wasMobile !== this.isMobile) {
        this.trackSystem.trackSpacing = this.isMobile ? 30 : 60;
      }
      this.trackSystem.resize(this.width, this.height);
      const midTrack = Math.floor(this.trackSystem.getTrackCount() / 2);
      if (!this.player || Math.abs(this.player.currentTrack - midTrack) > 3) {
        if (this.player) this.player.currentTrack = midTrack;
      }
    }
    if (this.barrierSystem) {
      this.barrierSystem.isMobile = this.isMobile;
      this.barrierSystem.baseWidth = this.isMobile ? 100 : 200;
      this.barrierSystem.baseHeight = this.isMobile ? 20 : 40;
      this.barrierSystem.resize(this.width, this.height);
    }
    if (this.fragmentSystem) {
      this.fragmentSystem.isMobile = this.isMobile;
      this.fragmentSystem.resize(this.width, this.height);
    }
    if (this.player) {
      this.player.isMobile = this.isMobile;
      this.player.baseSpeed = this.isMobile ? 75 : 150;
      this.player.radius = this.isMobile ? 10 : 14;
      this.player.resize(this.width, this.height);
    }
  }

  initSystems(): void {
    this.trackSystem = new TrackSystem(this.width, this.height, this.isMobile);
    this.player = new Player(this.width, this.height, this.isMobile);
    this.barrierSystem = new BarrierSystem(this.width, this.height, this.isMobile);
    this.fragmentSystem = new FragmentSystem(this.width, this.height, this.isMobile);

    this.player.currentTrack = Math.floor(this.trackSystem.getTrackCount() / 2);
    this.player.x = this.width * 0.2;
    this.player.y = this.trackSystem.getTrackY(this.player.currentTrack);

    this.player.onRequestSwitch = (fromTrack, deltaY) => {
      const result = this.trackSystem.trySwitchByDelta(fromTrack, deltaY);
      if (result.switched) {
        const prevTrack = this.player.currentTrack;
        const prevY = this.player.y;
        this.player.setTrack(result.newTrack);
        this.trackSystem.startSwitch(prevTrack, result.newTrack);
        this.trackSystem.addTrailLine(this.player.x, prevY, this.player.x, result.toY);
        this.player.emitSwitchParticles(result.fromY, result.toY);
        this.player.resetAccumulatedDelta();
      }
    };

    this.player.onPurgePulse = (x, y, radius) => {
      return this.barrierSystem.clearInRadius(x, y, radius);
    };

    for (let i = 0; i < 3; i++) {
      const trackYs = this.trackSystem.tracks.map(t => t.y);
      this.fragmentSystem.spawnRandom(trackYs);
    }
  }

  initStars(): void {
    this.stars = [];
    const count = this.isMobile ? 40 : 80;
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: 0.5 + Math.random() * 1.5,
        speed: 10 + Math.random() * 25,
        alpha: 0.2 + Math.random() * 0.5
      });
    }
  }

  initInput(): void {
    const onDown = (clientY: number) => {
      this.ensureAudio();
      this.player.startDrag(clientY);
    };
    const onMove = (clientY: number) => {
      this.player.updateDrag(clientY);
    };
    const onUp = () => {
      this.player.endDrag();
    };

    this.canvas.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      onDown(e.clientY - rect.top);
    });
    window.addEventListener('mousemove', (e) => {
      if (!this.player.isDragging) return;
      const rect = this.canvas.getBoundingClientRect();
      onMove(e.clientY - rect.top);
    });
    window.addEventListener('mouseup', onUp);

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const t = e.touches[0];
      onDown(t.clientY - rect.top);
    }, { passive: false });
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (!this.player.isDragging) return;
      const rect = this.canvas.getBoundingClientRect();
      const t = e.touches[0];
      onMove(t.clientY - rect.top);
    }, { passive: false });
    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      onUp();
    }, { passive: false });
    this.canvas.addEventListener('touchcancel', (e) => {
      e.preventDefault();
      onUp();
    }, { passive: false });

    window.addEventListener('keydown', (e) => {
      this.ensureAudio();
      if (e.repeat) return;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        if (!this.trackSystem.isSwitching() && this.player.currentTrack > 0) {
          const fromY = this.player.y;
          const toTrack = this.player.currentTrack - 1;
          const toY = this.trackSystem.getTrackY(toTrack);
          this.trackSystem.startSwitch(this.player.currentTrack, toTrack);
          this.trackSystem.addTrailLine(this.player.x, fromY, this.player.x, toY);
          this.player.setTrack(toTrack);
          this.player.emitSwitchParticles(fromY, toY);
        }
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        if (!this.trackSystem.isSwitching() && this.player.currentTrack < this.trackSystem.getTrackCount() - 1) {
          const fromY = this.player.y;
          const toTrack = this.player.currentTrack + 1;
          const toY = this.trackSystem.getTrackY(toTrack);
          this.trackSystem.startSwitch(this.player.currentTrack, toTrack);
          this.trackSystem.addTrailLine(this.player.x, fromY, this.player.x, toY);
          this.player.setTrack(toTrack);
          this.player.emitSwitchParticles(fromY, toY);
        }
      }
    });
  }

  ensureAudio(): void {
    if (!this.audioReady) {
      this.audioReady = true;
      this.fragmentSystem.ensureAudioContext();
    }
  }

  loop(time: number): void {
    if (this.lastTime === 0) this.lastTime = time;
    let dt = (time - this.lastTime) / 1000;
    this.lastTime = time;
    if (dt > 0.05) dt = 0.05;

    this.update(dt);
    this.render();

    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt: number): void {
    this.scanlinePhase += dt * 0.5;
    this.hitCooldown = Math.max(0, this.hitCooldown - dt);

    this.scrollOffset += this.player.baseSpeed * this.player.speedMultiplier * dt;

    for (const star of this.stars) {
      star.x -= star.speed * dt;
      if (star.x < -5) {
        star.x = this.width + 5;
        star.y = Math.random() * this.height;
      }
    }

    this.trackSystem.update(dt);

    const interpolatedY = this.trackSystem.getInterpolatedY(this.player.currentTrack);
    this.player.update(dt, interpolatedY);

    this.barrierSystem.update(dt);
    this.barrierSpawnTimer += dt;
    const dynamicInterval = Math.max(0.7, 1.5 - this.barrierSystem.difficultyTimer * 0.008);
    if (this.barrierSpawnTimer >= dynamicInterval) {
      this.barrierSpawnTimer = 0;
      const trackYs = this.trackSystem.tracks.map(t => t.y);
      this.barrierSystem.spawnRandom(trackYs);
    }

    this.fragmentSystem.update(dt, this.player.x, this.player.y, (noteIndex, color) => {
      this.player.collectNote(noteIndex, color, this.player.x, this.player.y);
    });
    this.fragmentSpawnTimer += dt;
    if (this.fragmentSpawnTimer >= 2.5) {
      this.fragmentSpawnTimer = 0;
      const trackYs = this.trackSystem.tracks.map(t => t.y);
      this.fragmentSystem.spawnRandom(trackYs);
    }

    if (this.hitCooldown <= 0) {
      const hit: Barrier | null = this.barrierSystem.checkCollision(
        this.player.x,
        this.player.y,
        this.player.radius * 0.8
      );
      if (hit) {
        const result = this.player.triggerHit();
        this.hitCooldown = 0.8;
        if (result.lostNote !== null) {
          this.fragmentSystem.removeByNoteIndex(result.lostNote);
        }
      }
    }
  }

  renderBackground(): void {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#0a0e27');
    gradient.addColorStop(0.5, '#120a2e');
    gradient.addColorStop(1, '#1a0a2e');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);

    for (const star of this.stars) {
      this.ctx.globalAlpha = star.alpha;
      this.ctx.fillStyle = '#a0c8ff';
      this.ctx.beginPath();
      this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1;

    this.ctx.save();
    this.ctx.globalAlpha = 0.035;
    const scanCount = Math.ceil(this.height / 3);
    for (let i = 0; i < scanCount; i++) {
      const y = (i * 3 + this.scanlinePhase * 30) % this.height;
      this.ctx.fillStyle = '#00ffff';
      this.ctx.fillRect(0, y, this.width, 1);
    }
    this.ctx.restore();

    const vignette = this.ctx.createRadialGradient(
      this.width / 2, this.height / 2, Math.min(this.width, this.height) * 0.3,
      this.width / 2, this.height / 2, Math.max(this.width, this.height) * 0.8
    );
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.55)');
    this.ctx.fillStyle = vignette;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  renderUI(): void {
    const padding = this.isMobile ? 12 : 20;
    const iconSize = this.isMobile ? 20 : 28;
    const iconGap = this.isMobile ? 6 : 10;
    const totalW = 7 * iconSize + 6 * iconGap;
    const startX = this.width - padding - totalW;
    const startY = padding;

    this.ctx.save();
    for (let i = 0; i < 7; i++) {
      const x = startX + i * (iconSize + iconGap);
      const y = startY;
      const collected = this.player.collectedNotes.has(i);
      const config = NOTE_CONFIG[i];

      const bgGrad = this.ctx.createRadialGradient(
        x + iconSize / 2, y + iconSize / 2, 0,
        x + iconSize / 2, y + iconSize / 2, iconSize
      );
      if (collected) {
        bgGrad.addColorStop(0, config.color + '55');
        bgGrad.addColorStop(1, config.color + '00');
        this.ctx.fillStyle = bgGrad;
        this.ctx.fillRect(x - 6, y - 6, iconSize + 12, iconSize + 12);

        this.ctx.shadowColor = config.color;
        this.ctx.shadowBlur = 12;
        this.ctx.fillStyle = config.color;
        this.ctx.beginPath();
        this.ctx.arc(x + iconSize / 2, y + iconSize / 2, iconSize / 2 - 1, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.shadowBlur = 0;
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 1.5;
        this.ctx.stroke();
      } else {
        this.ctx.fillStyle = 'rgba(80, 90, 120, 0.5)';
        this.ctx.beginPath();
        this.ctx.arc(x + iconSize / 2, y + iconSize / 2, iconSize / 2 - 1, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.strokeStyle = 'rgba(120, 140, 180, 0.6)';
        this.ctx.lineWidth = 1.5;
        this.ctx.setLineDash([3, 3]);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
      }
    }
    this.ctx.restore();

    this.ctx.save();
    const fontSize = this.isMobile ? 20 : 30;
    this.ctx.font = `bold ${fontSize}px 'Orbitron', 'Share Tech Mono', 'Courier New', monospace`;
    this.ctx.textAlign = 'right';
    this.ctx.textBaseline = 'bottom';

    const scoreText = this.player.score.toString().padStart(6, '0');
    const scoreX = this.width - padding;
    const scoreY = this.height - padding;

    this.ctx.shadowColor = 'rgba(0, 255, 255, 0.6)';
    this.ctx.shadowBlur = 8;

    this.ctx.strokeStyle = 'rgba(0, 50, 80, 0.8)';
    this.ctx.lineWidth = 4;
    this.ctx.strokeText(scoreText, scoreX, scoreY);

    this.ctx.fillStyle = '#b0e8ff';
    this.ctx.fillText(scoreText, scoreX, scoreY);

    const labelSize = this.isMobile ? 10 : 13;
    this.ctx.font = `bold ${labelSize}px 'Orbitron', 'Share Tech Mono', 'Courier New', monospace`;
    this.ctx.fillStyle = 'rgba(160, 200, 255, 0.7)';
    this.ctx.shadowBlur = 4;
    this.ctx.fillText('SCORE', scoreX, scoreY - fontSize - 4);

    this.ctx.restore();

    if (this.player.collectedNotes.size >= 5) {
      this.ctx.save();
      const pulse = 0.5 + Math.sin(this.scanlinePhase * 8) * 0.5;
      const wSize = this.isMobile ? 14 : 20;
      const wY = startY + iconSize + 10;
      for (let i = 0; i < 7; i++) {
        const x = startX + i * (iconSize + iconGap) + iconSize / 2;
        this.ctx.globalAlpha = pulse * 0.6;
        this.ctx.fillStyle = NOTE_CONFIG[i].color;
        this.ctx.beginPath();
        this.ctx.arc(x, wY, wSize * 0.15, 0, Math.PI * 2);
        this.ctx.fill();
      }
      this.ctx.restore();
    }
  }

  render(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);

    this.renderBackground();

    this.trackSystem.render(this.ctx, this.scrollOffset);

    this.barrierSystem.render(this.ctx);

    this.fragmentSystem.render(this.ctx);

    this.player.render(this.ctx);

    this.fragmentSystem.renderCollectEffects(this.ctx);

    this.renderUI();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  try {
    new Game();
  } catch (e) {
    console.error('Game init failed:', e);
  }
});
