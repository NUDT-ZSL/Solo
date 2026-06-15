export interface Vec2 {
  x: number;
  y: number;
}

export interface Lens {
  id: number;
  pos: Vec2;
  radius: number;
  focalLength: number;
  isDragging: boolean;
  initialPos: Vec2;
}

export interface Switch {
  id: number;
  pos: Vec2;
  width: number;
  height: number;
  activated: boolean;
  flashing: boolean;
  flashStartTime: number;
  hitStartTime: number;
  scale: number;
  scaleAnimStart: number;
}

export interface BeamSegment {
  start: Vec2;
  end: Vec2;
  refracted: boolean;
}

export interface RenderState {
  lenses: Lens[];
  switches: Switch[];
  beamSegments: BeamSegment[];
  lightSource: Vec2;
  victoryRingActive: boolean;
  victoryRingStartTime: number;
  currentTime: number;
  switchActivatedFlags: boolean[];
  allSwitchesActivated: boolean;
}

const CANVAS_W = 900;
const CANVAS_H = 600;

export class Renderer {
  private ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取Canvas 2D上下文');
    this.ctx = ctx;
  }

  render(state: RenderState): void {
    this.clear();
    this.drawBackground();
    this.drawBeams(state.beamSegments);
    this.drawLightSource(state.lightSource);
    this.drawSwitches(state.switches, state.currentTime);
    this.drawLenses(state.lenses);
    if (state.victoryRingActive) {
      this.drawVictoryRing(state.victoryRingStartTime, state.currentTime);
    }
  }

  private clear(): void {
    this.ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  }

  private drawBackground(): void {
    const gradient = this.ctx.createRadialGradient(
      CANVAS_W / 2, CANVAS_H / 2, 50,
      CANVAS_W / 2, CANVAS_H / 2, Math.max(CANVAS_W, CANVAS_H)
    );
    gradient.addColorStop(0, '#2C3E50');
    gradient.addColorStop(1, '#0F0F0F');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
    this.ctx.lineWidth = 1;
    for (let x = 0; x <= CANVAS_W; x += 40) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, CANVAS_H);
      this.ctx.stroke();
    }
    for (let y = 0; y <= CANVAS_H; y += 40) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(CANVAS_W, y);
      this.ctx.stroke();
    }
  }

  private drawLightSource(pos: Vec2): void {
    const glow = this.ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 20);
    glow.addColorStop(0, 'rgba(255, 220, 50, 0.8)');
    glow.addColorStop(0.5, 'rgba(255, 200, 0, 0.3)');
    glow.addColorStop(1, 'rgba(255, 180, 0, 0)');
    this.ctx.fillStyle = glow;
    this.ctx.beginPath();
    this.ctx.arc(pos.x, pos.y, 20, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#FFD700';
    this.ctx.shadowColor = '#FFD700';
    this.ctx.shadowBlur = 15;
    this.ctx.beginPath();
    this.ctx.arc(pos.x, pos.y, 8, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.shadowBlur = 0;
  }

  private drawBeams(segments: BeamSegment[]): void {
    for (const seg of segments) {
      this.ctx.save();
      this.ctx.setLineDash([6, 4]);
      this.ctx.lineWidth = 2;
      if (seg.refracted) {
        this.ctx.strokeStyle = 'rgba(255, 140, 0, 0.7)';
        this.ctx.shadowColor = 'rgba(255, 140, 0, 0.5)';
      } else {
        this.ctx.strokeStyle = 'rgba(255, 220, 80, 0.6)';
        this.ctx.shadowColor = 'rgba(255, 220, 80, 0.3)';
      }
      this.ctx.shadowBlur = 4;
      this.ctx.beginPath();
      this.ctx.moveTo(seg.start.x, seg.start.y);
      this.ctx.lineTo(seg.end.x, seg.end.y);
      this.ctx.stroke();
      this.ctx.restore();
    }
  }

  private drawLenses(lenses: Lens[]): void {
    for (const lens of lenses) {
      const focalLineLength = (lens.focalLength / 150) * 25 + 5;

      this.ctx.save();
      if (lens.isDragging) {
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 3;
        this.ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
        this.ctx.shadowBlur = 10;
      } else {
        this.ctx.strokeStyle = '#1A5276';
        this.ctx.lineWidth = 2;
      }
      this.ctx.fillStyle = 'rgba(74, 144, 217, 0.4)';
      this.ctx.beginPath();
      this.ctx.arc(lens.pos.x, lens.pos.y, lens.radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.stroke();
      this.ctx.restore();

      this.ctx.save();
      this.ctx.strokeStyle = lens.isDragging ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)';
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([3, 2]);
      this.ctx.beginPath();
      this.ctx.moveTo(lens.pos.x, lens.pos.y);
      this.ctx.lineTo(lens.pos.x + focalLineLength, lens.pos.y);
      this.ctx.stroke();
      this.ctx.restore();

      this.ctx.fillStyle = lens.isDragging ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)';
      this.ctx.font = 'bold 9px Courier New';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(`f=${Math.round(lens.focalLength)}`, lens.pos.x, lens.pos.y - lens.radius - 6);
    }
  }

  private drawSwitches(switches: Switch[], currentTime: number): void {
    for (const sw of switches) {
      let scale = 1;
      if (sw.scaleAnimStart > 0) {
        const elapsed = currentTime - sw.scaleAnimStart;
        if (elapsed < 300) {
          const t = elapsed / 150;
          if (t < 1) {
            scale = 1 - 0.2 * t;
          } else {
            scale = 0.8 + 0.2 * (t - 1);
          }
        } else {
          scale = 1;
          sw.scaleAnimStart = 0;
        }
      }

      let fillColor: string;
      let borderColor: string;
      if (sw.activated) {
        fillColor = '#C0392B';
        borderColor = '#922B21';
      } else if (sw.flashing) {
        const elapsed = currentTime - sw.flashStartTime;
        const period = 1000 / 0.3;
        const phase = (elapsed % period) / period;
        fillColor = phase < 0.5 ? '#27AE60' : '#E74C3C';
        borderColor = phase < 0.5 ? '#1E8449' : '#C0392B';
      } else {
        fillColor = '#27AE60';
        borderColor = '#1E8449';
      }

      const cx = sw.pos.x;
      const cy = sw.pos.y;
      const w = sw.width * scale;
      const h = sw.height * scale;
      const x = cx - w / 2;
      const y = cy - h / 2;
      const radius = 4;

      this.ctx.save();
      if (sw.activated) {
        this.ctx.shadowColor = '#FF4444';
        this.ctx.shadowBlur = 12;
      }
      this.ctx.fillStyle = fillColor;
      this.ctx.strokeStyle = borderColor;
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(x + radius, y);
      this.ctx.lineTo(x + w - radius, y);
      this.ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
      this.ctx.lineTo(x + w, y + h - radius);
      this.ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
      this.ctx.lineTo(x + radius, y + h);
      this.ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
      this.ctx.lineTo(x, y + radius);
      this.ctx.quadraticCurveTo(x, y, x + radius, y);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.stroke();
      this.ctx.restore();

      this.ctx.fillStyle = 'rgba(255,255,255,0.8)';
      this.ctx.font = 'bold 10px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(`S${sw.id}`, cx, cy + 3);
    }
  }

  private drawVictoryRing(startTime: number, currentTime: number): void {
    const duration = 2000;
    const elapsed = currentTime - startTime;
    if (elapsed >= duration) return;

    const t = elapsed / duration;
    const maxRadius = 350;
    const radius = maxRadius * t;
    const alpha = 0.7 * (1 - t);

    this.ctx.save();
    this.ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
    this.ctx.lineWidth = 8 * (1 - t) + 2;
    this.ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
    this.ctx.shadowBlur = 20;
    this.ctx.beginPath();
    this.ctx.arc(CANVAS_W / 2, CANVAS_H / 2, radius, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.restore();
  }
}

