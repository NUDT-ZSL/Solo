import {
  Rune,
  RuneType,
  RUNE_CONFIG,
  Slot,
  Particle,
  Spirit,
  SpiritType,
  SPIRIT_TYPE_MAP,
  SPIRIT_CONFIG,
  getRuneLevelColor
} from './entities';

export class GameManager {
  public slots: Slot[] = [];
  public runePool: Rune[] = [];
  public particles: Particle[] = [];
  public spirits: Spirit[] = [];
  public summonedSpirits: Spirit[] = [];
  public draggingRune: Rune | null = null;
  public mouseX: number = 0;
  public mouseY: number = 0;
  public canvasWidth: number = 0;
  public canvasHeight: number = 0;
  public flashColor: string | null = null;
  public flashTimer: number = 0;
  public isSynthesizing: boolean = false;

  private runeIdCounter: number = 0;
  private spiritIdCounter: number = 0;
  private readonly MAX_PARTICLES: number = 200;
  private readonly DRAG_PARTICLES: number = 50;
  private readonly SLOT_COUNT: number = 6;
  private readonly POOL_SIZE: number = 10;
  private readonly SLOT_SIZE: number = 60;
  private readonly SLOT_GAP: number = 8;
  private readonly SLOT_PANEL_BOTTOM: number = 40;
  private readonly POOL_PANEL_WIDTH: number = 160;
  private readonly POOL_PANEL_RIGHT: number = 20;
  private readonly DEX_PANEL_WIDTH: number = 220;

  constructor(width: number, height: number) {
    this.resize(width, height);
    this.initSlots();
    this.initRunePool();
  }

