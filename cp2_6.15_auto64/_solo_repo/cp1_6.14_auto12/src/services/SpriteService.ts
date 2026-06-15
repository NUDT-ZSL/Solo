import { StorageService } from './StorageService';

export interface SpriteFrame {
  id: number;
  name: string;
  width: number;
  height: number;
  frames: number;
}

const LOCAL_SPRITES: SpriteFrame[] = [
  { id: 0, name: 'idle', width: 256, height: 256, frames: 4 },
  { id: 1, name: 'idle2', width: 256, height: 256, frames: 4 },
  { id: 2, name: 'idle3', width: 256, height: 256, frames: 4 },
  { id: 3, name: 'run', width: 256, height: 256, frames: 6 },
  { id: 4, name: 'run_left', width: 256, height: 256, frames: 6 },
  { id: 5, name: 'run_right', width: 256, height: 256, frames: 6 },
  { id: 6, name: 'jump', width: 256, height: 256, frames: 4 },
  { id: 7, name: 'jump_up', width: 256, height: 256, frames: 3 },
  { id: 8, name: 'jump_down', width: 256, height: 256, frames: 3 },
  { id: 9, name: 'double_jump', width: 256, height: 256, frames: 5 },
  { id: 10, name: 'attack', width: 256, height: 256, frames: 4 },
  { id: 11, name: 'attack2', width: 256, height: 256, frames: 4 },
  { id: 12, name: 'attack3', width: 256, height: 256, frames: 5 },
  { id: 13, name: 'attack_slash', width: 256, height: 256, frames: 5 },
  { id: 14, name: 'attack_thrust', width: 256, height: 256, frames: 4 },
  { id: 15, name: 'hurt', width: 256, height: 256, frames: 3 },
  { id: 16, name: 'hurt2', width: 256, height: 256, frames: 3 },
  { id: 17, name: 'die', width: 256, height: 256, frames: 5 },
  { id: 18, name: 'die2', width: 256, height: 256, frames: 5 },
  { id: 19, name: 'walk', width: 256, height: 256, frames: 6 },
  { id: 20, name: 'walk_left', width: 256, height: 256, frames: 6 },
  { id: 21, name: 'walk_right', width: 256, height: 256, frames: 6 },
  { id: 22, name: 'crouch', width: 256, height: 256, frames: 2 },
  { id: 23, name: 'crouch_walk', width: 256, height: 256, frames: 4 },
  { id: 24, name: 'dash', width: 256, height: 256, frames: 3 },
  { id: 25, name: 'roll', width: 256, height: 256, frames: 4 },
  { id: 26, name: 'block', width: 256, height: 256, frames: 2 },
  { id: 27, name: 'parry', width: 256, height: 256, frames: 3 },
  { id: 28, name: 'cast', width: 256, height: 256, frames: 5 },
  { id: 29, name: 'heal', width: 256, height: 256, frames: 4 },
];

const POSE_COLORS: Record<string, string> = {
  idle: '#6366f1',
  idle2: '#7c7ef5',
  idle3: '#8b8ff9',
  run: '#22c55e',
  run_left: '#2dd468',
  run_right: '#3de074',
  jump: '#f59e0b',
  jump_up: '#f7a82e',
  jump_down: '#f9b44d',
  double_jump: '#fbca6f',
  attack: '#ef4444',
  attack2: '#f25e5e',
  attack3: '#f57878',
  attack_slash: '#e03030',
  attack_thrust: '#d42020',
  hurt: '#f97316',
  hurt2: '#fb923c',
  die: '#dc2626',
  die2: '#b91c1c',
  walk: '#10b981',
  walk_left: '#34d399',
  walk_right: '#6ee7b7',
  crouch: '#8b5cf6',
  crouch_walk: '#a78bfa',
  dash: '#3b82f6',
  roll: '#60a5fa',
  block: '#64748b',
  parry: '#94a3b8',
  cast: '#8b5cf6',
  heal: '#22d3ee',
};

const spriteCanvasCache = new Map<number, HTMLCanvasElement>();

