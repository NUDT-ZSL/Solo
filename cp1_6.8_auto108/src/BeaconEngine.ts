export interface Beacon {
  id: string;
  x: number;
  y: number;
  order: number;
  createdAt: number;
}

export interface HistoryEntry {
  type: 'add' | 'remove' | 'move' | 'insert';
  beacon: Beacon;
  prevX?: number;
  prevY?: number;
  insertIndex?: number;
}

export interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  twinkleSpeed: number;
  twinkleOffset: number;
}

type OnChangeCallback = () => void;

export class BeaconEngine {
  private beacons: Beacon[] = [];
  private history: HistoryEntry[] = [];
  private nextId = 1;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private stars: Star[] = [];
  private draggingBeacon: Beacon | null = null;
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  private hoveredBeacon: Beacon | null = null;
  private hoveredMidpoint: { x: number; y: number; afterIndex: number } | null = null;
  private onChangeCallbacks: OnChangeCallback[] = [];
  private breathPhase = 0;
  private animationId = 0;
  private particleTrail: import('./ParticleTrail').ParticleTrail | null = null;
  private dissipationParticles: DissipationParticle[] = [];
  private dpr = 1;
  private width = 0;
  private height = 0;

  getBeacons(): Beacon[] {
    return [...this.beacons];
  }

  getBeaconCount(): number {
    return this.beacons.length;
  }

  canUndo(): boolean {
    return this.history.length > 0;
  }

  onChange(cb: OnChangeCallback) {
    this.onChangeCallbacks.push(cb);
  }

  removeOnChange(cb: OnChangeCallback) {
    this.onChangeCallbacks = this.onChangeCallbacks.filter(c => c !== cb);
  }

  private notify() {
    this.onChangeCallbacks.forEach(cb => cb());
  }

  init(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.dpr = window.devicePixelRatio || 1;
    this.resize();
    this.generateStars();
    this.startLoop();
  }

