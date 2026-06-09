export type GemType = 'fire' | 'water' | 'wind' | 'earth' | 'light' | 'dark';

export interface GemConfig {
  type: GemType;
  color: string;
  name: string;
  tentacleDelta: number;
  emotionDelta: number;
}

export interface GemSlot {
  config: GemConfig;
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  glowPhase: number;
  scale: number;
  targetScale: number;
}

export interface DraggingState {
  active: boolean;
  gemType: GemType | null;
  x: number;
  y: number;
  offsetX: number;
  offsetY: number;
}

export interface FlyingGem {
  active: boolean;
  gemType: GemType;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  progress: number;
  duration: number;
  controlX: number;
  controlY: number;
}

export const GEM_CONFIGS: Record<GemType, GemConfig> = {
  fire:  { type: 'fire',  color: '#FF6B35', name: '火', tentacleDelta: +1, emotionDelta: +15 },
  water: { type: 'water', color: '#4A90D9', name: '水', tentacleDelta: +1, emotionDelta: +15 },
  wind:  { type: 'wind',  color: '#20B2AA', name: '风', tentacleDelta: -1, emotionDelta: -10 },
  earth: { type: 'earth', color: '#8B4513', name: '土', tentacleDelta: -1, emotionDelta: -10 },
  light: { type: 'light', color: '#FFD700', name: '光', tentacleDelta: +1, emotionDelta: +25 },
  dark:  { type: 'dark',  color: '#6A0DAD', name: '暗', tentacleDelta: -1, emotionDelta: -20 }
};

export const GEM_ORDER: GemType[] = ['fire', 'water', 'wind', 'earth', 'light', 'dark'];

const GEM_SIZE = 40;
const GEM_SIZE_HOVER = 50;
const GLOW_PERIOD = 1.5;
const SCALE_SPEED = 1 / 0.2;
const FLY_DURATION = 0.4;

export class ElementGemSystem {
  private slots: GemSlot[] = [];
  public dragging: DraggingState = { active: false, gemType: null, x: 0, y: 0, offsetX: 0, offsetY: 0 };
  public flyingGem: FlyingGem = { active: false, gemType: 'fire', startX: 0, startY: 0, endX: 0, endY: 0, progress: 0, duration: FLY_DURATION, controlX: 0, controlY: 0 };
  private canvasWidth: number = 0;
  private canvasHeight: number = 0;
  private lastAbsorbed: GemType | null = null;

  constructor() {
    for (const type of GEM_ORDER) {
      this.slots.push({
        config: GEM_CONFIGS[type],
        x: 0,
        y: 0,
        baseX: 0,
        baseY: 0,
        glowPhase: Math.random() * Math.PI * 2,
        scale: 1,
        targetScale: 1
      });
    }
  }

