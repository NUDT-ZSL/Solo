import { AudioAnalyzer } from './audioAnalyzer';
import { NoteManager } from './noteManager';
import { ParticleSystem } from './particleSystem';
import type { Note, Track, GameState, NoteShape, HitResult } from './types';
import { TRACKS } from './types';

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

  private themeColorRgb = { r: 255, g: 140, b: 66 };
  private targetThemeColorRgb = { r: 255, g: 140, b: 66 };
  private colorTransitionProgress = 1;
  private colorTransitionDuration = 1.5;

  private comboBounceTime = 0;
  private fullscreenFlashTime = 0;
  private fullscreenFlashAlpha = 0;
  private lastComboValue = 0;

  private noteSize = 24;
  private isMobile = false;

  private fps = 0;
  private fpsUpdateTimer = 0;
  private frameCount = 0;

  private replayNoteSpawnTimes: { time: number; shape: NoteShape; y: number }[] = [];
  private replayNoteIndex = 0;

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
  private fpsEl: HTMLElement | null = null;

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

    this.audioAnalyzer.onBeat((time, intensity) => {
      if (this.state === 'playing') {
        this.noteManager.spawnPatternedNote(time, intensity);
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

    this.addFPSDisplay();

    this.loop(performance.now());
  }

  private addFPSDisplay(): void {
    this.fpsEl = document.createElement('div');
    this.fpsEl.style.position = 'absolute';
    this.fpsEl.style.top = '10px';
    this.fpsEl.style.right = '10px';
    this.fpsEl.style.fontSize = '12px';
    this.fpsEl.style.color = 'rgba(255,255,255,0.6)';
    this.fpsEl.style.fontFamily = 'monospace';
    this.fpsEl.style.pointerEvents = 'none';
    this.fpsEl.style.zIndex = '1000';
    this.fpsEl.style.textAlign = 'right';
    this.fpsEl.textContent = 'FPS: 0\n粒子: 0';
    this.fpsEl.style.whiteSpace = 'pre';
    document.getElementById('game-container')?.appendChild(this.fpsEl);
  }

  private resizeCanvas(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();

    this.canvasWidth = rect.width;
    this.canvasHeight = rect.height;

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
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
        if (dist < note.size * 1.8 && dist < closestDist) {
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

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        }
      : { r: 255, g: 140, b: 66 };
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
  }

  private async startGame(track: Track): Promise<void> {
    this.currentTrack = track;
    this.state = 'loading';

    this.menuScreenEl.classList.add('hidden');
    this.endScreenEl.classList.add('hidden');
    this.loadingScreenEl.classList.remove('hidden');

    try {
      await this.audioAnalyzer.loadTrack(track);

      this.noteManager.reset();
      this.noteManager.setBPM(track.bpm);
      this.noteManager.clearReplayRecords();
      this.particleSystem.clear();
      this.lastComboValue = 0;
      this.comboBounceTime = 0;

      this.targetThemeColorRgb = this.hexToRgb(track.themeColor);
      this.colorTransitionProgress = 0;

      this.updatePlayPauseIcon();
      this.updateSoundIcon();

      this.loadingScreenEl.classList.add('hidden');
      this.gameHeaderEl.classList.remove('hidden');
      this.gameFooterEl.classList.remove('hidden');
      this.keyHintsEl.classList.remove('hidden');

      this.comboGlowEl.classList.remove('active');
      this.fullscreenFlashEl.classList.remove('active');

      this.state = 'playing';

      this.audioAnalyzer.start();
      this.noteManager.setGameStartTime(performance.now());

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
      this.particleSystem.spawnStarParticles(result.position.x, result.position.y, result.note.color);
      this.particleSystem.spawnSparkleParticles(result.position.x, result.position.y, '#FFD700');
    }

    const combo = this.noteManager.getCombo();

    if (combo > this.lastComboValue && combo > 0) {
      this.triggerComboBounce();
    }

    if (combo >= 10 && !this.comboGlowEl.classList.contains('active')) {
      this.comboGlowEl.classList.add('active');
    }

    if (combo > 0 && combo % 20 === 0 && combo > this.lastComboValue) {
      this.triggerFullscreenFlash();
    }

    this.lastComboValue = combo;
  }

  private onNoteMiss(note: Note): void {
    this.particleSystem.spawnFallParticles(note);

    if (this.noteManager.getCombo() < 10) {
      this.comboGlowEl.classList.remove('active');
    }

    this.lastComboValue = 0;
  }

  private triggerComboBounce(): void {
    this.comboBounceTime = 0.3;
    this.comboDisplayEl.classList.remove('combo-bounce');
    void this.comboDisplayEl.offsetWidth;
    this.comboDisplayEl.classList.add('combo-bounce');
  }

  private triggerFullscreenFlash(): void {
    this.fullscreenFlashTime = 0.4;
    this.fullscreenFlashAlpha = 0.6;
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
    if (accuracy >= 70) stars = 2;
    if (accuracy >= 90) stars = 3;

    const starRatingEl = document.getElementById('star-rating');
    if (starRatingEl) {
      starRatingEl.innerHTML = Array(3).fill(0).map((_, i) =>
        `<span class="${i < stars ? '' : 'star-empty'}" style="color:${i < stars ? '#FFD700' : 'inherit'}">★</span>`
      ).join('');
    }

    const finalScoreEl = document.getElementById('final-score');
    const finalAccuracyEl = document.getElementById('final-accuracy');
    const finalMaxcomboEl = document.getElementById('final-maxcombo');

    if (finalScoreEl) finalScoreEl.textContent = stats.score.toLocaleString();
    if (finalAccuracyEl) finalAccuracyEl.textContent = accuracy + '%';
    if (finalMaxcomboEl) finalMaxcomboEl.textContent = stats.maxCombo.toString();

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

    const records = this.noteManager.getReplayRecords();
    if (records.length === 0) {
      alert('暂无回放记录，请先完成一局游戏');
      return;
    }

    this.endScreenEl.classList.add('hidden');
    this.gameHeaderEl.classList.remove('hidden');
    this.gameFooterEl.classList.remove('hidden');

    this.noteManager.reset();
    this.noteManager.setBPM(this.currentTrack.bpm);
    this.noteManager.setReplayMode(true);
    this.particleSystem.clear();
    this.lastComboValue = 0;
    this.comboBounceTime = 0;
    this.comboGlowEl.classList.remove('active');

    const targetColor = this.hexToRgb(this.currentTrack.themeColor);
    this.themeColorRgb = { ...targetColor };
    this.targetThemeColorRgb = { ...targetColor };
    this.colorTransitionProgress = 1;

    this.replayNoteIndex = 0;
    this.generateReplayNoteSchedule();

    this.state = 'replay';
    this.audioAnalyzer.start();
  }

  private generateReplayNoteSchedule(): void {
    this.replayNoteSpawnTimes = [];

    if (!this.currentTrack) return;

    const bpm = this.currentTrack.bpm;
    const beatInterval = 60 / bpm;
    const duration = this.currentTrack.duration;

    const playAreaTop = this.canvasHeight * 0.1;
    const playAreaBottom = this.canvasHeight * 0.9;
    const shapes: NoteShape[] = ['circle', 'triangle', 'diamond'];

    let seed = 42;
    const seededRandom = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    const beatCount = Math.floor(duration / beatInterval);
    for (let i = 0; i < beatCount; i++) {
      const time = i * beatInterval;
      const numNotes = 1 + Math.floor(seededRandom() * 2);
      const yStep = (playAreaBottom - playAreaTop) / (numNotes + 1);

      for (let j = 0; j < numNotes; j++) {
        const y = playAreaTop + yStep * (j + 1) + (seededRandom() - 0.5) * 20;
        const shape = shapes[Math.floor(seededRandom() * shapes.length)];
        this.replayNoteSpawnTimes.push({ time, shape, y });
      }
    }
  }

  private backToMenu(): void {
    this.state = 'menu';
    this.endScreenEl.classList.add('hidden');
    this.menuScreenEl.classList.remove('hidden');
    this.audioAnalyzer.stop();
    this.noteManager.reset();
    this.particleSystem.clear();
    this.comboGlowEl.classList.remove('active');
    this.lastComboValue = 0;
  }

  private update(deltaTime: number, currentTime: number): void {
    this.frameCount++;
    this.fpsUpdateTimer += deltaTime;
    if (this.fpsUpdateTimer >= 0.5) {
      this.fps = Math.round(this.frameCount / this.fpsUpdateTimer);
      this.frameCount = 0;
      this.fpsUpdateTimer = 0;
      if (this.fpsEl) {
        this.fpsEl.textContent = `FPS: ${this.fps}\n粒子: ${this.particleSystem.getActiveCount()}`;
      }
    }

    if (this.colorTransitionProgress < 1) {
      this.colorTransitionProgress += deltaTime / this.colorTransitionDuration;
      if (this.colorTransitionProgress > 1) this.colorTransitionProgress = 1;
      this.updateThemeColor();
    }

    if (this.comboBounceTime > 0) {
      this.comboBounceTime -= deltaTime;
      if (this.comboBounceTime <= 0) {
        this.comboDisplayEl.classList.remove('combo-bounce');
      }
    }

    if (this.fullscreenFlashTime > 0) {
      this.fullscreenFlashTime -= deltaTime;
      this.fullscreenFlashAlpha = Math.max(0, this.fullscreenFlashTime / 0.4 * 0.6);
      if (this.fullscreenFlashTime <= 0) {
        this.fullscreenFlashAlpha = 0;
      }
    }

    if (this.state === 'playing' || this.state === 'replay') {
      this.audioAnalyzer.update();
      this.noteManager.update(deltaTime);
      this.particleSystem.update(deltaTime);

      if (this.state === 'replay') {
        this.updateReplayNotes();
      }

      const currentTimeAudio = this.audioAnalyzer.getCurrentTime();
      const duration = this.audioAnalyzer.getDuration();

      if (currentTimeAudio >= duration - 0.05 && (this.state === 'playing' || this.state === 'replay')) {
        this.endGame();
        return;
      }

      this.updateUI();
    }
  }

  private updateReplayNotes(): void {
    const currentTime = this.audioAnalyzer.getCurrentTime();
    const judgeX = this.noteManager.getJudgeLineX();
    const noteSpeed = this.noteManager.getNoteSpeed();

    while (this.replayNoteIndex < this.replayNoteSpawnTimes.length) {
      const noteInfo = this.replayNoteSpawnTimes[this.replayNoteIndex];
      const travelTime = (this.canvasWidth - judgeX) / noteSpeed;
      const spawnTime = noteInfo.time - travelTime * 0.9;

      if (spawnTime <= currentTime) {
        this.spawnReplayNote(noteInfo.shape, noteInfo.y, noteInfo.time);
        this.replayNoteIndex++;
      } else {
        break;
      }
    }
  }

  private spawnReplayNote(shape: NoteShape, y: number, targetTime: number): void {
    const note = this.noteManager.getNotes().find(n =>
      n.shape === shape && Math.abs(n.y - y) < 30 && !n.hit && !n.missed
    );

    if (note) return;

    const spawnedNote = this.noteManager.spawnNote(shape, targetTime);
    spawnedNote.y = y;
  }

  private updateThemeColor(): void {
    const t = this.easeInOutCubic(this.colorTransitionProgress);

    this.themeColorRgb.r = Math.round(
      this.themeColorRgb.r + (this.targetThemeColorRgb.r - this.themeColorRgb.r) * t * 0.05
    );
    this.themeColorRgb.g = Math.round(
      this.themeColorRgb.g + (this.targetThemeColorRgb.g - this.themeColorRgb.g) * t * 0.05
    );
    this.themeColorRgb.b = Math.round(
      this.themeColorRgb.b + (this.targetThemeColorRgb.b - this.themeColorRgb.b) * t * 0.05
    );

    if (this.colorTransitionProgress >= 1) {
      this.themeColorRgb = { ...this.targetThemeColorRgb };
    }
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

    if (this.fullscreenFlashAlpha > 0) {
      ctx.fillStyle = `rgba(255, 215, 0, ${this.fullscreenFlashAlpha})`;
      ctx.fillRect(0, 0, w, h);
    }

    this.drawJudgeLine(ctx, w, h);
    this.drawNotes(ctx);
    this.drawParticles(ctx);
  }

  private drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);

    const r = this.themeColorRgb.r;
    const g = this.themeColorRgb.g;
    const b = this.themeColorRgb.b;

    const darkColor = `rgb(${Math.floor(r * 0.1)}, ${Math.floor(g * 0.1)}, ${Math.floor(b * 0.2)})`;
    const darkerColor = `rgb(${Math.floor(r * 0.03)}, ${Math.floor(g * 0.03)}, ${Math.floor(b * 0.06)})`;

    gradient.addColorStop(0, darkColor);
    gradient.addColorStop(1, darkerColor);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    if (this.state === 'playing' || this.state === 'replay') {
      const intensity = this.audioAnalyzer.getBeatIntensity();
      const glowGradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.min(w, h) * 0.5);
      glowGradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${0.08 + intensity * 0.15})`);
      glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glowGradient;
      ctx.fillRect(0, 0, w, h);

      const beatEnergy = this.audioAnalyzer.getLowFrequencyEnergy() / 255;
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${0.08 + beatEnergy * 0.25})`;
      ctx.lineWidth = 1;
      const ringCount = 4;
      for (let i = 0; i < ringCount; i++) {
        const radius = (w * 0.15 + i * w * 0.12) * (1 + beatEnergy * 0.08);
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  private drawJudgeLine(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const judgeX = this.noteManager.getJudgeLineX();

    const gradient = ctx.createLinearGradient(judgeX - 50, 0, judgeX + 50, 0);
    gradient.addColorStop(0, 'rgba(238, 238, 238, 0)');
    gradient.addColorStop(0.4, 'rgba(238, 238, 238, 0.06)');
    gradient.addColorStop(0.5, 'rgba(238, 238, 238, 0.5)');
    gradient.addColorStop(0.6, 'rgba(238, 238, 238, 0.06)');
    gradient.addColorStop(1, 'rgba(238, 238, 238, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(judgeX - 50, h * 0.06, 100, h * 0.88);

    ctx.strokeStyle = 'rgba(238, 238, 238, 0.8)';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(238, 238, 238, 0.8)';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.moveTo(judgeX, h * 0.06);
    ctx.lineTo(judgeX, h * 0.94);
    ctx.stroke();
    ctx.shadowBlur = 0;

    const goodRange = this.noteManager.getGoodRange();
    const perfectRange = this.noteManager.getPerfectRange();

    ctx.strokeStyle = 'rgba(255, 107, 107, 0.25)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(judgeX - goodRange, h * 0.12);
    ctx.lineTo(judgeX - goodRange, h * 0.88);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(judgeX + goodRange, h * 0.12);
    ctx.lineTo(judgeX + goodRange, h * 0.88);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 5]);
    ctx.beginPath();
    ctx.moveTo(judgeX - perfectRange, h * 0.15);
    ctx.lineTo(judgeX - perfectRange, h * 0.85);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(judgeX + perfectRange, h * 0.15);
    ctx.lineTo(judgeX + perfectRange, h * 0.85);
    ctx.stroke();
    ctx.setLineDash([]);
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
    const alpha = note.missed ? 0.4 : 1;

    ctx.globalAlpha = alpha;

    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 2);
    gradient.addColorStop(0, note.color + '90');
    gradient.addColorStop(0.4, note.color + '30');
    gradient.addColorStop(1, note.color + '00');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, size * 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = note.color;
    ctx.shadowColor = note.color;
    ctx.shadowBlur = note.hit ? 35 : 18;

    switch (note.shape) {
      case 'circle':
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(-size * 0.3, -size * 0.35, size * 0.35, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'triangle':
        ctx.beginPath();
        ctx.moveTo(0, -size);
        ctx.lineTo(size * 0.866, size * 0.5);
        ctx.lineTo(-size * 0.866, size * 0.5);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.moveTo(0, -size * 0.5);
        ctx.lineTo(size * 0.4, size * 0.25);
        ctx.lineTo(-size * 0.4, size * 0.25);
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

        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.moveTo(0, -size * 0.5);
        ctx.lineTo(size * 0.35, 0);
        ctx.lineTo(0, size * 0.5);
        ctx.lineTo(-size * 0.35, 0);
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
      const size = p.size * (0.3 + alpha * 0.7);

      ctx.save();
      ctx.globalAlpha = alpha;

      if (p.type === 'star') {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation || 0);
        this.drawStar(ctx, 0, 0, 5, size, size * 0.4, p.color);
      } else if (p.type === 'ring') {
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'sparkle') {
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
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
    ctx.shadowBlur = 30;
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
    ctx.shadowBlur = 0;
  }

  private loop = (currentTime: number): void => {
    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.05);
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
