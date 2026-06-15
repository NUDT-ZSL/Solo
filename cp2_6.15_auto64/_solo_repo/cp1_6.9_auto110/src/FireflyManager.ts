interface Firefly {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseX: number;
  baseY: number;
  size: number;
  intensity: number;
  maxIntensity: number;
  targetMaxIntensity: number;
  maxIntensityBoostTimer: number;
  cycleDuration: number;
  targetCycleDuration: number;
  phase: number;
  targetPhase: number;
  syncProgress: number;
  isSyncing: boolean;
  syncedWithGroup: boolean;
  syncConvergenceSpeed: number;
  trail: { x: number; y: number; life: number }[];
  lastTrailEmitTime: number;
  synchronizedAt: number;
  groupFlashTriggered: boolean;
}

interface Star {
  x: number;
  y: number;
  size: number;
  blinkPhase: number;
  blinkSpeed: number;
}

interface ResonanceWave {
  x: number;
  y: number;
  startTime: number;
  duration: number;
  maxRadius: number;
  width: number;
}

interface StatsSnapshot {
  activeCount: number;
  syncRate: number;
  simTime: string;
  currentBrightness: number;
}

export class FireflyManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;
  private fireflies: Firefly[] = [];
  private stars: Star[] = [];
  private resonanceWaves: ResonanceWave[] = [];
  private width: number = 0;
  private height: number = 0;
  private lastTime: number = 0;
  private animationId: number = 0;
  private audioContext: AudioContext | null = null;
  private isAudioContextInitialized: boolean = false;

  private brightness: number = 0.8;
  private syncTolerance: number = 0.2;
  private timeSpeed: number = 1.0;

  private dayNightCycleDuration: number = 240;
  private cycleProgress: number = 0.125;

  private onStatsUpdate: ((stats: StatsSnapshot) => void) | null = null;

  private clickSyncZones: {
    x: number;
    y: number;
    radius: number;
    startTime: number;
    duration: number;
    targetPhase: number;
    targetCycle: number;
  }[] = [];

  private hoveredFirefly: Firefly | null = null;
  private mouseX: number = -1;
  private mouseY: number = -1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCtx = this.offscreenCanvas.getContext('2d')!;
    this.resize();
    this.initFireflies();
    this.initStars();
    this.initAudio();
  }

  private initAudio() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.warn('Web Audio API not supported');
    }
  }

  private ensureAudioStarted() {
    if (!this.isAudioContextInitialized && this.audioContext) {
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      this.isAudioContextInitialized = true;
    }
  }

  private playResonanceSound() {
    this.ensureAudioStarted();
    if (!this.audioContext) return;
    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.1);
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.1);
    } catch (e) {
      console.warn('Audio playback error');
    }
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.offscreenCanvas.width = this.width * dpr;
    this.offscreenCanvas.height = this.height * dpr;
    this.offscreenCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private initFireflies() {
    const count = 150 + Math.floor(Math.random() * 51);
    this.fireflies = [];
    for (let i = 0; i < count; i++) {
      const x = Math.random() * this.width;
      const y = Math.random() * (this.height - 100);
      this.fireflies.push({
        id: i,
        x,
        y,
        baseX: x,
        baseY: y,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        size: 4 + Math.random() * 4,
        intensity: 0,
        maxIntensity: 0.8,
        targetMaxIntensity: 0.8,
        maxIntensityBoostTimer: 0,
        cycleDuration: 1 + Math.random() * 2,
        targetCycleDuration: 1 + Math.random() * 2,
        phase: Math.random() * Math.PI * 2,
        targetPhase: Math.random() * Math.PI * 2,
        syncProgress: 0,
        isSyncing: false,
        syncedWithGroup: false,
        syncConvergenceSpeed: 0.1,
        trail: [],
        lastTrailEmitTime: 0,
        synchronizedAt: -1,
        groupFlashTriggered: false,
      });
    }
  }

  private initStars() {
    this.stars = [];
    for (let i = 0; i < 50; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * (this.height - 100),
        size: 0.5 + Math.random() * 1.5,
        blinkPhase: Math.random() * Math.PI * 2,
        blinkSpeed: 0.5 + Math.random() * 1.5,
      });
    }
  }

  setBrightness(value: number) {
    this.brightness = Math.max(0.3, Math.min(1.0, value));
    for (const ff of this.fireflies) {
      if (ff.maxIntensityBoostTimer <= 0) {
        ff.targetMaxIntensity = this.brightness;
      }
    }
  }

  setSyncTolerance(value: number) {
    this.syncTolerance = Math.max(0.1, Math.min(0.5, value));
  }

  setTimeSpeed(value: number) {
    this.timeSpeed = Math.max(0.5, Math.min(3.0, value));
  }

  getBrightness(): number {
    return this.brightness;
  }

  getSyncTolerance(): number {
    return this.syncTolerance;
  }

  getTimeSpeed(): number {
    return this.timeSpeed;
  }

  setOnStatsUpdate(callback: (stats: StatsSnapshot) => void) {
    this.onStatsUpdate = callback;
  }

  handleClick(x: number, y: number) {
    this.ensureAudioStarted();
    const radius = 20;
    const affected: Firefly[] = [];
    for (const ff of this.fireflies) {
      const dx = ff.x - x;
      const dy = ff.y - y;
      if (dx * dx + dy * dy <= radius * radius) {
        affected.push(ff);
      }
    }
    if (affected.length > 0) {
      const targetPhase = affected[0].phase;
      const targetCycle = affected[0].cycleDuration;
      const now = performance.now() / 1000;
      this.clickSyncZones.push({
        x,
        y,
        radius,
        startTime: now,
        duration: 2,
        targetPhase,
        targetCycle,
      });
      for (const ff of affected) {
        ff.targetPhase = targetPhase;
        ff.targetCycleDuration = targetCycle;
        ff.isSyncing = true;
        ff.syncProgress = 0;
        ff.synchronizedAt = now + 2;
        ff.groupFlashTriggered = false;
      }
      this.triggerWaveSpread(x, y, targetPhase, targetCycle);
    }
  }

  private triggerWaveSpread(
    centerX: number,
    centerY: number,
    targetPhase: number,
    targetCycle: number
  ) {
    setTimeout(() => {
      const waveRadius = 60;
      for (const ff of this.fireflies) {
        if (ff.isSyncing) continue;
        const dx = ff.x - centerX;
        const dy = ff.y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= waveRadius && dist > 20) {
          ff.targetPhase = targetPhase;
          ff.targetCycleDuration = targetCycle;
          ff.isSyncing = true;
          ff.syncProgress = 0;
          ff.synchronizedAt = performance.now() / 1000 + 2;
          ff.groupFlashTriggered = false;
        }
      }
    }, 400);
    setTimeout(() => {
      const waveRadius = 120;
      for (const ff of this.fireflies) {
        if (ff.isSyncing) continue;
        const dx = ff.x - centerX;
        const dy = ff.y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= waveRadius && dist > 60) {
          ff.targetPhase = targetPhase;
          ff.targetCycleDuration = targetCycle;
          ff.isSyncing = true;
          ff.syncProgress = 0;
          ff.synchronizedAt = performance.now() / 1000 + 2;
          ff.groupFlashTriggered = false;
        }
      }
    }, 900);
  }

  handleDoubleClick(x: number, y: number) {
    this.ensureAudioStarted();
    const now = performance.now() / 1000;
    this.resonanceWaves.push({
      x,
      y,
      startTime: now,
      duration: 5,
      maxRadius: 300,
      width: 6,
    });
    this.playResonanceSound();
    this.applyResonanceEffect(x, y);
  }

  private applyResonanceEffect(centerX: number, centerY: number) {
    for (const ff of this.fireflies) {
      const dx = ff.x - centerX;
      const dy = ff.y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const delay = dist / 60;
      setTimeout(() => {
        ff.targetCycleDuration = 1.5;
        ff.cycleDuration = 1.5;
        ff.targetPhase = 0;
        ff.isSyncing = true;
        ff.syncProgress = 0;
        ff.syncedWithGroup = true;
        ff.synchronizedAt = performance.now() / 1000 + 2;
        ff.groupFlashTriggered = false;
        ff.targetMaxIntensity = 1.0;
        ff.maxIntensity = 1.0;
        ff.maxIntensityBoostTimer = 3;
      }, delay * 1000);
    }
  }

  handleMouseMove(x: number, y: number) {
    this.mouseX = x;
    this.mouseY = y;
    this.hoveredFirefly = null;
    for (const ff of this.fireflies) {
      const dx = ff.x - x;
      const dy = ff.y - y;
      const glow = 16 + ff.intensity * 24;
      if (dx * dx + dy * dy <= (ff.size + glow) * (ff.size + glow)) {
        this.hoveredFirefly = ff;
        break;
      }
    }
  }

  reset() {
    this.cycleProgress = 0.125;
    this.brightness = 0.8;
    this.syncTolerance = 0.2;
    this.timeSpeed = 1.0;
    this.resonanceWaves = [];
    this.clickSyncZones = [];
    this.hoveredFirefly = null;
    this.initFireflies();
    this.initStars();
  }

  start() {
    this.lastTime = performance.now();
    this.loop();
  }

  stop() {
    cancelAnimationFrame(this.animationId);
  }

  private loop() {
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;
    this.update(dt);
    this.render();
    this.emitStats();
    this.animationId = requestAnimationFrame(() => this.loop());
  }

  private getAmbientBrightness(): number {
    const t = this.cycleProgress * Math.PI * 2;
    return 0.5 + 0.5 * Math.cos(t);
  }

  private getSimTime(): string {
    const totalSeconds = this.cycleProgress * this.dayNightCycleDuration;
    const ratio = totalSeconds / this.dayNightCycleDuration;
    const hoursFromNoon = ratio * 24;
    let hours = Math.floor((12 + hoursFromNoon) % 24);
    const minutes = Math.floor(((hoursFromNoon % 1) * 60));
    const hh = hours.toString().padStart(2, '0');
    const mm = minutes.toString().padStart(2, '0');
    return `${hh}:${mm}`;
  }

  private emitStats() {
    if (!this.onStatsUpdate) return;
    const ambient = this.getAmbientBrightness();
    const isDay = ambient > 0.8;
    let activeCount = 0;
    let syncedCount = 0;
    for (const ff of this.fireflies) {
      if (!isDay || ff.intensity > 0.01) activeCount++;
      if (ff.syncedWithGroup || (ff.isSyncing && ff.syncProgress > 0.9)) {
        syncedCount++;
      }
    }
    this.onStatsUpdate({
      activeCount,
      syncRate: Math.round((syncedCount / this.fireflies.length) * 100),
      simTime: this.getSimTime(),
      currentBrightness: ambient,
    });
  }

  private update(dt: number) {
    const adjustedDt = dt * this.timeSpeed;
    this.cycleProgress = (this.cycleProgress + adjustedDt / this.dayNightCycleDuration) % 1;
    const ambient = this.getAmbientBrightness();
    const isDay = ambient > 0.8;
    const isNight = ambient < 0.2;
    const activityMultiplier = isNight ? 1.5 : 1.0;

    const now = performance.now() / 1000;
    const completedSyncGroups = new Map<string, Firefly[]>();

    for (const ff of this.fireflies) {
      if (ff.maxIntensityBoostTimer > 0) {
        ff.maxIntensityBoostTimer -= dt;
        if (ff.maxIntensityBoostTimer <= 0) {
          ff.targetMaxIntensity = this.brightness;
        }
      }
      ff.maxIntensity += (ff.targetMaxIntensity - ff.maxIntensity) * Math.min(1, dt * 3);

      if (ff.isSyncing) {
        ff.syncProgress = Math.min(1, ff.syncProgress + dt * 0.5);
        const sp = ff.syncProgress;
        ff.phase += (ff.targetPhase - ff.phase) * sp * Math.min(1, dt * 10);
        ff.cycleDuration += (ff.targetCycleDuration - ff.cycleDuration) * sp * Math.min(1, dt * 10);
        if (ff.syncProgress >= 1) {
          ff.isSyncing = false;
          ff.syncedWithGroup = true;
          const groupKey = `${ff.targetCycleDuration.toFixed(3)}_${(ff.targetPhase % (Math.PI * 2)).toFixed(3)}`;
          if (!completedSyncGroups.has(groupKey)) {
            completedSyncGroups.set(groupKey, []);
          }
          completedSyncGroups.get(groupKey)!.push(ff);
        }
      }

      ff.phase += (Math.PI * 2 * dt) / ff.cycleDuration;
      if (ff.phase > Math.PI * 2) ff.phase -= Math.PI * 2;

      let baseIntensity = (Math.sin(ff.phase - Math.PI / 2) + 1) / 2;
      baseIntensity = Math.pow(baseIntensity, 1.5);
      if (isDay) {
        ff.intensity = 0;
      } else {
        ff.intensity = baseIntensity * ff.maxIntensity;
      }

      const driftSpeed = 0.3 * activityMultiplier;
      ff.vx += (Math.random() - 0.5) * driftSpeed;
      ff.vy += (Math.random() - 0.5) * driftSpeed;
      ff.vx *= 0.98;
      ff.vy *= 0.98;
      ff.x += ff.vx * dt * 30 * activityMultiplier;
      ff.y += ff.vy * dt * 30 * activityMultiplier;

      const pullStrength = 0.005;
      ff.x += (ff.baseX - ff.x) * pullStrength;
      ff.y += (ff.baseY - ff.y) * pullStrength;

      ff.x = Math.max(20, Math.min(this.width - 20, ff.x));
      ff.y = Math.max(20, Math.min(this.height - 120, ff.y));

      if (ff.trail.length > 0) {
        for (const t of ff.trail) {
          t.life -= dt;
        }
        ff.trail = ff.trail.filter((t) => t.life > 0);
      }

      if (now - ff.lastTrailEmitTime > 0.05 && (Math.abs(ff.vx) > 2 || Math.abs(ff.vy) > 2)) {
        ff.trail.push({ x: ff.x, y: ff.y, life: 0.3 });
        ff.lastTrailEmitTime = now;
      }
    }

    for (const [, group] of completedSyncGroups) {
      if (group.length >= 3 && Math.random() < 0.2) {
        for (const ff of group) {
          if (!ff.groupFlashTriggered) {
            ff.groupFlashTriggered = true;
            setTimeout(() => {
              ff.phase = 0;
              ff.intensity = ff.maxIntensity;
            }, 0);
          }
        }
      }
    }

    for (const star of this.stars) {
      star.blinkPhase += star.blinkSpeed * dt;
    }

    this.clickSyncZones = this.clickSyncZones.filter((zone) => now - zone.startTime < zone.duration);
    this.resonanceWaves = this.resonanceWaves.filter(
      (wave) => now - wave.startTime < wave.duration
    );
  }

  private render() {
    const ctx = this.offscreenCtx;
    const ambient = this.getAmbientBrightness();

    const topDark = this.lerpColor(
      [0x0a, 0x0a, 0x2e],
      [0x4a, 0x5a, 0x8a],
      Math.max(0, (ambient - 0.5) * 2)
    );
    const botDark = this.lerpColor(
      [0x1a, 0x1a, 0x3e],
      [0x6a, 0x7a, 0xaa],
      Math.max(0, (ambient - 0.5) * 2)
    );

    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, `rgb(${topDark[0]},${topDark[1]},${topDark[2]})`);
    gradient.addColorStop(1, `rgb(${botDark[0]},${botDark[1]},${botDark[2]})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    this.renderStars(ctx);
    this.renderTrails(ctx);
    this.renderFireflies(ctx);
    this.renderResonanceWaves(ctx);
    this.renderHoverTooltip(ctx);

    this.ctx.drawImage(this.offscreenCanvas, 0, 0, this.width, this.height, 0, 0, this.width, this.height);
  }

  private lerpColor(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
    return [
      Math.round(a[0] + (b[0] - a[0]) * t),
      Math.round(a[1] + (b[1] - a[1]) * t),
      Math.round(a[2] + (b[2] - a[2]) * t),
    ];
  }

  private renderStars(ctx: CanvasRenderingContext2D) {
    for (const star of this.stars) {
      const alpha = 0.2 + 0.5 * (Math.sin(star.blinkPhase) * 0.5 + 0.5);
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private renderTrails(ctx: CanvasRenderingContext2D) {
    for (const ff of this.fireflies) {
      for (const t of ff.trail) {
        const alpha = (t.life / 0.3) * ff.intensity * 0.5;
        ctx.fillStyle = `rgba(144,238,144,${alpha})`;
        ctx.beginPath();
        ctx.arc(t.x, t.y, ff.size * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private renderFireflies(ctx: CanvasRenderingContext2D) {
    for (const ff of this.fireflies) {
      if (ff.intensity <= 0.01) continue;

      const glowRadius = 16 + ff.intensity * 24;
      const size = ff.size + ff.intensity * 2;

      const glow = ctx.createRadialGradient(ff.x, ff.y, 0, ff.x, ff.y, glowRadius);
      glow.addColorStop(0, `rgba(255,215,0,${0.5 * ff.intensity})`);
      glow.addColorStop(0.4, `rgba(255,215,0,${0.25 * ff.intensity})`);
      glow.addColorStop(1, 'rgba(255,215,0,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(ff.x, ff.y, glowRadius, 0, Math.PI * 2);
      ctx.fill();

      const coreAlpha = 0.8 + 0.2 * ff.intensity;
      const coreColor = ff.intensity > 0.9 ? '#FFFFCC' : '#FFD700';
      ctx.save();
      ctx.globalAlpha = coreAlpha;
      ctx.fillStyle = coreColor;
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 8 * ff.intensity;
      ctx.beginPath();
      ctx.arc(ff.x, ff.y, size * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private renderResonanceWaves(ctx: CanvasRenderingContext2D) {
    const now = performance.now() / 1000;
    for (const wave of this.resonanceWaves) {
      const elapsed = now - wave.startTime;
      const t = elapsed / wave.duration;
      if (t >= 1) continue;
      const radius = t * wave.maxRadius;
      const alpha = 0.7 * (1 - t);
      const width = wave.width;

      ctx.save();
      ctx.strokeStyle = `rgba(0,255,170,${alpha})`;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.arc(wave.x, wave.y, radius, 0, Math.PI * 2);
      ctx.stroke();

      if (radius > width) {
        const innerGlow = ctx.createRadialGradient(
          wave.x, wave.y, Math.max(0, radius - width * 3),
          wave.x, wave.y, radius
        );
        innerGlow.addColorStop(0, 'rgba(0,255,170,0)');
        innerGlow.addColorStop(1, `rgba(0,255,170,${alpha * 0.3})`);
        ctx.fillStyle = innerGlow;
        ctx.beginPath();
        ctx.arc(wave.x, wave.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private renderHoverTooltip(ctx: CanvasRenderingContext2D) {
    if (!this.hoveredFirefly) return;
    const ff = this.hoveredFirefly;
    const text1 = `亮度: ${(ff.intensity * 100).toFixed(0)}%`;
    const text2 = `周期: ${ff.cycleDuration.toFixed(2)}s`;
    const maxLen = Math.max(text1.length, text2.length) * 8.5;
    const boxW = maxLen + 20;
    const boxH = 44;
    let boxX = ff.x + 15;
    let boxY = ff.y - boxH - 10;
    if (boxX + boxW > this.width) boxX = ff.x - boxW - 15;
    if (boxY < 0) boxY = ff.y + 15;

    ctx.fillStyle = 'rgba(26,26,46,0.9)';
    ctx.strokeStyle = 'rgba(0,255,136,0.5)';
    ctx.lineWidth = 1;
    this.roundRect(ctx, boxX, boxY, boxW, boxH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '12px -apple-system, sans-serif';
    ctx.fillText(text1, boxX + 10, boxY + 17);
    ctx.fillText(text2, boxX + 10, boxY + 34);
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}

export type { StatsSnapshot };
