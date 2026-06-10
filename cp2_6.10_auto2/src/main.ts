import { AudioAnalyzer } from './audioAnalyzer';
import { NoteManager } from './noteManager';
import { ParticleSystem } from './particleSystem';
import type { Note, Particle, Track, GameState, NoteShape, HitResult } from './types';
import { TRACKS, NOTE_COLORS } from './types';

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private audioAnalyzer: AudioAnalyzer;
  private noteManager: NoteManager;
  private particleSystem: ParticleSystem;
  private state: GameState = 'menu';
  private currentTrack: Track | null = null;
  private lastTime = 0;
  private animationId: number | null = null;
  private canvasWidth = 0;
  private canvasHeight = 0;
  private themeColor = '#FF8C42';
  private targetThemeColor = '#FF8C42';
  private colorTransitionProgress = 1;
  private comboBounceTime = 0;
  private fullScreenFlashTime = 0;
  private lastComboValue = 0;
  private noteSize = 24;
  private isMobile = false;

  private scoreEl: HTMLElement;
  private comboEl: HTMLElement;
  private comboDisplayEl: HTMLElement;
  private comboGlowEl: HTMLElement;
  private fullscreenFlashEl: HTMLElement;
  private menuScreenEl: HTMLElement;
  private loadingScreenEl: HTMLElement;
  private endScreenEl: HTMLElement;
  private gameHeaderEl: HTMLElement;
  private gameFooterEl: HTMLElement;
  private keyHintsEl: HTMLElement;
  private trackListEl: HTMLElement;
  private playPauseBtn: HTMLButtonElement;
  private soundBtn: HTMLButtonElement;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get canvas context');
    this.ctx = ctx;

    this.audioAnalyzer = new AudioAnalyzer();
    this.noteManager = new NoteManager();
    this.particleSystem = new ParticleSystem();

    this.scoreEl = document.getElementById('score-value')!;
    this.comboEl = document.getElementById('combo-value')!;
    this.comboDisplayEl = document.getElementById('combo-display')!;
    this.comboGlowEl = document.getElementById('combo-glow')!;
    this.fullscreenFlashEl = document.getElementById('fullscreen-flash')!;
    this.menuScreenEl = document.getElementById('menu-screen')!;
    this.loadingScreenEl = document.getElementById('loading-screen')!;
    this.endScreenEl = document.getElementById('end-screen')!;
    this.gameHeaderEl = document.getElementById('game-header')!;
    this.gameFooterEl = document.getElementById('game-footer')!;
    this.keyHintsEl = document.getElementById('key-hints')!;
    this.trackListEl = document.getElementById('track-list')!;
    this.playPauseBtn = document.getElementById('play-pause-btn') as HTMLButtonElement;
    this.soundBtn = document.getElementById('sound-btn') as HTMLButtonElement;

    this.init();
  }

  private init(): void {
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    this.audioAnalyzer.onBeat((time) => {
      if (this.state === 'playing') {
        this.noteManager.spawnPatternedNote(time);
      }
    });

    this.noteManager.onHit((result) => this.onNoteHit(result));
    this.noteManager.onMiss((note) => this.onNoteMiss(note));

    this.setupEventListeners();
    this.renderTrackList();
    this.updateUI();

    this.gameHeaderEl.classList.add('hidden');
    this.gameFooterEl.classList.add('hidden');
    this.keyHintsEl.classList.add('hidden');

    this.loop(performance.now());
  }

  private resizeCanvas(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();

    this.canvasWidth = rect.width;
    this.canvasHeight = rect.height;

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);

    this.noteManager.setCanvasSize(rect.width, rect.height);
    this.isMobile = rect.width < 768;
    this.noteSize = this.isMobile ? 20.4 : 24;
    this.noteManager.setNoteSize(this.noteSize);

    if (this.currentTrack) {
      this.noteManager.setBPM(this.currentTrack.bpm);
    }
  }

  private setupEventListeners(): void {
    document.addEventListener('keydown', (e) => {
      if (this.state !== 'playing') return;

      const key = e.key.toUpperCase();
      let shape: NoteShape | null = null;

      if (key === 'F') shape = 'circle';
      else if (key === 'G') shape = 'triangle';
      else if (key === 'H') shape = 'diamond';
      else if (key === ' ') {
        e.preventDefault();
        this.togglePause();
        return;
      }

      if (shape) {
        e.preventDefault();
        this.noteManager.hitTest(shape);
      }
    });

    this.canvas.addEventListener('click', (e) => {
      if (this.state !== 'playing') return;

      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const notes = this.noteManager.getNotes();
      let closestNote: Note | null = null;
      let closestDist = Infinity;

      for (const note of notes) {
        if (note.hit || note.missed || note.falling) continue;
        const dist = Math.sqrt((x - note.x) ** 2 + (y - note.y) ** 2);
        if (dist < note.size * 1.5 && dist < closestDist) {
          closestNote = note;
          closestDist = dist;
        }
      }

      if (closestNote) {
        this.noteManager.hitTest(closestNote.shape);
      }
    });

    this.playPauseBtn.addEventListener('click', () => this.togglePause());
    this.soundBtn.addEventListener('click', () => this.toggleSound());

    document.getElementById('replay-btn')?.addEventListener('click', () => this.restartGame());
    document.getElementById('replay-watch-btn')?.addEventListener('click', () => this.startReplay());
    document.getElementById('back-menu-btn')?.addEventListener('click', () => this.backToMenu());
  }

  private renderTrackList(): void {
    this.trackListEl.innerHTML = '';

    TRACKS.forEach((track) => {
      const card = document.createElement('div');
      card.className = 'track-card';
      card.style.borderColor = track.themeColor + '40';

      const difficultyDots = Array(3).fill(0).map((_, i) =>
        `<span class="difficulty-dot ${i < track.difficulty ? 'active' : ''}"></span>`
      ).join('');

      card.innerHTML = `
        <div class="track-color-preview" style="background: ${track.themeColor}; color: ${track.themeColor};"></div>
        <div class="track-name">${track.name}</div>
        <div class="track-info">
          <span>${track.duration}秒</span>
          <span>${track.bpm} BPM</span>
        </div>
        <div class="track-difficulty">${difficultyDots}</div>
      `;

      card.addEventListener('click', () => this.startGame(track));
      this.trackListEl.appendChild(card);
    });
  }

  private async startGame(track: Track): Promise<void> {
    this.currentTrack = track;
    this.state = 'loading';

    this.menuScreenEl.classList.add('hidden');
    this.loadingScreenEl.classList.remove('hidden');

    try {
      await this.audioAnalyzer.loadTrack(track);

      this.noteManager.reset();
      this.noteManager.setBPM(track.bpm);
      this.noteManager.clearReplayRecords();
      this.particleSystem.clear();

      this.targetThemeColor = track.themeColor;
      this.colorTransitionProgress = 0;

      this.updatePlayPauseIcon();
      this.updateSoundIcon();

      this.loadingScreenEl.classList.add('hidden');
      this.gameHeaderEl.classList.remove('hidden');
      this.gameFooterEl.classList.remove('hidden');
      this.keyHintsEl.classList.remove('hidden');

      this.state = 'playing';
      this.audioAnalyzer.start();

      this.updateUI();
    } catch (error) {
      console.error('Failed to start game:', error);
      this.state = 'menu';
      this.loadingScreenEl.classList.add('hidden');
      this.menuScreenEl.classList.remove('hidden');
    }
  }

  private togglePause(): void {
    if (this.state === 'playing') {
      this.state = 'paused';
      this.audioAnalyzer.pause();
    } else if (this.state === 'paused') {
      this.state = 'playing';
      this.audioAnalyzer.start();
    }
    this.updatePlayPauseIcon();
  }

  private toggleSound(): void {
    const enabled = !this.audioAnalyzer.isSoundEnabled();
    this.audioAnalyzer.setSoundEnabled(enabled);
    this.updateSoundIcon();
  }

  private updatePlayPauseIcon(): void {
    const isPlaying = this.state === 'playing';
    this.playPauseBtn.innerHTML = isPlaying
      ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`
      : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
  }

  private updateSoundIcon(): void {
    const enabled = this.audioAnalyzer.isSoundEnabled();
    this.soundBtn.innerHTML = enabled
      ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`
      : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>`;
  }

  private onNoteHit(result: HitResult): void {
    const perfect = result.type === 'perfect';
    this.particleSystem.spawnRingParticles(result.position.x, result.position.y, result.note.color, perfect);

    if (perfect) {
      this.particleSystem.spawnSparkleParticles(result.position.x, result.position.y, '#FFD700');
    }

    const combo = this.noteManager.getCombo();

    if (combo > this.lastComboValue) {
      this.triggerComboBounce();
    }

    if (combo === 10) {
      this.comboGlowEl.classList.add('active');
    }

    if (combo > 0 && combo % 20 === 0) {
      this.triggerFullscreenFlash();
    }

    this.lastComboValue = combo;
  }

  private onNoteMiss(note: Note): void {
    this.particleSystem.spawnFallParticles(note);

    if (this.noteManager.getCombo() < 10) {
      this.comboGlowEl.classList.remove('active');
    }
  }

  private triggerComboBounce(): void {
    this.comboBounceTime = 0.3;
    this.comboDisplayEl.classList.add('combo-bounce');
  }

  private triggerFullscreenFlash(): void {
    this.fullScreenFlashTime = 0.3;
    this.fullscreenFlashEl.classList.add('active');
    setTimeout(() => {
      this.fullscreenFlashEl.classList.remove('active');
    }, 300);
  }

  private endGame(): void {
    this.state = 'ended';
    this.audioAnalyzer.stop();
    this.comboGlowEl.classList.remove('active');

    const stats = this.noteManager.getStats();
    const accuracy = stats.totalNotes > 0
      ? Math.round((stats.hitNotes / stats.totalNotes) * 100)
      : 0;

    let stars = 1;
    if (accuracy >= 80) stars = 2;
    if (accuracy >= 95) stars = 3;

    const starRatingEl = document.getElementById('star-rating');
    if (starRatingEl) {
      starRatingEl.innerHTML = Array(3).fill(0).map((_, i) =>
        `<span class="${i < stars ? '' : 'star-empty'}">★</span>`
      ).join('');
    }

    document.getElementById('final-score')!.textContent = stats.score.toLocaleString();
    document.getElementById('final-accuracy')!.textContent = accuracy + '%';
    document.getElementById('final-maxcombo')!.textContent = stats.maxCombo.toString();

    this.gameHeaderEl.classList.add('hidden');
    this.gameFooterEl.classList.add('hidden');
    this.keyHintsEl.classList.add('hidden');
    this.endScreenEl.classList.remove('hidden');
  }

  private restartGame(): void {
    if (!this.currentTrack) return;
    this.endScreenEl.classList.add('hidden');
    this.startGame(this.currentTrack);
  }

  private startReplay(): void {
    if (!this.currentTrack) return;

    this.endScreenEl.classList.add('hidden');
    this.gameHeaderEl.classList.remove('hidden');
    this.gameFooterEl.classList.remove('hidden');

    this.noteManager.reset();
    this.noteManager.setReplayMode(true);
    this.noteManager.setBPM(this.currentTrack.bpm);
    this.particleSystem.clear();

    this.state = 'replay';
    this.audioAnalyzer.start();
  }

  private backToMenu(): void {
    this.state = 'menu';
    this.endScreenEl.classList.add('hidden');
    this.menuScreenEl.classList.remove('hidden');
    this.audioAnalyzer.stop();
    this.noteManager.reset();
    this.particleSystem.clear();
  }

  private update(deltaTime: number, currentTime: number): void {
    if (this.state === 'playing' || this.state === 'replay') {
      this.audioAnalyzer.update();
      this.noteManager.update(deltaTime);
      this.particleSystem.update(deltaTime);

      if (this.colorTransitionProgress < 1) {
        this.colorTransitionProgress += deltaTime * 2;
        if (this.colorTransitionProgress > 1) this.colorTransitionProgress = 1;
        this.updateThemeColor();
      }

      if (this.comboBounceTime > 0) {
        this.comboBounceTime -= deltaTime;
        if (this.comboBounceTime <= 0) {
          this.comboDisplayEl.classList.remove('combo-bounce');
        }
      }

      const currentTimeAudio = this.audioAnalyzer.getCurrentTime();
      const duration = this.audioAnalyzer.getDuration();

      if (currentTimeAudio >= duration && this.state === 'playing') {
        this.endGame();
      }

      this.updateUI();
    }
  }

  private updateThemeColor(): void {
    const t = this.colorTransitionProgress;
    const startColor = this.hexToRgb(this.themeColor);
    const endColor = this.hexToRgb(this.targetThemeColor);

    const r = Math.round(startColor.r + (endColor.r - startColor.r) * t);
    const g = Math.round(startColor.g + (endColor.g - startColor.g) * t);
    const b = Math.round(startColor.b + (endColor.b - startColor.b) * t);

    this.themeColor = `rgb(${r}, ${g}, ${b})`;

    if (t >= 1) {
      this.themeColor = this.targetThemeColor;
    }
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        }
      : { r: 255, g: 255, b: 255 };
  }

  private updateUI(): void {
    this.scoreEl.textContent = this.noteManager.getScore().toLocaleString();
    this.comboEl.textContent = this.noteManager.getCombo().toString();
  }

  private render(): void {
    const ctx = this.ctx;
    const w = this.canvasWidth;
    const h = this.canvasHeight;

    ctx.clearRect(0, 0, w, h);

    this.drawBackground(ctx, w, h);

    if (this.state === 'menu' || this.state === 'loading') {
      return;
    }

    this.drawJudgeLine(ctx, w, h);
    this.drawNotes(ctx);
    this.drawParticles(ctx);
  }

  private drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);

    const themeColor = this.themeColor;
    const rgb = this.hexToRgb(themeColor.startsWith('#') ? themeColor : '#FF8C42');

    const darkColor = `rgb(${Math.floor(rgb.r * 0.1)}, ${Math.floor(rgb.g * 0.1)}, ${Math.floor(rgb.b * 0.2)})`;
    const darkerColor = `rgb(${Math.floor(rgb.r * 0.03)}, ${Math.floor(rgb.g * 0.03)}, ${Math.floor(rgb.b * 0.06)})`;

    gradient.addColorStop(0, darkColor);
    gradient.addColorStop(1, darkerColor);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    if (this.state === 'playing' || this.state === 'replay') {
      const intensity = this.audioAnalyzer.getBeatIntensity();
      const glowGradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.min(w, h) * 0.4);
      glowGradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.05 + intensity * 0.1})`);
      glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glowGradient;
      ctx.fillRect(0, 0, w, h);
    }
  }

  private drawJudgeLine(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const judgeX = this.noteManager.getJudgeLineX();

    const gradient = ctx.createLinearGradient(judgeX - 30, 0, judgeX + 30, 0);
    gradient.addColorStop(0, 'rgba(238, 238, 238, 0)');
    gradient.addColorStop(0.4, 'rgba(238, 238, 238, 0.1)');
    gradient.addColorStop(0.5, 'rgba(238, 238, 238, 0.6)');
    gradient.addColorStop(0.6, 'rgba(238, 238, 238, 0.1)');
    gradient.addColorStop(1, 'rgba(238, 238, 238, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(judgeX - 30, h * 0.1, 60, h * 0.8);

    ctx.strokeStyle = 'rgba(238, 238, 238, 0.8)';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(238, 238, 238, 0.8)';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(judgeX, h * 0.1);
    ctx.lineTo(judgeX, h * 0.9);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  private drawNotes(ctx: CanvasRenderingContext2D): void {
    const notes = this.noteManager.getNotes();

    for (const note of notes) {
      this.drawNoteShape(ctx, note);
    }
  }

  private drawNoteShape(ctx: CanvasRenderingContext2D, note: Note): void {
    ctx.save();
    ctx.translate(note.x, note.y);

    const size = note.size;

    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 1.5);
    gradient.addColorStop(0, note.color + '60');
    gradient.addColorStop(1, note.color + '00');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, size * 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = note.color;
    ctx.shadowColor = note.color;
    ctx.shadowBlur = 15;

    switch (note.shape) {
      case 'circle':
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'triangle':
        ctx.beginPath();
        ctx.moveTo(0, -size);
        ctx.lineTo(size * 0.866, size * 0.5);
        ctx.lineTo(-size * 0.866, size * 0.5);
        ctx.closePath();
        ctx.fill();
        break;

      case 'diamond':
        ctx.beginPath();
        ctx.moveTo(0, -size);
        ctx.lineTo(size * 0.7, 0);
        ctx.lineTo(0, size);
        ctx.lineTo(-size * 0.7, 0);
        ctx.closePath();
        ctx.fill();
        break;
    }

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  private drawParticles(ctx: CanvasRenderingContext2D): void {
    const particles = this.particleSystem.getParticles();

    for (const p of particles) {
      const alpha = p.life / p.maxLife;
      const size = p.size * (0.5 + alpha * 0.5);

      ctx.save();
      ctx.globalAlpha = alpha;

      if (p.type === 'star') {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation || 0);
        this.drawStar(ctx, 0, 0, 5, size, size * 0.5, p.color);
      } else if (p.type === 'ring') {
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'sparkle') {
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  private drawStar(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    spikes: number,
    outerRadius: number,
    innerRadius: number,
    color: string
  ): void {
    let rot = (Math.PI / 2) * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);

    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }

    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
  }

  private loop = (currentTime: number): void => {
    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    this.update(deltaTime, currentTime);
    this.render();

    this.animationId = requestAnimationFrame(this.loop);
  };

  destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.audioAnalyzer.stop();
  }
}

const game = new Game();

(window as any).game = game;