function generateSpriteCanvas(sprite: SpriteFrame): HTMLCanvasElement {
  if (spriteCanvasCache.has(sprite.id)) {
    return spriteCanvasCache.get(sprite.id)!;
  }

  const canvas = document.createElement('canvas');
  canvas.width = sprite.width * sprite.frames;
  canvas.height = sprite.height;
  const ctx = canvas.getContext('2d')!;
  const baseColor = POSE_COLORS[sprite.name] || '#6366f1';

  for (let f = 0; f < sprite.frames; f++) {
    const ox = f * sprite.width;
    const phase = f / sprite.frames;

    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(ox, 0, sprite.width, sprite.height);

    const cx = ox + sprite.width / 2;
    const cy = sprite.height / 2;

    ctx.fillStyle = baseColor;
    ctx.globalAlpha = 0.12;
    ctx.beginPath();
    ctx.arc(cx, cy, 80, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    const bodyOffsetY = Math.sin(phase * Math.PI * 2) * 4;
    const limbAngle = Math.sin(phase * Math.PI * 2) * 0.3;

    ctx.fillStyle = baseColor;
    ctx.beginPath();
    ctx.ellipse(cx, cy - 30 + bodyOffsetY, 18, 22, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy - 60 + bodyOffsetY, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = baseColor;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(cx - 14, cy - 10 + bodyOffsetY);
    ctx.lineTo(cx - 22 + Math.sin(limbAngle) * 8, cy + 15 + bodyOffsetY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx + 14, cy - 10 + bodyOffsetY);
    ctx.lineTo(cx + 22 - Math.sin(limbAngle) * 8, cy + 15 + bodyOffsetY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx - 6, cy + 10 + bodyOffsetY);
    ctx.lineTo(cx - 10 - Math.sin(limbAngle) * 6, cy + 45);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx + 6, cy + 10 + bodyOffsetY);
    ctx.lineTo(cx + 10 + Math.sin(limbAngle) * 6, cy + 45);
    ctx.stroke();

    if (sprite.name.includes('attack')) {
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 3;
      const swordAngle = -Math.PI / 4 + phase * Math.PI * 0.8;
      const sx = cx + 22;
      const sy = cy - 10 + bodyOffsetY;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + Math.cos(swordAngle) * 35, sy + Math.sin(swordAngle) * 35);
      ctx.stroke();
    }

    if (sprite.name.includes('jump')) {
      ctx.fillStyle = '#fbbf24';
      ctx.globalAlpha = 0.3 + phase * 0.2;
      ctx.beginPath();
      ctx.ellipse(cx, cy + 50, 20, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    if (sprite.name.includes('hurt') || sprite.name.includes('die')) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.6;
      for (let i = 0; i < 3; i++) {
        const angle = (i / 3) * Math.PI * 2 + phase * 2;
        const px = cx + Math.cos(angle) * 30;
        const py = cy - 30 + Math.sin(angle) * 30;
        ctx.beginPath();
        ctx.moveTo(px - 4, py - 4);
        ctx.lineTo(px + 4, py + 4);
        ctx.moveTo(px + 4, py - 4);
        ctx.lineTo(px - 4, py + 4);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.6;
    ctx.font = '10px monospace';
    ctx.fillText(`f${f}`, ox + 4, sprite.height - 4);
    ctx.globalAlpha = 1;
  }

  spriteCanvasCache.set(sprite.id, canvas);
  return canvas;
}

export const SpriteService = {
  async getAllSprites(): Promise<SpriteFrame[]> {
    try {
      const presets = await StorageService.listPresets();
      if (presets && presets.length > 0) {
        return presets as SpriteFrame[];
      }
    } catch {}
    return LOCAL_SPRITES;
  },

  getSpriteById(id: number): SpriteFrame | undefined {
    return LOCAL_SPRITES.find((s) => s.id === id);
  },

  generateSpriteCanvas,

  getRandomSprite(): SpriteFrame {
    const idx = Math.floor(Math.random() * LOCAL_SPRITES.length);
    return LOCAL_SPRITES[idx];
  },

  getLocalSprites(): SpriteFrame[] {
    return LOCAL_SPRITES;
  },

  getSpriteColor(name: string): string {
    return POSE_COLORS[name] || '#6366f1';
  },
};
