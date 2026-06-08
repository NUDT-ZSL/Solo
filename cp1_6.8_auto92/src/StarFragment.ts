type ColorStops = [string, string, string];

const FRAGMENT_COLORS: ColorStops[] = [
  ['#4fc3f7', '#7c4dff', '#e040fb'],
  ['#29b6f6', '#ab47bc', '#f48fb1'],
  ['#03a9f4', '#9c27b0', '#ff80ab'],
  ['#40c4ff', '#b388ff', '#ff80ab'],
  ['#80d8ff', '#ea80fc', '#f8bbd0'],
];

export interface FragmentState {
  x: number;
  y: number;
  radius: number;
  colorStops: ColorStops;
  phase: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  hovered: boolean;
  collected: boolean;
  collectTime: number;
  birthTime: number;
  targetX: number;
  targetY: number;
  startX: number;
  startY: number;
  driftDuration: number;
  driftProgress: number;
}

export class StarFragment {
  private canvasW: number;
  private canvasH: number;
  state: FragmentState;
  private static idCounter = 0;
  readonly id: number;

  constructor(canvasW: number, canvasH: number, now: number) {
    this.canvasW = canvasW;
    this.canvasH = canvasH;
    this.id = StarFragment.idCounter++;

    const edge = Math.floor(Math.random() * 4);
    let sx: number, sy: number;
    switch (edge) {
      case 0: sx = Math.random() * canvasW; sy = -20; break;
      case 1: sx = canvasW + 20; sy = Math.random() * canvasH; break;
      case 2: sx = Math.random() * canvasW; sy = canvasH + 20; break;
      default: sx = -20; sy = Math.random() * canvasH; break;
    }

    const tx = canvasW * (0.25 + Math.random() * 0.5);
    const ty = canvasH * (0.25 + Math.random() * 0.5);
    const driftDuration = 12000 + Math.random() * 8000;

    this.state = {
      x: sx,
      y: sy,
      radius: 8 + Math.random() * 6,
      colorStops: FRAGMENT_COLORS[Math.floor(Math.random() * FRAGMENT_COLORS.length)],
      phase: Math.random() * Math.PI * 2,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: 0.5 + Math.random() * 1.5,
      opacity: 1,
      hovered: false,
      collected: false,
      collectTime: 0,
      birthTime: now,
      targetX: tx,
      targetY: ty,
      startX: sx,
      startY: sy,
      driftDuration,
      driftProgress: 0,
    };
  }

  update(now: number, dt: number): void {
    const s = this.state;
    if (s.collected) {
      const elapsed = now - s.collectTime;
      const t = Math.min(elapsed / 500, 1);
      s.opacity = 1 - t;
      s.radius = (8 + Math.random() * 6) * (1 + t * 0.5);
      return;
    }

    const driftElapsed = now - s.birthTime;
    s.driftProgress = Math.min(driftElapsed / s.driftDuration, 1);
    const ease = 1 - Math.pow(1 - s.driftProgress, 3);
    s.x = s.startX + (s.targetX - s.startX) * ease;
    s.y = s.startY + (s.targetY - s.startY) * ease;

    s.phase += dt * 2.5;
    const rotMul = s.hovered ? 3 : 1;
    s.rotation += s.rotationSpeed * dt * rotMul;

    if (s.hovered) {
      s.radius = Math.min(s.radius + dt * 4, 20);
    } else {
      s.radius = Math.max(s.radius - dt * 4, 8);
    }
  }

  isDead(): boolean {
    return this.state.collected && this.state.opacity <= 0;
  }

  isNearTarget(): boolean {
    const s = this.state;
    const dx = s.x - s.targetX;
    const dy = s.y - s.targetY;
    return Math.sqrt(dx * dx + dy * dy) < 30;
  }

  draw(ctx: CanvasRenderingContext2D, now: number): void {
    const s = this.state;
    if (s.opacity <= 0) return;

    ctx.save();
    ctx.globalAlpha = s.opacity;
    ctx.translate(s.x, s.y);
    ctx.rotate(s.rotation);

    const breathe = 0.7 + 0.3 * Math.sin(s.phase);
    const r = s.radius * breathe;
    const glowR = r * 3;

    const glow = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, glowR);
    glow.addColorStop(0, s.colorStops[0] + 'aa');
    glow.addColorStop(0.4, s.colorStops[1] + '55');
    glow.addColorStop(1, s.colorStops[2] + '00');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, glowR, 0, Math.PI * 2);
    ctx.fill();

    const core = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    core.addColorStop(0, '#ffffff');
    core.addColorStop(0.3, s.colorStops[0]);
    core.addColorStop(0.7, s.colorStops[1]);
    core.addColorStop(1, s.colorStops[2] + '00');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  hitTest(mx: number, my: number): boolean {
    const s = this.state;
    if (s.collected) return false;
    const dx = mx - s.x;
    const dy = my - s.y;
    const hitR = s.radius * 2.5;
    return dx * dx + dy * dy < hitR * hitR;
  }
}