export function createInitialLenses(): Lens[] {
  return [
    {
      id: 1,
      pos: { x: 300, y: 250 },
      initialPos: { x: 300, y: 250 },
      radius: 30,
      focalLength: 100,
      isDragging: false
    },
    {
      id: 2,
      pos: { x: 550, y: 380 },
      initialPos: { x: 550, y: 380 },
      radius: 30,
      focalLength: 100,
      isDragging: false
    }
  ];
}

export function createInitialSwitches(): Switch[] {
  return [
    {
      id: 1,
      pos: { x: 750, y: 150 },
      width: 20,
      height: 30,
      activated: false,
      flashing: false,
      flashStartTime: 0,
      hitStartTime: 0,
      scale: 1,
      scaleAnimStart: 0
    },
    {
      id: 2,
      pos: { x: 800, y: 320 },
      width: 20,
      height: 30,
      activated: false,
      flashing: false,
      flashStartTime: 0,
      hitStartTime: 0,
      scale: 1,
      scaleAnimStart: 0
    },
    {
      id: 3,
      pos: { x: 700, y: 500 },
      width: 20,
      height: 30,
      activated: false,
      flashing: false,
      flashStartTime: 0,
      hitStartTime: 0,
      scale: 1,
      scaleAnimStart: 0
    }
  ];
}
