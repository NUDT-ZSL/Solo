import {
  Track,
  Marble,
  Particle,
  MarbleType,
  Point,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  EDIT_AREA_TOP,
  EDIT_AREA_BOTTOM,
  COLORS,
  MARBLE_COLORS,
  NODE_RADIUS,
  MARBLE_RADIUS,
  NODE_TRIGGER_FLASH,
  lerp,
} from './constants';

interface RGB {
  r: number;
  g: number;
  b: number;
}

function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

function rgbToString(rgb: RGB, alpha = 1): string {
  return `rgba(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)}, ${alpha})`;
}

function lerpRgb(a: RGB, b: RGB, t: number): RGB {
  return {
    r: lerp(a.r, b.r, t),
    g: lerp(a.g, b.g, t),
    b: lerp(a.b, b.b, t),
  };
}

const BG_DEFAULT = hexToRgb('#1A1A2E');
const BG_PURPLE = hexToRgb('#16213E');

const TYPE_BG_COLORS: Record<MarbleType, RGB> = {
  drum: hexToRgb('#3A0A1A'),
  bass: hexToRgb('#0A1A3A'),
  piano: hexToRgb('#0A2A1A'),
  synth: hexToRgb('#3A2A0A'),
};

export class RenderEngine {
  private ctx: CanvasRenderingContext2D;
  private tracks: Track[] = [];
  private marbles: Marble[] = [];
  private particles: Particle[] = [];
  private dominantType: MarbleType | null = null;
  private currentBgColor: RGB = { ...BG_DEFAULT };
  private targetBgColor: RGB = { ...BG_DEFAULT };
  private time = 0;
  private hoverNodeId: string | null = null;
  private selectedTrackId: string | null = null;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  setTracks(tracks: Track[]): void {
    this.tracks = tracks;
  }

  setMarbles(marbles: Marble[]): void {
    this.marbles = marbles;
  }

  setParticles(particles: Particle[]): void {
    this.particles = particles;
  }

  setDominantType(type: MarbleType | null): void {
    this.dominantType = type;
    if (type) {
      this.targetBgColor = TYPE_BG_COLORS[type];
    } else {
      this.targetBgColor = { ...BG_DEFAULT };
    }
  }

  setHoverNode(id: string | null): void {
    this.hoverNodeId = id;
  }

  setSelectedTrack(id: string | null): void {
    this.selectedTrackId = id;
  }