  destroy() {
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this.handleResize);
  }

  resize = () => {
    if (!this.canvas) return;
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
    this.ctx!.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.generateStars();
  };

  private handleResize = () => {
    this.resize();
  };

  setParticleTrail(pt: import('./ParticleTrail').ParticleTrail) {
    this.particleTrail = pt;
  }

  private generateStars() {
    this.stars = [];
    const count = Math.floor((this.width * this.height) / 2000);
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: Math.random() * 1.8 + 0.2,
        opacity: Math.random() * 0.6 + 0.2,
        twinkleSpeed: Math.random() * 2 + 0.5,
        twinkleOffset: Math.random() * Math.PI * 2,
      });
    }
  }

  private startLoop() {
    window.addEventListener('resize', this.handleResize);
    const loop = (time: number) => {
      this.render(time);
      this.animationId = requestAnimationFrame(loop);
    };
    this.animationId = requestAnimationFrame(loop);
  }

  private render(time: number) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.clearRect(0, 0, w, h);

    this.drawBackground(ctx, w, h, time);
    this.drawStars(ctx, time);
    this.drawConnections(ctx, time);
    this.drawMidpointHint(ctx, time);
    this.drawBeacons(ctx, time);
    this.updateDissipationParticles(ctx);
    this.particleTrail?.render(ctx, this.beacons, time);
  }

  private drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
    const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
    grad.addColorStop(0, '#0f0f2e');
    grad.addColorStop(0.5, '#0a0a1e');
    grad.addColorStop(1, '#050510');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  private drawStars(ctx: CanvasRenderingContext2D, time: number) {
    const t = time / 1000;
    for (const star of this.stars) {
      const twinkle = Math.sin(t * star.twinkleSpeed + star.twinkleOffset) * 0.3 + 0.7;
      const alpha = star.opacity * twinkle;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200, 210, 255, ${alpha})`;
      ctx.fill();
    }
  }

  private drawConnections(ctx: CanvasRenderingContext2D, time: number) {
    if (this.beacons.length < 2) return;
    const t = time / 1000;
    this.breathPhase = t;
    const breathAlpha = 0.35 + Math.sin(t * 1.5) * 0.15;

    for (let i = 0; i < this.beacons.length - 1; i++) {
      const a = this.beacons[i];
      const b = this.beacons[i + 1];
      const cp = this.getControlPoint(a, b, i);

      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(cp.x, cp.y, b.x, b.y);

      ctx.strokeStyle = `rgba(120, 140, 255, ${breathAlpha})`;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.strokeStyle = `rgba(160, 120, 255, ${breathAlpha * 0.5})`;
      ctx.lineWidth = 6;
      ctx.stroke();

      ctx.strokeStyle = `rgba(180, 160, 255, ${breathAlpha * 0.15})`;
      ctx.lineWidth = 14;
      ctx.stroke();
    }
  }

  private getControlPoint(a: Beacon, b: Beacon, index: number): { x: number; y: number } {
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const offset = Math.min(dist * 0.15, 40) * (index % 2 === 0 ? 1 : -1);
    return { x: mx - dy / dist * offset, y: my + dx / dist * offset };
  }

  private drawBeacons(ctx: CanvasRenderingContext2D, time: number) {
    const t = time / 1000;
    for (const beacon of this.beacons) {
      const isHovered = this.hoveredBeacon?.id === beacon.id;
      const pulseScale = 1 + Math.sin(t * 2 + beacon.order) * 0.08;
      const baseRadius = 8;
      const radius = baseRadius * pulseScale;

      const outerGlow = ctx.createRadialGradient(beacon.x, beacon.y, 0, beacon.x, beacon.y, radius * 4);
      outerGlow.addColorStop(0, 'rgba(140, 120, 255, 0.25)');
      outerGlow.addColorStop(0.5, 'rgba(100, 140, 255, 0.08)');
      outerGlow.addColorStop(1, 'rgba(80, 100, 255, 0)');
      ctx.beginPath();
      ctx.arc(beacon.x, beacon.y, radius * 4, 0, Math.PI * 2);
      ctx.fillStyle = outerGlow;
      ctx.fill();

      const grad = ctx.createRadialGradient(beacon.x, beacon.y, 0, beacon.x, beacon.y, radius);
      grad.addColorStop(0, 'rgba(200, 190, 255, 0.95)');
      grad.addColorStop(0.4, 'rgba(140, 120, 255, 0.9)');
      grad.addColorStop(1, 'rgba(80, 60, 200, 0.6)');
      ctx.beginPath();
      ctx.arc(beacon.x, beacon.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      if (isHovered) {
        ctx.beginPath();
        ctx.arc(beacon.x, beacon.y, radius + 4, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(180, 160, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();

        this.drawLabel(ctx, beacon);
      }
    }
  }

  private drawLabel(ctx: CanvasRenderingContext2D, beacon: Beacon) {
    const label = `#${beacon.order + 1}`;
    ctx.font = '12px "SF Mono", "Cascadia Code", monospace';
    const metrics = ctx.measureText(label);
    const lx = beacon.x - metrics.width / 2;
    const ly = beacon.y - 24;

    ctx.fillStyle = 'rgba(20, 15, 50, 0.7)';
    const padding = 4;
    ctx.beginPath();
    ctx.roundRect(lx - padding, ly - 12, metrics.width + padding * 2, 16, 4);
    ctx.fill();

    ctx.fillStyle = 'rgba(200, 190, 255, 0.9)';
    ctx.fillText(label, lx, ly);
  }

  private drawMidpointHint(ctx: CanvasRenderingContext2D, time: number) {
    if (!this.hoveredMidpoint) return;
    const t = time / 1000;
    const mp = this.hoveredMidpoint;
    const pulse = 1 + Math.sin(t * 3) * 0.2;

    ctx.beginPath();
    ctx.arc(mp.x, mp.y, 6 * pulse, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(180, 160, 255, 0.4)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(mp.x, mp.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(220, 210, 255, 0.8)';
    ctx.fill();
  }

  addBeacon(x: number, y: number) {
    const beacon: Beacon = {
      id: `beacon_${this.nextId++}`,
      x,
      y,
      order: this.beacons.length,
      createdAt: Date.now(),
    };
    this.beacons.push(beacon);
    this.history.push({ type: 'add', beacon });
    this.notify();
  }

  insertBeacon(x: number, y: number, afterIndex: number) {
    const beacon: Beacon = {
      id: `beacon_${this.nextId++}`,
      x,
      y,
      order: afterIndex + 1,
      createdAt: Date.now(),
    };
    this.beacons.splice(afterIndex + 1, 0, beacon);
    this.reorder();
    this.history.push({ type: 'insert', beacon, insertIndex: afterIndex + 1 });
    this.notify();
  }

  removeBeacon(id: string) {
    const idx = this.beacons.findIndex(b => b.id === id);
    if (idx === -1) return;
    const beacon = this.beacons[idx];
    this.spawnDissipation(beacon.x, beacon.y);
    this.beacons.splice(idx, 1);
    this.reorder();
    this.history.push({ type: 'remove', beacon });
    this.notify();
  }

  undo() {
    if (this.history.length === 0) return;
    const entry = this.history.pop()!;
    switch (entry.type) {
      case 'add': {
        const idx = this.beacons.findIndex(b => b.id === entry.beacon.id);
        if (idx !== -1) this.beacons.splice(idx, 1);
        break;
      }
      case 'remove': {
        this.beacons.push(entry.beacon);
        break;
      }
      case 'move': {
        const beacon = this.beacons.find(b => b.id === entry.beacon.id);
        if (beacon) {
          beacon.x = entry.prevX!;
          beacon.y = entry.prevY!;
        }
        break;
      }
      case 'insert': {
        const idx = this.beacons.findIndex(b => b.id === entry.beacon.id);
        if (idx !== -1) this.beacons.splice(idx, 1);
        break;
      }
    }
    this.reorder();
    this.notify();
  }

  clearAll() {
    this.beacons = [];
    this.history = [];
    this.dissipationParticles = [];
    this.notify();
  }

  exportJSON(): string {
    return JSON.stringify(
      {
        name: '流萤信标路径',
        exportedAt: new Date().toISOString(),
        beacons: this.beacons.map((b, i) => ({
          index: i + 1,
          x: Math.round(b.x * 100) / 100,
          y: Math.round(b.y * 100) / 100,
        })),
        pathLength: this.calculateTotalLength(),
      },
      null,
      2
    );
  }

  private calculateTotalLength(): number {
    let total = 0;
    for (let i = 0; i < this.beacons.length - 1; i++) {
      const a = this.beacons[i];
      const b = this.beacons[i + 1];
      total += Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
    }
    return Math.round(total * 100) / 100;
  }

  private reorder() {
    this.beacons.forEach((b, i) => (b.order = i));
  }

  private spawnDissipation(x: number, y: number) {
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20 + Math.random() * 0.3;
      const speed = 1.5 + Math.random() * 2;
      this.dissipationParticles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: 0.015 + Math.random() * 0.01,
        size: 2 + Math.random() * 2,
      });
    }
  }

  private updateDissipationParticles(ctx: CanvasRenderingContext2D) {
    for (let i = this.dissipationParticles.length - 1; i >= 0; i--) {
      const p = this.dissipationParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.life -= p.decay;

      if (p.life <= 0) {
        this.dissipationParticles.splice(i, 1);
        continue;
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(160, 140, 255, ${p.life * 0.8})`;
      ctx.fill();
    }
  }

  handleMouseDown(x: number, y: number): 'beacon' | 'midpoint' | 'empty' | null {
    const beaconHit = this.hitTestBeacon(x, y);
    if (beaconHit) {
      this.draggingBeacon = beaconHit;
      this.dragOffsetX = x - beaconHit.x;
      this.dragOffsetY = y - beaconHit.y;
      return 'beacon';
    }

    const midHit = this.hitTestMidpoint(x, y);
    if (midHit) {
      this.insertBeacon(x, y, midHit.afterIndex);
      this.hoveredMidpoint = null;
      return 'midpoint';
    }

    return 'empty';
  }

  handleMouseMove(x: number, y: number) {
    if (this.draggingBeacon) {
      const prevX = this.draggingBeacon.x;
      const prevY = this.draggingBeacon.y;
      this.draggingBeacon.x = x - this.dragOffsetX;
      this.draggingBeacon.y = y - this.dragOffsetY;

      if (!this.history.length || this.history[this.history.length - 1].type !== 'move' || this.history[this.history.length - 1].beacon.id !== this.draggingBeacon.id) {
        this.history.push({
          type: 'move',
          beacon: { ...this.draggingBeacon },
          prevX,
          prevY,
        });
      } else {
        const last = this.history[this.history.length - 1];
        last.prevX = prevX;
        last.prevY = prevY;
      }
      this.notify();
      return;
    }

    const beaconHit = this.hitTestBeacon(x, y);
    this.hoveredBeacon = beaconHit;
    this.hoveredMidpoint = beaconHit ? null : this.hitTestMidpoint(x, y);

    if (this.canvas) {
      this.canvas.style.cursor = beaconHit ? 'pointer' : this.hoveredMidpoint ? 'crosshair' : 'default';
    }
  }

  handleMouseUp() {
    this.draggingBeacon = null;
  }

  handleClick(x: number, y: number) {
    const beaconHit = this.hitTestBeacon(x, y);
    if (beaconHit) {
      this.removeBeacon(beaconHit.id);
      return;
    }
  }

  private hitTestBeacon(x: number, y: number): Beacon | null {
    for (let i = this.beacons.length - 1; i >= 0; i--) {
      const b = this.beacons[i];
      const dist = Math.sqrt((x - b.x) ** 2 + (y - b.y) ** 2);
      if (dist < 16) return b;
    }
    return null;
  }

  private hitTestMidpoint(x: number, y: number): { x: number; y: number; afterIndex: number } | null {
    for (let i = 0; i < this.beacons.length - 1; i++) {
      const a = this.beacons[i];
      const b = this.beacons[i + 1];
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const dist = Math.sqrt((x - mx) ** 2 + (y - my) ** 2);
      if (dist < 14) {
        return { x: mx, y: my, afterIndex: i };
      }
    }
    return null;
  }

  handleTouchStart(x: number, y: number) {
    return this.handleMouseDown(x, y);
  }

  handleTouchMove(x: number, y: number) {
    this.handleMouseMove(x, y);
  }

  handleTouchEnd() {
    this.handleMouseUp();
  }
}

interface DissipationParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  decay: number;
  size: number;
}