  public resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.initSlots();
    this.updateRunePoolPositions();
  }

  private initSlots(): void {
    this.slots = [];
    const totalWidth = this.SLOT_COUNT * this.SLOT_SIZE + (this.SLOT_COUNT - 1) * this.SLOT_GAP;
    const startX = (this.canvasWidth - this.DEX_PANEL_WIDTH - this.POOL_PANEL_WIDTH - this.POOL_PANEL_RIGHT * 2 - totalWidth) / 2
      + this.POOL_PANEL_WIDTH + this.POOL_PANEL_RIGHT * 2;
    const y = this.canvasHeight - this.SLOT_PANEL_BOTTOM - this.SLOT_SIZE - 20;

    for (let i = 0; i < this.SLOT_COUNT; i++) {
      const x = startX + i * (this.SLOT_SIZE + this.SLOT_GAP);
      const existingRune = this.slots[i]?.rune || null;
      this.slots.push({
        x,
        y,
        width: this.SLOT_SIZE,
        height: this.SLOT_SIZE,
        rune: existingRune
      });
      if (existingRune) {
        existingRune.targetX = x + this.SLOT_SIZE / 2;
        existingRune.targetY = y + this.SLOT_SIZE / 2;
      }
    }
  }

  private initRunePool(): void {
    this.runePool = [];
    for (let i = 0; i < this.POOL_SIZE; i++) {
      this.runePool.push(this.createRandomRune(-100, -100, false));
    }
    this.updateRunePoolPositions();
  }

  private updateRunePoolPositions(): void {
    const poolX = this.canvasWidth - this.DEX_PANEL_WIDTH - this.POOL_PANEL_WIDTH - this.POOL_PANEL_RIGHT;
    const poolY = 40;
    const runeSize = 50;
    const gap = 10;
    const cols = 2;

    this.runePool.forEach((rune, index) => {
      if (rune.isDragging || rune.isInSlot || rune.isFlying) return;
      const col = index % cols;
      const row = Math.floor(index / cols);
      rune.targetX = poolX + 30 + col * (runeSize + gap) + runeSize / 2;
      rune.targetY = poolY + 30 + row * (runeSize + gap) + runeSize / 2;
      rune.x = rune.targetX;
      rune.y = rune.targetY;
    });
  }

  private createRandomRune(x: number, y: number, isInSlot: boolean): Rune {
    const types = Object.values(RuneType);
    const type = types[Math.floor(Math.random() * types.length)];
    const level = Math.floor(Math.random() * 3) + 1;
    return {
      id: this.runeIdCounter++,
      type,
      level,
      x,
      y,
      targetX: x,
      targetY: y,
      scale: 1,
      targetScale: 1,
      isDragging: false,
      isFlying: false,
      flyProgress: 0,
      flyStartX: 0,
      flyStartY: 0,
      flyEndX: 0,
      flyEndY: 0,
      flashCount: 0,
      flashTimer: 0,
      isInSlot,
      slotIndex: null,
      animationTime: 0
    };
  }

  public getSlotPanelBounds(): { x: number; y: number; width: number; height: number } {
    const totalWidth = this.SLOT_COUNT * this.SLOT_SIZE + (this.SLOT_COUNT - 1) * this.SLOT_GAP + 40;
    const x = (this.canvasWidth - this.DEX_PANEL_WIDTH - this.POOL_PANEL_WIDTH - this.POOL_PANEL_RIGHT * 2 - totalWidth) / 2
      + this.POOL_PANEL_WIDTH + this.POOL_PANEL_RIGHT * 2 - 20;
    const y = this.canvasHeight - this.SLOT_PANEL_BOTTOM - this.SLOT_SIZE - 40;
    return { x, y, width: totalWidth, height: this.SLOT_SIZE + 60 };
  }

  public getPoolPanelBounds(): { x: number; y: number; width: number; height: number } {
    const x = this.canvasWidth - this.DEX_PANEL_WIDTH - this.POOL_PANEL_WIDTH - this.POOL_PANEL_RIGHT;
    const y = 20;
    return { x, y, width: this.POOL_PANEL_WIDTH, height: 380 };
  }

  public getDexPanelBounds(): { x: number; y: number; width: number; height: number } {
    const x = this.canvasWidth - this.DEX_PANEL_WIDTH - 10;
    const y = 20;
    return { x, y, width: this.DEX_PANEL_WIDTH, height: this.canvasHeight - 40 };
  }

  public onMouseDown(x: number, y: number): void {
    for (let i = this.runePool.length - 1; i >= 0; i--) {
      const rune = this.runePool[i];
      if (!rune.isInSlot && !rune.isFlying && this.hitTestRune(rune, x, y)) {
        this.startDrag(rune, x, y);
        return;
      }
    }
    for (let i = this.slots.length - 1; i >= 0; i--) {
      const rune = this.slots[i].rune;
      if (rune && !rune.isFlying && this.hitTestRune(rune, x, y)) {
        this.startDrag(rune, x, y);
        return;
      }
    }
  }

  private hitTestRune(rune: Rune, x: number, y: number): boolean {
    const size = 25 * rune.scale;
    return x >= rune.x - size && x <= rune.x + size && y >= rune.y - size && y <= rune.y + size;
  }

  private startDrag(rune: Rune, x: number, y: number): void {
    if (rune.isInSlot && rune.slotIndex !== null) {
      this.slots[rune.slotIndex].rune = null;
      rune.isInSlot = false;
      rune.slotIndex = null;
    }
    rune.isDragging = true;
    rune.targetScale = 1.1;
    this.draggingRune = rune;
    this.mouseX = x;
    this.mouseY = y;
  }

  public onMouseMove(x: number, y: number): void {
    this.mouseX = x;
    this.mouseY = y;
    if (this.draggingRune) {
      this.draggingRune.x = x;
      this.draggingRune.y = y;
      if (this.particles.length < this.DRAG_PARTICLES) {
        this.addDragParticle();
      }
    }
  }

  private addDragParticle(): void {
    if (!this.draggingRune) return;
    const color = getRuneLevelColor(this.draggingRune.level);
    this.particles.push({
      x: this.draggingRune.x + (Math.random() - 0.5) * 20,
      y: this.draggingRune.y + (Math.random() - 0.5) * 20,
      vx: (Math.random() - 0.5) * 40,
      vy: (Math.random() - 0.5) * 40,
      radius: Math.random() * 2 + 1,
      color,
      life: 0.5,
      maxLife: 0.5
    });
  }

  public onMouseUp(x: number, y: number): void {
    if (!this.draggingRune) return;
    const rune = this.draggingRune;
    rune.isDragging = false;
    rune.targetScale = 1;

    let placed = false;
    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      if (!slot.rune && this.hitTestSlot(slot, x, y)) {
        this.placeRuneInSlot(rune, i);
        placed = true;
        break;
      }
    }

    if (!placed) {
      this.rejectRune(rune);
    }

    this.draggingRune = null;
  }

  private hitTestSlot(slot: Slot, x: number, y: number): boolean {
    return x >= slot.x && x <= slot.x + slot.width && y >= slot.y && y <= slot.y + slot.height;
  }

  private placeRuneInSlot(rune: Rune, slotIndex: number): void {
    const slot = this.slots[slotIndex];
    rune.isInSlot = true;
    rune.slotIndex = slotIndex;
    rune.targetX = slot.x + slot.width / 2;
    rune.targetY = slot.y + slot.height / 2;
    rune.targetScale = 0.85;
    rune.animationTime = 0.3;
    slot.rune = rune;
    setTimeout(() => this.checkSynthesis(), 350);
  }

  private rejectRune(rune: Rune): void {
    rune.flashCount = 2;
    rune.flashTimer = 0.3;
    if (!rune.isInSlot) {
      const idx = this.runePool.findIndex(r => r.id === rune.id);
      if (idx === -1) {
        this.runePool.push(rune);
      }
    }
  }

  private checkSynthesis(): void {
    if (this.isSynthesizing) return;

    const runeGroups: Map<string, Rune[]> = new Map();
    for (let i = 0; i < this.slots.length; i++) {
      const rune = this.slots[i].rune;
      if (rune && !rune.isFlying) {
        const key = `${rune.type}-${rune.level}`;
        if (!runeGroups.has(key)) runeGroups.set(key, []);
        runeGroups.get(key)!.push(rune);
      }
    }

    for (const [, runes] of runeGroups) {
      if (runes.length >= 3) {
        this.synthesize(runes.slice(0, 3));
        return;
      }
    }
  }

  private synthesize(runes: Rune[]): void {
    this.isSynthesizing = true;
    const centerX = (this.canvasWidth - this.DEX_PANEL_WIDTH) / 2;
    const centerY = this.canvasHeight / 2 - 50;
    const type = runes[0].type;
    const newLevel = runes[0].level + 1;

    const avgColor = this.averageColors(runes.map(r => RUNE_CONFIG[r.type].color));
    this.flashColor = avgColor;
    this.flashTimer = 1;

    runes.forEach((rune, i) => {
      if (rune.slotIndex !== null) {
        this.slots[rune.slotIndex].rune = null;
      }
      rune.isFlying = true;
      rune.flyProgress = 0;
      rune.flyStartX = rune.x;
      rune.flyStartY = rune.y;
      rune.flyEndX = centerX + (i - 1) * 20;
      rune.flyEndY = centerY;
    });

    setTimeout(() => {
      this.createExplosion(centerX, centerY, avgColor);
      const newRune = this.createRandomRune(centerX, centerY, false);
      newRune.type = type;
      newRune.level = newLevel;
      newRune.scale = 0;
      newRune.targetScale = 1;
      this.runePool.push(newRune);

      this.summonSpirit(type, centerX, centerY);

      runes.forEach(r => {
        const idx = this.runePool.findIndex(rr => rr.id === r.id);
        if (idx !== -1) this.runePool.splice(idx, 1);
      });

      setTimeout(() => {
        this.isSynthesizing = false;
        this.updateRunePoolPositions();
      }, 1000);
    }, 600);
  }

  private averageColors(colors: string[]): string {
    let r = 0, g = 0, b = 0;
    colors.forEach(c => {
      r += parseInt(c.slice(1, 3), 16);
      g += parseInt(c.slice(3, 5), 16);
      b += parseInt(c.slice(5, 7), 16);
    });
    r = Math.floor(r / colors.length);
    g = Math.floor(g / colors.length);
    b = Math.floor(b / colors.length);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  private createExplosion(x: number, y: number, color: string): void {
    const count = Math.min(30, this.MAX_PARTICLES - this.particles.length);
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 100 + Math.random() * 100;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: Math.random() * 4 + 2,
        color,
        life: 0.8,
        maxLife: 0.8
      });
    }
  }

  private summonSpirit(runeType: RuneType, x: number, y: number): void {
    let spiritType: SpiritType = SPIRIT_TYPE_MAP[runeType];
    if (runeType === RuneType.LIGHT) {
      spiritType = [SpiritType.FIRE_SPIRIT, SpiritType.WIND_SPIRIT][Math.floor(Math.random() * 2)];
    } else if (runeType === RuneType.DARK) {
      spiritType = [SpiritType.WATER_SPIRIT, SpiritType.EARTH_SPIRIT][Math.floor(Math.random() * 2)];
    }

    const config = SPIRIT_CONFIG[spiritType];
    const spirit: Spirit = {
      id: this.spiritIdCounter++,
      type: spiritType,
      x,
      y,
      targetX: x,
      targetY: y,
      opacity: 0,
      rotation: 0,
      scale: 0,
      isSummoning: true,
      summonProgress: 0,
      animationFrame: 0,
      animationTime: 0
    };
    this.spirits.push(spirit);

    setTimeout(() => {
      const idx = this.summonedSpirits.findIndex(s => s.type === spirit.type);
      if (idx === -1) {
        this.summonedSpirits.push(spirit);
      }
    }, 2000);
  }

  public update(deltaTime: number): void {
    if (this.flashTimer > 0) {
      this.flashTimer -= deltaTime;
      if (this.flashTimer <= 0) this.flashColor = null;
    }

    this.updateRunes(deltaTime);
    this.updateParticles(deltaTime);
    this.updateSpirits(deltaTime);
  }

  private updateRunes(deltaTime: number): void {
    const allRunes = [...this.runePool, ...this.slots.map(s => s.rune).filter((r): r is Rune => r !== null)];
    allRunes.forEach(rune => {
      if (rune.isDragging) return;

      if (rune.isFlying) {
        rune.flyProgress += deltaTime / 0.6;
        if (rune.flyProgress >= 1) {
          rune.flyProgress = 1;
        }
        const t = rune.flyProgress;
        const arcHeight = 100 * Math.sin(Math.PI * t);
        rune.x = rune.flyStartX + (rune.flyEndX - rune.flyStartX) * t;
        rune.y = rune.flyStartY + (rune.flyEndY - rune.flyStartY) * t - arcHeight;
        rune.scale = 1 - t * 0.5;
      } else {
        rune.x += (rune.targetX - rune.x) * Math.min(1, deltaTime * 10);
        rune.y += (rune.targetY - rune.y) * Math.min(1, deltaTime * 10);
      }

      if (rune.animationTime > 0) {
        rune.animationTime -= deltaTime;
        const bounce = Math.sin(rune.animationTime * 20) * 0.1 * Math.max(0, rune.animationTime / 0.3);
        rune.scale = rune.targetScale + bounce;
      } else {
        rune.scale += (rune.targetScale - rune.scale) * Math.min(1, deltaTime * 8);
      }

      if (rune.flashTimer > 0) {
        rune.flashTimer -= deltaTime;
        if (rune.flashTimer <= 0 && rune.flashCount > 0) {
          rune.flashCount--;
          if (rune.flashCount > 0) rune.flashTimer = 0.3;
        }
      }
    });
  }

  private updateParticles(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      p.vx *= 0.98;
      p.vy *= 0.98;
      p.life -= deltaTime;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
    if (this.particles.length > this.MAX_PARTICLES) {
      this.particles.splice(0, this.particles.length - this.MAX_PARTICLES);
    }
  }

  private updateSpirits(deltaTime: number): void {
    this.spirits.forEach(spirit => {
      spirit.animationTime += deltaTime;
      spirit.animationFrame = Math.floor(spirit.animationTime * 10) % 4;

      if (spirit.isSummoning) {
        spirit.summonProgress += deltaTime / 2;
        if (spirit.summonProgress >= 1) {
          spirit.summonProgress = 1;
          spirit.isSummoning = false;
        }
        const t = spirit.summonProgress;
        spirit.opacity = t;
        spirit.scale = t * 1.2;
        spirit.rotation = t * Math.PI * 2;
        spirit.y = spirit.targetY - (1 - t) * 50;
      } else {
        spirit.rotation += deltaTime * 0.5;
      }
    });
  }

  public isMouseOverRune(x: number, y: number): boolean {
    for (const rune of this.runePool) {
      if (!rune.isInSlot && !rune.isFlying && this.hitTestRune(rune, x, y)) return true;
    }
    for (const slot of this.slots) {
      if (slot.rune && !slot.rune.isFlying && this.hitTestRune(slot.rune, x, y)) return true;
    }
    return false;
  }

  public getHoveredSpiritIndex(x: number, y: number): number {
    const bounds = this.getDexPanelBounds();
    if (x < bounds.x || x > bounds.x + bounds.width || y < bounds.y + 50 || y > bounds.y + bounds.height) return -1;

    const cardW = 80;
    const cardH = 100;
    const gap = 10;
    const cols = 2;
    const localX = x - bounds.x - 20;
    const localY = y - bounds.y - 60;
    const col = Math.floor(localX / (cardW + gap));
    const row = Math.floor(localY / (cardH + gap));
    if (col < 0 || col >= cols) return -1;
    const idx = row * cols + col;
    if (idx >= 0 && idx < this.summonedSpirits.length) {
      return idx;
    }
    return -1;
  }
}
