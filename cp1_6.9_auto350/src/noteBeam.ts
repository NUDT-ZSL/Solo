export interface Star {
  x: number;
  y: number;
  size: number;
  baseColor: string;
  color: string;
  opacity: number;
  phase: number;
  alive: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  opacity: number;
  life: number;
  maxLife: number;
}

export interface NoteConfig {
  key: string;
  noteName: string;
  frequency: number;
}

export const NOTE_CONFIGS: NoteConfig[] = [
  { key: 'a', noteName: 'C4', frequency: 261.63 },
  { key: 'b', noteName: 'C#4', frequency: 277.18 },
  { key: 'c', noteName: 'D4', frequency: 293.66 },
  { key: 'd', noteName: 'D#4', frequency: 311.13 },
  { key: 'e', noteName: 'E4', frequency: 329.63 },
  { key: 'f', noteName: 'F4', frequency: 349.23 },
  { key: 'g', noteName: 'F#4', frequency: 369.99 },
  { key: 'h', noteName: 'G4', frequency: 392.00 },
  { key: 'i', noteName: 'G#4', frequency: 415.30 },
  { key: 'j', noteName: 'A4', frequency: 440.00 },
  { key: 'k', noteName: 'A#4', frequency: 466.16 },
  { key: 'l', noteName: 'B4', frequency: 493.88 }
];

const COLOR_LOW = { r1: 74, g1: 0, b1: 224, r2: 142, g2: 45, b2: 226 };
const COLOR_HIGH = { r1: 255, g1: 81, b1: 47, r2: 240, g2: 152, b2: 25 };

export function lerpColor(t: number): { start: string; end: string } {
  const r1 = Math.round(COLOR_LOW.r1 + (COLOR_HIGH.r1 - COLOR_LOW.r1) * t);
  const g1 = Math.round(COLOR_LOW.g1 + (COLOR_HIGH.g1 - COLOR_LOW.g1) * t);
  const b1 = Math.round(COLOR_LOW.b1 + (COLOR_HIGH.b1 - COLOR_LOW.b1) * t);
  const r2 = Math.round(COLOR_LOW.r2 + (COLOR_HIGH.r2 - COLOR_LOW.r2) * t);
  const g2 = Math.round(COLOR_LOW.g2 + (COLOR_HIGH.g2 - COLOR_LOW.g2) * t);
  const b2 = Math.round(COLOR_LOW.b2 + (COLOR_HIGH.b2 - COLOR_LOW.b2) * t);
  return {
    start: `rgb(${r1}, ${g1}, ${b1})`,
    end: `rgb(${r2}, ${g2}, ${b2})`
  };
}

export class NoteBeam {
  key: string;
  noteName: string;
  frequency: number;
  x: number;
  y: number;
  width: number = 30;
  height: number;
  speed: number = 200;
  opacity: number = 1;
  colorStart: string;
  colorEnd: string;
  collided: boolean = false;
  active: boolean = true;
  overlapBoost: number = 0;

  constructor(key: string, noteName: string, frequency: number, x: number, canvasHeight: number) {
    this.key = key;
    this.noteName = noteName;
    this.frequency = frequency;
    this.x = x;
    this.y = canvasHeight;
    const minFreq = NOTE_CONFIGS[0].frequency;
    const maxFreq = NOTE_CONFIGS[NOTE_CONFIGS.length - 1].frequency;
    const t = (frequency - minFreq) / (maxFreq - minFreq);
    this.height = 150 + t * 150;
    const colors = lerpColor(t);
    this.colorStart = colors.start;
    this.colorEnd = colors.end;
  }

  update(deltaTime: number): void {
    if (!this.collided) {
      this.y -= this.speed * deltaTime;
      if (this.y + this.height <= 0) {
        this.active = false;
      }
    } else {
      this.opacity -= deltaTime * 2;
      if (this.opacity <= 0) {
        this.active = false;
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    const actualOpacity = Math.min(1, this.opacity + this.overlapBoost);
    ctx.globalAlpha = actualOpacity;

    const topY = this.y;
    const bottomY = this.y + this.height;

    const glowGradient = ctx.createLinearGradient(this.x, topY, this.x, bottomY);
    glowGradient.addColorStop(0, this.colorStart);
    glowGradient.addColorStop(1, this.colorEnd);

    ctx.shadowColor = this.colorStart;
    ctx.shadowBlur = 25;

    ctx.fillStyle = glowGradient;
    ctx.fillRect(this.x - this.width / 2, topY, this.width, this.height - topY);

    const trailGradient = ctx.createLinearGradient(this.x, bottomY - 30, this.x, bottomY + 30);
    trailGradient.addColorStop(0, this.colorEnd);
    trailGradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = trailGradient;
    ctx.fillRect(this.x - this.width / 2, bottomY - 30, this.width, 60);

    ctx.restore();
  }

  collisionCheck(stars: Star[]): Star | null {
    if (this.collided) return null;
    const beamTopX = this.x;
    const beamTopY = this.y;
    const beamHalfWidth = this.width / 2;

    for (const star of stars) {
      if (!star.alive) continue;
      const dx = Math.abs(beamTopX - star.x);
      const halfSize = star.size / 2;
      if (dx < beamHalfWidth + halfSize && beamTopY < star.y + halfSize && beamTopY + this.height > star.y - halfSize) {
        this.collided = true;
        this.opacity = 0;
        return star;
      }
    }
    return null;
  }
}