  private drawBackground(deltaMs: number): void {
    const ctx = this.ctx;
    this.time += deltaMs;

    this.currentBgColor = lerpRgb(this.currentBgColor, this.targetBgColor, 0.02);

    const centerX = CANVAS_WIDTH / 2 + Math.sin(this.time * 0.0003) * 80;
    const centerY = CANVAS_HEIGHT / 2 + Math.cos(this.time * 0.0004) * 60;

    const gradient = ctx.createRadialGradient(
      centerX,
      centerY,
      50,
      centerX,
      centerY,
      Math.max(CANVAS_WIDTH, CANVAS_HEIGHT)
    );
    gradient.addColorStop(0, rgbToString(lerpRgb(this.currentBgColor, BG_PURPLE, 0.3), 1));
    gradient.addColorStop(0.5, rgbToString(lerpRgb(this.currentBgColor, BG_PURPLE, 0.6), 1));
    gradient.addColorStop(1, rgbToString(BG_PURPLE, 1));

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.strokeStyle = 'rgba(0, 212, 255, 0.04)';
    ctx.lineWidth = 1;
    const gridSize = 50;
    for (let x = 0; x < CANVAS_WIDTH; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, EDIT_AREA_TOP);
      ctx.lineTo(x, EDIT_AREA_BOTTOM);
      ctx.stroke();
    }
    for (let y = EDIT_AREA_TOP; y < EDIT_AREA_BOTTOM; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(0, 212, 255, 0.15)';
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(0, EDIT_AREA_TOP);
    ctx.lineTo(CANVAS_WIDTH, EDIT_AREA_TOP);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private getCatmullRomPoint(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
    const t2 = t * t;
    const t3 = t2 * t;
    return {
      x:
        0.5 *
        (2 * p1.x +
          (-p0.x + p2.x) * t +
          (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
          (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
      y:
        0.5 *
        (2 * p1.y +
          (-p0.y + p2.y) * t +
          (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
          (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
    };
  }

  private drawTrack(track: Track, isSelected: boolean): void {
    const ctx = this.ctx;
    const nodes = track.nodes;
    if (nodes.length < 2) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.strokeStyle = 'rgba(0, 212, 255, 0.15)';
    ctx.lineWidth = 8;
    this.drawTrackCurve(nodes);

    ctx.shadowColor = COLORS.neonBlue;
    ctx.shadowBlur = isSelected ? 18 : 10;
    ctx.strokeStyle = isSelected ? '#66E5FF' : COLORS.track;
    ctx.lineWidth = 2;
    this.drawTrackCurve(nodes);

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  private drawTrackCurve(nodes: Point[]): void {
    const ctx = this.ctx;
    if (nodes.length < 2) return;

    const extended: Point[] = [nodes[0], ...nodes, nodes[nodes.length - 1]];

    ctx.beginPath();
    ctx.moveTo(nodes[0].x, nodes[0].y);

    for (let i = 0; i < extended.length - 3; i++) {
      const p0 = extended[i];
      const p1 = extended[i + 1];
      const p2 = extended[i + 2];
      const p3 = extended[i + 3];
      for (let t = 0; t <= 1; t += 0.05) {
        const pt = this.getCatmullRomPoint(p0, p1, p2, p3, t);
        ctx.lineTo(pt.x, pt.y);
      }
    }
    ctx.stroke();
  }

  private drawNodes(track: Track): void {
    const ctx = this.ctx;
    const now = performance.now();

    track.nodes.forEach((node, index) => {
      const isHover = this.hoverNodeId === node.id;
      const timeSinceTrigger = now - node.triggerTime;
      const isFlashing = node.triggered && timeSinceTrigger < NODE_TRIGGER_FLASH;
      const flashT = isFlashing ? 1 - timeSinceTrigger / NODE_TRIGGER_FLASH : 0;

      ctx.save();

      if (isFlashing) {
        const glowColor = node.triggerColor || '#FFFFFF';
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 25 * flashT;
      } else if (isHover) {
        ctx.shadowColor = COLORS.neonBlue;
        ctx.shadowBlur = 15;
      }

      const baseRadius = NODE_RADIUS;
      const radius = isFlashing ? baseRadius + 6 * flashT : isHover ? baseRadius + 3 : baseRadius;

      ctx.beginPath();
      ctx.arc(node.position.x, node.position.y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = isFlashing
        ? node.triggerColor || COLORS.nodeActive
        : isHover
          ? COLORS.nodeActive
          : COLORS.node;
      ctx.lineWidth = isFlashing ? 3 : 2;
      ctx.stroke();

      if (index === 0) {
        ctx.beginPath();
        ctx.arc(node.position.x, node.position.y, radius * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 212, 255, 0.6)';
        ctx.fill();
      }

      if (isFlashing) {
        ctx.beginPath();
        ctx.arc(node.position.x, node.position.y, radius + 8 * flashT, 0, Math.PI * 2);
        ctx.strokeStyle = node.triggerColor || '#FFFFFF';
        ctx.globalAlpha = flashT * 0.5;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      ctx.restore();
    });
  }

  private drawMarble(marble: Marble): void {
    const ctx = this.ctx;
    const colors = MARBLE_COLORS[marble.type];
    const pos = marble.position;
    const r = MARBLE_RADIUS;

    ctx.save();

    ctx.shadowColor = colors.glow;
    ctx.shadowBlur = 20;

    const gradient = ctx.createRadialGradient(
      pos.x - r * 0.35,
      pos.y - r * 0.35,
      r * 0.1,
      pos.x,
      pos.y,
      r
    );
    gradient.addColorStop(0, colors.light);
    gradient.addColorStop(0.5, colors.core);
    gradient.addColorStop(1, this.darkenColor(colors.core, 0.5));

    ctx.beginPath();
    ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.shadowBlur = 0;

    ctx.beginPath();
    ctx.arc(pos.x - r * 0.35, pos.y - r * 0.35, r * 0.25, 0, Math.PI * 2);
    const hi = ctx.createRadialGradient(
      pos.x - r * 0.35,
      pos.y - r * 0.35,
      0,
      pos.x - r * 0.35,
      pos.y - r * 0.35,
      r * 0.25
    );
    hi.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    hi.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = hi;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(pos.x, pos.y, r + 3, 0, Math.PI * 2);
    ctx.strokeStyle = colors.core;
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  private drawParticle(p: Particle): void {
    const ctx = this.ctx;
    const alpha = p.life / p.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private darkenColor(hex: string, factor: number): string {
    const rgb = hexToRgb(hex);
    return rgbToString({
      r: rgb.r * factor,
      g: rgb.g * factor,
      b: rgb.b * factor,
    });
  }

  render(deltaMs: number): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    this.drawBackground(deltaMs);

    for (const track of this.tracks) {
      this.drawTrack(track, track.id === this.selectedTrackId);
    }

    for (const track of this.tracks) {
      this.drawNodes(track);
    }

    for (const marble of this.marbles) {
      if (marble.active) this.drawMarble(marble);
    }

    for (const p of this.particles) {
      this.drawParticle(p);
    }
  }
}
