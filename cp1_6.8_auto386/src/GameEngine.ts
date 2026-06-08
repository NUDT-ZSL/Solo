import { Player, type BeatInfo } from './Player';
import { ObstacleManager } from './ObstacleManager';
import { BeatVisualizer } from './BeatVisualizer';

export type GamePhase = 'menu' | 'playing' | 'gameover';

export interface GameCallbacks {
  onScoreChange: (score: number) => void;
  onComboChange: (combo: number) => void;
  onLivesChange: (lives: number) => void;
  onPhaseChange: (phase: GamePhase) => void;
  onBeatLabel: (label: string) => void;
}

export class GameEngine {
  player: Player;
  obstacleManager: ObstacleManager;
  visualizer: BeatVisualizer;

  canvas: HTMLCanvasElement | null = null;
  ctx: CanvasRenderingContext2D | null = null;

  phase: GamePhase = 'menu';
  score = 0;
  combo = 0;
  maxCombo = 0;
  lives = 3;

  bpm = 120;
  beatInterval = 500;
  beatTime = 0;
  beatCount = 0;
  gameTime = 0;

  audioCtx: AudioContext | null = null;
  analyser: AnalyserNode | null = null;
  masterGain: GainNode | null = null;
  nextBeatTime = 0;
  schedulerTimer = 0;
  isAudioStarted = false;

  animFrame = 0;
  lastTime = 0;

  callbacks: GameCallbacks;

  beatLabels: { text: string; x: number; y: number; life: number }[] = [];

  constructor(callbacks: GameCallbacks) {
    this.callbacks = callbacks;
    this.player = new Player();
    this.obstacleManager = new ObstacleManager();
    this.visualizer = new BeatVisualizer();
  }

  init(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.handleResize();
  }

  handleResize() {
    if (!this.canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.player.resize(w, h);
    this.obstacleManager.resize(w, h);
    this.visualizer.resize(w, h);
  }

  start() {
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.lives = 3;
    this.beatTime = 0;
    this.beatCount = 0;
    this.gameTime = 0;
    this.beatLabels = [];
    this.player = new Player();
    this.obstacleManager = new ObstacleManager();
    this.handleResize();

    this.phase = 'playing';
    this.callbacks.onPhaseChange('playing');
    this.callbacks.onScoreChange(0);
    this.callbacks.onComboChange(0);
    this.callbacks.onLivesChange(3);

    this.startAudio();
    this.lastTime = performance.now();
    this.loop();
  }

  stop() {
    this.phase = 'gameover';
    this.callbacks.onPhaseChange('gameover');
    this.stopAudio();
    cancelAnimationFrame(this.animFrame);
  }

  restart() {
    this.obstacleManager.reset();
    this.visualizer.particles = [];
    this.start();
  }

  private startAudio() {
    if (this.isAudioStarted) return;
    this.audioCtx = new AudioContext();
    this.masterGain = this.audioCtx.createGain();
    this.masterGain.gain.value = 0.3;
    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 256;
    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.audioCtx.destination);
    this.nextBeatTime = this.audioCtx.currentTime;
    this.isAudioStarted = true;
    this.scheduleAudio();
  }