  public resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.layoutSlots();
  }

  private layoutSlots(): void {
    const slotCount = this.slots.length;
    const spacing = Math.min(80, (this.canvasWidth - 160) / slotCount);
    const totalWidth = spacing * (slotCount - 1);
    const startX = (this.canvasWidth - totalWidth) / 2;
    const y = this.canvasHeight - 60;

    this.slots.forEach((slot, i) => {
      slot.baseX = startX + spacing * i;
      slot.baseY = y;
      if (!this.dragging.active || this.dragging.gemType !== slot.config.type) {
        slot.x = slot.baseX;
        slot.y = slot.baseY;
      }
    });
  }

  public getLastAbsorbed(): GemType | null {
    return this.lastAbsorbed;
  }

  public setLastAbsorbed(type: GemType): void {
    this.lastAbsorbed = type;
  }

  public getSlot(type: GemType): GemSlot | undefined {
    return this.slots.find(s => s.config.type === type);
  }

  public getAllSlots(): GemSlot[] {
    return this.slots;
  }

  public update(dt: number): void {
    for (const slot of this.slots) {
      slot.glowPhase += (Math.PI * 2 / GLOW_PERIOD) * dt;
      const scaleDiff = slot.targetScale - slot.scale;
      slot.scale += scaleDiff * Math.min(1, SCALE_SPEED * dt);
    }

    if (this.flyingGem.active) {
      this.flyingGem.progress += dt / this.flyingGem.duration;
      if (this.flyingGem.progress >= 1) {
        this.flyingGem.progress = 1;
        this.flyingGem.active = false;
        const slot = this.getSlot(this.flyingGem.gemType);
        if (slot) {
          slot.x = slot.baseX;
          slot.y = slot.baseY;
        }
      } else {
        const t = this.easeOutCubic(this.flyingGem.progress);
        const slot = this.getSlot(this.flyingGem.gemType);
        if (slot) {
          slot.x = this.quadraticBezier(this.flyingGem.startX, this.flyingGem.controlX, this.flyingGem.endX, t);
          slot.y = this.quadraticBezier(this.flyingGem.startY, this.flyingGem.controlY, this.flyingGem.endY, t);
        }
      }
    }
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private quadraticBezier(p0: number, p1: number, p2: number, t: number): number {
    return (1 - t) * (1 - t) * p0 + 2 * (1 - t) * t * p1 + t * t * p2;
  }

  public handleMouseDown(mx: number, my: number): boolean {
    for (const slot of this.slots) {
      if (this.flyingGem.active && this.flyingGem.gemType === slot.config.type) continue;
      const size = GEM_SIZE * slot.scale;
      const dx = mx - slot.x;
      const dy = my - slot.y;
      if (dx * dx + dy * dy <= (size / 2) * (size / 2)) {
        slot.targetScale = GEM_SIZE_HOVER / GEM_SIZE;
        this.dragging.active = true;
        this.dragging.gemType = slot.config.type;
        this.dragging.offsetX = 20;
        this.dragging.offsetY = 20;
        this.dragging.x = mx - this.dragging.offsetX;
        this.dragging.y = my - this.dragging.offsetY;
        return true;
      }
    }
    return false;
  }

  public handleMouseMove(mx: number, my: number): void {
    for (const slot of this.slots) {
      if (this.dragging.active && this.dragging.gemType === slot.config.type) continue;
      if (this.flyingGem.active && this.flyingGem.gemType === slot.config.type) continue;
      const size = GEM_SIZE;
      const dx = mx - slot.x;
      const dy = my - slot.y;
      slot.targetScale = dx * dx + dy * dy <= (size / 2) * (size / 2) ? GEM_SIZE_HOVER / GEM_SIZE : 1;
    }

    if (this.dragging.active) {
      this.dragging.x = mx - this.dragging.offsetX;
      this.dragging.y = my - this.dragging.offsetY;
      const slot = this.getSlot(this.dragging.gemType!);
      if (slot) {
        slot.x = this.dragging.x + GEM_SIZE_HOVER / 2;
        slot.y = this.dragging.y + GEM_SIZE_HOVER / 2;
      }
    }
  }

  public handleMouseUp(mx: number, my: number, spiritX: number, spiritY: number, spiritRadius: number): GemType | null {
    if (!this.dragging.active || !this.dragging.gemType) {
      return null;
    }

    const gemType = this.dragging.gemType;
    const slot = this.getSlot(gemType);
    const gemCenterX = slot ? slot.x : mx;
    const gemCenterY = slot ? slot.y : my;

    this.dragging.active = false;
    this.dragging.gemType = null;

    const dx = gemCenterX - spiritX;
    const dy = gemCenterY - spiritY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= spiritRadius + GEM_SIZE / 2) {
      if (slot) {
        slot.targetScale = 1;
      }
      this.lastAbsorbed = gemType;
      return gemType;
    } else {
      this.startFlyBack(gemType, gemCenterX, gemCenterY);
      return null;
    }
  }

  private startFlyBack(gemType: GemType, fromX: number, fromY: number): void {
    const slot = this.getSlot(gemType);
    if (!slot) return;
    slot.targetScale = 1;
    this.flyingGem.active = true;
    this.flyingGem.gemType = gemType;
    this.flyingGem.startX = fromX;
    this.flyingGem.startY = fromY;
    this.flyingGem.endX = slot.baseX;
    this.flyingGem.endY = slot.baseY;
    this.flyingGem.progress = 0;
    this.flyingGem.duration = FLY_DURATION;
    this.flyingGem.controlX = (fromX + slot.baseX) / 2 + (Math.random() - 0.5) * 100;
    this.flyingGem.controlY = Math.min(fromY, slot.baseY) - 60;
  }

  public render(ctx: CanvasRenderingContext2D): void {
    for (const slot of this.slots) {
      const size = GEM_SIZE * slot.scale;
      const glowAlpha = 0.3 + 0.3 * (0.5 + 0.5 * Math.sin(slot.glowPhase));
      const isDragging = this.dragging.active && this.dragging.gemType === slot.config.type;
      const alpha = isDragging ? 0.8 : 1;

      ctx.save();
      ctx.globalAlpha = alpha;

      ctx.shadowColor = slot.config.color;
      ctx.shadowBlur = 20 * glowAlpha;

      ctx.beginPath();
      ctx.arc(slot.x, slot.y, size / 2, 0, Math.PI * 2);
      const grad = ctx.createRadialGradient(slot.x - size / 6, slot.y - size / 6, 0, slot.x, slot.y, size / 2);
      grad.addColorStop(0, this.lightenColor(slot.config.color, 40));
      grad.addColorStop(0.6, slot.config.color);
      grad.addColorStop(1, this.darkenColor(slot.config.color, 30));
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.strokeStyle = `rgba(255,255,255,${0.2 + 0.2 * glowAlpha})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = `${Math.round(size * 0.45)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(slot.config.name, slot.x, slot.y);

      ctx.restore();
    }
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const h = hex.replace('#', '');
    return {
      r: parseInt(h.substring(0, 2), 16),
      g: parseInt(h.substring(2, 4), 16),
      b: parseInt(h.substring(4, 6), 16)
    };
  }

  private rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
  }

  private lightenColor(hex: string, percent: number): string {
    const { r, g, b } = this.hexToRgb(hex);
    return this.rgbToHex(r + (255 - r) * percent / 100, g + (255 - g) * percent / 100, b + (255 - b) * percent / 100);
  }

  private darkenColor(hex: string, percent: number): string {
    const { r, g, b } = this.hexToRgb(hex);
    return this.rgbToHex(r * (1 - percent / 100), g * (1 - percent / 100), b * (1 - percent / 100));
  }

  public getSlotGemSize(): number {
    return GEM_SIZE;
  }
}