  private stopAudio() {
    this.isAudioStarted = false;
    clearTimeout(this.schedulerTimer);
    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx = null;
    }
  }

  private scheduleAudio() {
    if (!this.isAudioStarted || !this.audioCtx) return;
    while (this.nextBeatTime < this.audioCtx.currentTime + 0.1) {
      this.playBeat(this.beatCount % 4, this.nextBeatTime);
      this.nextBeatTime += this.beatInterval * 0.001;
    }
    this.schedulerTimer = window.setTimeout(() => this.scheduleAudio(), 25);
  }

  private playBeat(beat: number, time: number) {
    if (!this.audioCtx || !this.masterGain) return;
    if (beat === 0 || beat === 2) this.playKick(time);
    if (beat === 1 || beat === 3) this.playSnare(time);
    this.playHiHat(time);
    this.playBass(beat, time);
  }

  private playKick(time: number) {
    if (!this.audioCtx || !this.masterGain) return;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(1, time + 0.5);
    gain.gain.setValueAtTime(0.8, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + 0.5);
  }

  private playSnare(time: number) {
    if (!this.audioCtx || !this.masterGain) return;
    const len = Math.floor(this.audioCtx.sampleRate * 0.15);
    const buf = this.audioCtx.createBuffer(1, len, this.audioCtx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = this.audioCtx.createBufferSource();
    src.buffer = buf;
    const gain = this.audioCtx.createGain();
    gain.gain.setValueAtTime(0.4, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
    const flt = this.audioCtx.createBiquadFilter();
    flt.type = 'highpass';
    flt.frequency.value = 1000;
    src.connect(flt);
    flt.connect(gain);
    gain.connect(this.masterGain);
    src.start(time);
    src.stop(time + 0.15);
  }

  private playHiHat(time: number) {
    if (!this.audioCtx || !this.masterGain) return;
    const len = Math.floor(this.audioCtx.sampleRate * 0.04);
    const buf = this.audioCtx.createBuffer(1, len, this.audioCtx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = this.audioCtx.createBufferSource();
    src.buffer = buf;
    const gain = this.audioCtx.createGain();
    gain.gain.setValueAtTime(0.12, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.04);
    const flt = this.audioCtx.createBiquadFilter();
    flt.type = 'highpass';
    flt.frequency.value = 5000;
    src.connect(flt);
    flt.connect(gain);
    gain.connect(this.masterGain);
    src.start(time);
    src.stop(time + 0.04);
  }

  private playBass(beat: number, time: number) {
    if (!this.audioCtx || !this.masterGain) return;
    const notes = [130.81, 103.83, 116.54, 98.0];
    const freq = notes[beat];
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(0.15, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + this.beatInterval * 0.001 * 0.8);
    const flt = this.audioCtx.createBiquadFilter();
    flt.type = 'lowpass';
    flt.frequency.value = 300;
    osc.connect(flt);
    flt.connect(gain);
    gain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + this.beatInterval * 0.001);
  }

  private getBeatInfo(): BeatInfo {
    const sinceLast = this.beatTime;
    const toNext = this.beatInterval * 0.001 - sinceLast;
    const beatWindow = 0.08;
    const isOnBeat = sinceLast < beatWindow || toNext < beatWindow;
    const beatIntensity = isOnBeat ? 1 - Math.min(sinceLast, toNext) / beatWindow : 0;
    return {
      bpm: this.bpm,
      beatInterval: this.beatInterval,
      currentBeat: this.beatCount,
      timeSinceLastBeat: sinceLast,
      timeToNextBeat: toNext,
      isOnBeat,
      beatIntensity,
    };
  }

  private loop = () => {
    if (this.phase !== 'playing') return;

    const now = performance.now();
    const rawDt = (now - this.lastTime) * 0.001;
    const dt = Math.min(rawDt, 0.05);
    this.lastTime = now;

    this.gameTime += dt;
    this.beatTime += dt;
    const beatSec = this.beatInterval * 0.001;
    if (this.beatTime >= beatSec) {
      this.beatTime -= beatSec;
      this.beatCount++;
    }

    const beatInfo = this.getBeatInfo();

    this.player.update(dt, beatInfo);
    this.obstacleManager.update(dt, beatInfo);
    this.visualizer.update(dt, beatInfo, this.combo);

    const collisions = this.obstacleManager.checkCollisions(
      this.player.x,
      this.player.currentY,
      this.player.radius,
      this.player.currentLane
    );

    for (const f of collisions.collectedFragments) {
      const sync = beatInfo.beatIntensity;
      let base = 100;
      let label = '';
      if (sync > 0.7) {
        base = 200;
        label = 'PERFECT';
      } else if (sync > 0.3) {
        base = 150;
        label = 'GOOD';
      }
      const multiplier = 1 + this.combo * 0.1;
      const pts = Math.round(base * multiplier);
      this.score += pts;
      this.combo++;
      if (this.combo > this.maxCombo) this.maxCombo = this.combo;
      this.callbacks.onScoreChange(this.score);
      this.callbacks.onComboChange(this.combo);
      this.visualizer.triggerBurst(f.x, this.obstacleManager.laneH * f.lane + this.obstacleManager.laneH / 2, f.color, 15);
      this.beatLabels.push({ text: label || '+' + pts, x: f.x, y: this.obstacleManager.laneH * f.lane + this.obstacleManager.laneH / 2, life: 0.8 });
    }

    for (const o of collisions.hitObstacles) {
      if (this.player.invincibleTimer > 0) continue;
      this.lives--;
      this.combo = 0;
      this.callbacks.onLivesChange(this.lives);
      this.callbacks.onComboChange(0);
      this.player.onHit();
      this.visualizer.triggerShake(12);
      this.visualizer.triggerMiss(o.x, this.obstacleManager.laneH * o.lane + this.obstacleManager.laneH / 2);
      this.beatLabels.push({ text: 'MISS', x: o.x, y: this.obstacleManager.laneH * o.lane + this.obstacleManager.laneH / 2, life: 0.6 });

      if (this.lives <= 0) {
        this.stop();
        return;
      }
    }

    for (let i = this.beatLabels.length - 1; i >= 0; i--) {
      const lbl = this.beatLabels[i];
      lbl.life -= dt;
      lbl.y -= 40 * dt;
      if (lbl.life <= 0) this.beatLabels.splice(i, 1);
    }

    this.render();
    this.animFrame = requestAnimationFrame(this.loop);
  };

  private render() {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const w = window.innerWidth;
    const h = window.innerHeight;

    ctx.clearRect(0, 0, w, h);

    const beatInfo = this.getBeatInfo();
    const [sx, sy] = this.visualizer.getShakeOffset();

    ctx.save();
    ctx.translate(sx, sy);

    this.visualizer.renderBackground(ctx);
    this.visualizer.renderTrack(ctx, beatInfo);
    this.visualizer.renderParticles(ctx);
    this.obstacleManager.render(ctx);
    this.player.render(ctx);

    for (const lbl of this.beatLabels) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, lbl.life * 2);
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = lbl.text === 'MISS' ? '#ff4444' : '#ffff44';
      ctx.shadowColor = lbl.text === 'MISS' ? '#ff4444' : '#ffff44';
      ctx.shadowBlur = 10;
      ctx.fillText(lbl.text, lbl.x, lbl.y);
      ctx.restore();
    }

    ctx.restore();
  }
}
