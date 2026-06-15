import { Base, BASE_COLORS, DNASequence } from './sequence';

const BASE_WIDTH = 20;
const BASE_HEIGHT = 30;
const BASE_GAP = 2;
const PAIR_GAP = 40;
const SEQUENCE_GAP = 100;

const GRID_COLOR = '#2C2C3E';
const GRID_SIZE = 30;
const GRID_LINE_WIDTH = 0.5;

const BACKGROUND_COLOR = '#1A1A2E';

export type ViewMode = 'horizontal' | 'vertical';

interface AnimatedBase {
  index: number;
  base: Base;
  animProgress: number;
  animType: 'none' | 'enter' | 'exit' | 'flash' | 'position';
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  flashPhase: number;
  scale: number;
}

interface AnimationState {
  active: boolean;
  startTime: number;
  duration: number;
  type: 'spring' | 'fade' | 'rotate' | 'flash' | 'bounce';
}

export class DNARenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private dpr: number = 1;

  private mainSequence: DNASequence;
  private referenceSequence: DNASequence;
  private viewMode: ViewMode = 'horizontal';

  private animatedBases: Map<string, AnimatedBase> = new Map();
  private animationState: AnimationState = { active: false, startTime: 0, duration: 0, type: 'spring' };
  private viewTransitionProgress: number = 1;
  private targetViewMode: ViewMode = 'horizontal';

  private rafId: number | null = null;
  private lastFrameTime: number = 0;

  private mouseX: number = 0;
  private mouseY: number = 0;

  private onAlignmentUpdate: (() => void) | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    mainSequence: DNASequence,
    referenceSequence: DNASequence
  ) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('无法获取Canvas 2D上下文');
    }
    this.ctx = ctx;
    this.mainSequence = mainSequence;
    this.referenceSequence = referenceSequence;

    this.resize();
    this.startAnimationLoop();
  }

  setAlignmentUpdateCallback(callback: () => void): void {
    this.onAlignmentUpdate = callback;
  }

  resize(): void {
    this.dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;

    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);

    this.ctx.scale(this.dpr, this.dpr);
  }

  getViewMode(): ViewMode {
    return this.viewMode;
  }

  setMousePosition(x: number, y: number): void {
    this.mouseX = x;
    this.mouseY = y;
    this.updateHoverIndex();
  }

  private updateHoverIndex(): void {
    const hoverIdx = this.getBaseIndexAtPosition(this.mouseX, this.mouseY, 'main');
    this.mainSequence.setHoverIndex(hoverIdx);
  }

  generateSequenceWithAnimation(): void {
    const length = Math.floor(Math.random() * 21) + 30;
    const bases: Base[] = [];
    const allBases: Base[] = ['A', 'T', 'C', 'G'];
    for (let i = 0; i < length; i++) {
      bases.push(allBases[Math.floor(Math.random() * 4)]);
    }

    const startPositions = this.getRandomStartPositions(length);
    this.mainSequence.setSequence(bases);

    this.animatedBases.clear();
    for (let i = 0; i < length; i++) {
      const key = `main-${i}`;
      const targetPos = this.getBasePosition(i, 'main');
      this.animatedBases.set(key, {
        index: i,
        base: bases[i],
        animProgress: 0,
        animType: 'position',
        startX: startPositions[i].x,
        startY: startPositions[i].y,
        targetX: targetPos.x,
        targetY: targetPos.y,
        flashPhase: 0,
        scale: 1
      });
    }

    this.animationState = {
      active: true,
      startTime: performance.now(),
      duration: 300,
      type: 'spring'
    };

    this.triggerAlignmentUpdate();
  }

  private getRandomStartPositions(count: number): { x: number; y: number }[] {
    const positions: { x: number; y: number }[] = [];
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    const radius = Math.min(this.width, this.height) * 0.3;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * radius;
      positions.push({
        x: centerX + Math.cos(angle) * r,
        y: centerY + Math.sin(angle) * r
      });
    }
    return positions;
  }

  pointMutationWithAnimation(index: number): void {
    if (index < 0 || index >= this.mainSequence.getLength()) return;

    const key = `main-${index}`;
    const pos = this.getBasePosition(index, 'main');

    this.animatedBases.set(key, {
      index: index,
      base: this.mainSequence.getBaseAt(index) || 'A',
      animProgress: 0,
      animType: 'flash',
      startX: pos.x,
      startY: pos.y,
      targetX: pos.x,
      targetY: pos.y,
      flashPhase: 0,
      scale: 1
    });

    this.animationState = {
      active: true,
      startTime: performance.now(),
      duration: 900,
      type: 'flash'
    };

    setTimeout(() => {
      this.mainSequence.pointMutation(index);
      this.triggerAlignmentUpdate();
    }, 450);
  }

  insertWithAnimation(index: number): void {
    if (this.mainSequence.getLength() === 0) return;

    const newBases = this.mainSequence.insertBases(index, 3);
    const insertIndex = Math.max(0, Math.min(index + 1, this.mainSequence.getLength() - newBases.length));

    for (let i = 0; i < newBases.length; i++) {
      const actualIndex = insertIndex + i;
      const key = `main-${actualIndex}`;
      const targetPos = this.getBasePosition(actualIndex, 'main');

      this.animatedBases.set(key, {
        index: actualIndex,
        base: newBases[i],
        animProgress: 0,
        animType: 'enter',
        startX: targetPos.x,
        startY: targetPos.y - 150,
        targetX: targetPos.x,
        targetY: targetPos.y,
        flashPhase: 0,
        scale: 1
      });
    }

    this.updateExistingPositionsAfterInsert(insertIndex, newBases.length);

    this.animationState = {
      active: true,
      startTime: performance.now(),
      duration: 600,
      type: 'bounce'
    };

    this.triggerAlignmentUpdate();
  }

  private updateExistingPositionsAfterInsert(insertAt: number, insertedCount: number): void {
    const bases = this.mainSequence.getBases();
    for (let i = insertAt + insertedCount; i < bases.length; i++) {
      const key = `main-${i}`;
      if (!this.animatedBases.has(key)) {
        const oldPos = this.getBasePosition(i - insertedCount, 'main');
        const newPos = this.getBasePosition(i, 'main');
        this.animatedBases.set(key, {
          index: i,
          base: bases[i],
          animProgress: 0,
          animType: 'position',
          startX: oldPos.x,
          startY: oldPos.y,
          targetX: newPos.x,
          targetY: newPos.y,
          flashPhase: 0,
          scale: 1
        });
      }
    }
  }

  deleteWithAnimation(index: number): void {
    if (index < 0 || index >= this.mainSequence.getLength()) return;

    const deleteCount = Math.min(3, this.mainSequence.getLength() - index);
    const basesToDelete = this.mainSequence.getBases().slice(index, index + deleteCount);

    for (let i = 0; i < deleteCount; i++) {
      const actualIndex = index + i;
      const key = `main-delete-${actualIndex}`;
      const pos = this.getBasePosition(actualIndex, 'main');

      this.animatedBases.set(key, {
        index: actualIndex,
        base: basesToDelete[i],
        animProgress: 0,
        animType: 'exit',
        startX: pos.x,
        startY: pos.y,
        targetX: pos.x,
        targetY: pos.y,
        flashPhase: i * 200,
        scale: 1
      });
    }

    this.mainSequence.deleteBases(index, 3);

    this.updateExistingPositionsAfterDelete(index, deleteCount);

    this.animationState = {
      active: true,
      startTime: performance.now(),
      duration: 600,
      type: 'fade'
    };

    this.triggerAlignmentUpdate();
  }

  private updateExistingPositionsAfterDelete(deleteAt: number, deletedCount: number): void {
    const bases = this.mainSequence.getBases();
    for (let i = deleteAt; i < bases.length; i++) {
      const key = `main-${i}`;
      const oldPos = this.getBasePosition(i + deletedCount, 'main');
      const newPos = this.getBasePosition(i, 'main');
      this.animatedBases.set(key, {
        index: i,
        base: bases[i],
        animProgress: 0,
        animType: 'position',
        startX: oldPos.x,
        startY: oldPos.y,
        targetX: newPos.x,
        targetY: newPos.y,
        flashPhase: 0,
        scale: 1
      });
    }
  }

  toggleViewMode(): void {
    this.targetViewMode = this.viewMode === 'horizontal' ? 'vertical' : 'horizontal';
    this.viewTransitionProgress = 0;

    this.animationState = {
      active: true,
      startTime: performance.now(),
      duration: 400,
      type: 'rotate'
    };
  }

  private triggerAlignmentUpdate(): void {
    setTimeout(() => {
      if (this.onAlignmentUpdate) {
        this.onAlignmentUpdate();
      }
    }, 500);
  }

  private getBasePosition(index: number, sequenceType: 'main' | 'reference'): { x: number; y: number } {
    const sequence = sequenceType === 'main' ? this.mainSequence : this.referenceSequence;
    const bases = sequence.getBases();
    const length = bases.length;

    const effectiveWidth = BASE_WIDTH * length + BASE_GAP * (length - 1);
    const effectiveHeight = BASE_HEIGHT * length + BASE_GAP * (length - 1);

    let offsetY = 0;
    if (sequenceType === 'reference') {
      if (this.viewMode === 'horizontal') {
        offsetY = -(SEQUENCE_GAP / 2 + BASE_HEIGHT + PAIR_GAP + BASE_HEIGHT);
      } else {
        offsetY = 0;
      }
    }

    const centerX = this.width / 2;
    const centerY = this.height / 2 + (sequenceType === 'main' ? SEQUENCE_GAP / 4 : -SEQUENCE_GAP / 4);

    const t = this.viewTransitionProgress;

    if (this.viewMode === 'horizontal' && this.targetViewMode === 'horizontal') {
      return {
        x: centerX - effectiveWidth / 2 + index * (BASE_WIDTH + BASE_GAP),
        y: centerY + offsetY
      };
    } else if (this.viewMode === 'vertical' && this.targetViewMode === 'vertical') {
      return {
        x: centerX + (sequenceType === 'reference' ? -BASE_WIDTH - 10 : BASE_WIDTH + 10) / 2 + (sequenceType === 'reference' ? -20 : 20),
        y: centerY - effectiveHeight / 2 + index * (BASE_HEIGHT + BASE_GAP)
      };
    } else {
      const hPos = {
        x: centerX - effectiveWidth / 2 + index * (BASE_WIDTH + BASE_GAP),
        y: centerY + offsetY
      };

      const vPos = {
        x: centerX + (sequenceType === 'reference' ? -BASE_WIDTH - 10 : BASE_WIDTH + 10) / 2 + (sequenceType === 'reference' ? -20 : 20),
        y: centerY - effectiveHeight / 2 + index * (BASE_HEIGHT + BASE_GAP)
      };

      if (this.targetViewMode === 'vertical') {
        return {
          x: hPos.x + (vPos.x - hPos.x) * t,
          y: hPos.y + (vPos.y - hPos.y) * t
        };
      } else {
        return {
          x: vPos.x + (hPos.x - vPos.x) * t,
          y: vPos.y + (hPos.y - vPos.y) * t
        };
      }
    }
  }

  getBaseIndexAtPosition(x: number, y: number, sequenceType: 'main' | 'reference'): number {
    const sequence = sequenceType === 'main' ? this.mainSequence : this.referenceSequence;
    const bases = sequence.getBases();

    for (let i = 0; i < bases.length; i++) {
      const pos = this.getBasePosition(i, sequenceType);
      let hitBox: { x: number; y: number; w: number; h: number };

      if (this.viewMode === 'horizontal') {
        hitBox = {
          x: pos.x - BASE_WIDTH / 2,
          y: pos.y - BASE_HEIGHT / 2,
          w: BASE_WIDTH,
          h: BASE_HEIGHT * 2 + PAIR_GAP
        };
      } else {
        hitBox = {
          x: pos.x - BASE_WIDTH / 2 - 10,
          y: pos.y - BASE_HEIGHT / 2,
          w: BASE_WIDTH * 2 + PAIR_GAP,
          h: BASE_HEIGHT
        };
      }

      if (x >= hitBox.x && x <= hitBox.x + hitBox.w && y >= hitBox.y && y <= hitBox.y + hitBox.h) {
        return i;
      }
    }
    return -1;
  }

  private startAnimationLoop(): void {
    const animate = (time: number) => {
      if (time - this.lastFrameTime >= 33) {
        this.update(time);
        this.render();
        this.lastFrameTime = time;
      }
      this.rafId = requestAnimationFrame(animate);
    };
    this.rafId = requestAnimationFrame(animate);
  }

  private update(currentTime: number): void {
    if (this.animationState.active) {
      const elapsed = currentTime - this.animationState.startTime;
      const progress = Math.min(1, elapsed / this.animationState.duration);
      const easedProgress = this.easeInOutCubic(progress);

      if (this.animationState.type === 'rotate') {
        this.viewTransitionProgress = easedProgress;
      }

      this.animatedBases.forEach((anim, _key) => {
        if (anim.animType === 'position' || anim.animType === 'enter') {
          anim.animProgress = easedProgress;
        } else if (anim.animType === 'exit') {
          const phase = Math.max(0, Math.min(1, (elapsed - anim.flashPhase) / 200));
          anim.animProgress = phase;
          anim.scale = 1 - phase;
        } else if (anim.animType === 'flash') {
          anim.animProgress = progress;
          anim.flashPhase = Math.floor(progress * 6);
        }
      });

      if (progress >= 1) {
        this.animationState.active = false;

        if (this.animationState.type === 'rotate') {
          this.viewMode = this.targetViewMode;
          this.viewTransitionProgress = 1;
        }

        this.animatedBases.forEach((anim, key) => {
          if (anim.animType === 'exit') {
            this.animatedBases.delete(key);
          }
        });

        this.animatedBases.forEach(anim => {
          anim.animType = 'none';
          anim.animProgress = 1;
        });
      }
    }
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  private easeOutBounce(t: number): number {
    const n1 = 7.5625;
    const d1 = 2.75;

    if (t < 1 / d1) {
      return n1 * t * t;
    } else if (t < 2 / d1) {
      return n1 * (t -= 1.5 / d1) * t + 0.75;
    } else if (t < 2.5 / d1) {
      return n1 * (t -= 2.25 / d1) * t + 0.9375;
    } else {
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
  }

  private render(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.fillStyle = BACKGROUND_COLOR;
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.drawGrid();
    this.drawSequence(this.referenceSequence, 'reference');
    this.drawSequence(this.mainSequence, 'main');
    this.drawLabels();
  }

  private drawGrid(): void {
    this.ctx.strokeStyle = GRID_COLOR;
    this.ctx.lineWidth = GRID_LINE_WIDTH;

    for (let x = 0; x <= this.width; x += GRID_SIZE) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.height);
      this.ctx.stroke();
    }

    for (let y = 0; y <= this.height; y += GRID_SIZE) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.width, y);
      this.ctx.stroke();
    }
  }

  private drawLabels(): void {
    this.ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
    this.ctx.fillStyle = '#888';

    const mainCenterY = this.height / 2 + SEQUENCE_GAP / 4;
    const refCenterY = this.height / 2 - SEQUENCE_GAP / 4;

    if (this.viewMode === 'horizontal') {
      this.ctx.fillText('参考序列', 20, refCenterY - BASE_HEIGHT);
      this.ctx.fillText('主序列', 20, mainCenterY - BASE_HEIGHT);
    } else {
      this.ctx.fillText('参考序列', this.width / 2 - 80, 30);
      this.ctx.fillText('主序列', this.width / 2 + 40, 30);
    }
  }

  private drawSequence(sequence: DNASequence, type: 'main' | 'reference'): void {
    const bases = sequence.getBases();
    const complementary = sequence.getComplementary();

    for (let i = 0; i < bases.length; i++) {
      const key = `${type}-${i}`;
      const anim = this.animatedBases.get(key);
      const deleteKey = `main-delete-${i}`;
      const deleteAnim = this.animatedBases.get(deleteKey);

      const activeAnim = deleteAnim || anim;
      const pos = this.getBasePosition(i, type);

      let drawX = pos.x;
      let drawY = pos.y;
      let scale = 1;
      let flashColor = null;

      if (activeAnim) {
        if (activeAnim.animType === 'position') {
          const t = this.easeInOutCubic(activeAnim.animProgress);
          drawX = activeAnim.startX + (activeAnim.targetX - activeAnim.startX) * t;
          drawY = activeAnim.startY + (activeAnim.targetY - activeAnim.startY) * t;
        } else if (activeAnim.animType === 'enter') {
          const t = this.easeOutBounce(activeAnim.animProgress);
          drawX = activeAnim.startX + (activeAnim.targetX - activeAnim.startX) * t;
          drawY = activeAnim.startY + (activeAnim.targetY - activeAnim.startY) * t;
        } else if (activeAnim.animType === 'exit') {
          scale = activeAnim.scale;
          drawX = activeAnim.targetX;
          drawY = activeAnim.targetY;
        } else if (activeAnim.animType === 'flash') {
          if (activeAnim.flashPhase % 2 === 0) {
            flashColor = '#FF0000';
          } else {
            flashColor = '#FFFFFF';
          }
        }
      }

      if (type === 'main' && deleteAnim) {
        scale = deleteAnim.scale;
      }

      const isHovered = type === 'main' && this.mainSequence.getHoverIndex() === i;

      if (this.viewMode === 'horizontal') {
        this.drawBasePairHorizontal(drawX, drawY, bases[i], complementary[i], scale, flashColor, isHovered);
      } else {
        this.drawBasePairVertical(drawX, drawY, bases[i], complementary[i], scale, flashColor, isHovered);
      }
    }
  }

  private drawRoundedRect(x: number, y: number, w: number, h: number, r: number): void {
    this.ctx.beginPath();
    this.ctx.moveTo(x + r, y);
    this.ctx.lineTo(x + w - r, y);
    this.ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    this.ctx.lineTo(x + w, y + h - r);
    this.ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.ctx.lineTo(x + r, y + h);
    this.ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    this.ctx.lineTo(x, y + r);
    this.ctx.quadraticCurveTo(x, y, x + r, y);
    this.ctx.closePath();
  }

  private drawBasePairHorizontal(
    x: number,
    y: number,
    base: Base,
    complement: Base,
    scale: number,
    flashColor: string | null,
    isHovered: boolean
  ): void {
    const w = BASE_WIDTH * scale;
    const h = BASE_HEIGHT * scale;

    this.ctx.fillStyle = flashColor || BASE_COLORS[base];
    this.drawRoundedRect(x - w / 2, y - h / 2, w, h, 4);
    this.ctx.fill();

    if (isHovered) {
      this.ctx.strokeStyle = '#fff';
      this.ctx.lineWidth = 2;
      this.drawRoundedRect(x - w / 2, y - h / 2, w, h, 4);
      this.ctx.stroke();
    }

    this.ctx.fillStyle = '#fff';
    this.ctx.font = `bold ${Math.floor(14 * scale)}px -apple-system, BlinkMacSystemFont, sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(base, x, y);

    const pairY = y + h / 2 + PAIR_GAP / 2 + h / 2;

    this.ctx.strokeStyle = flashColor || BASE_COLORS[complement];
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([3, 3]);
    this.ctx.globalAlpha = 0.5;
    this.ctx.beginPath();
    this.ctx.moveTo(x, y + h / 2);
    this.ctx.lineTo(x, pairY - h / 2);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
    this.ctx.globalAlpha = 1;

    this.ctx.fillStyle = BASE_COLORS[complement];
    this.drawRoundedRect(x - w / 2, pairY - h / 2, w, h, 4);
    this.ctx.fill();

    this.ctx.fillStyle = '#fff';
    this.ctx.fillText(complement, x, pairY);
  }

  private drawBasePairVertical(
    x: number,
    y: number,
    base: Base,
    complement: Base,
    scale: number,
    flashColor: string | null,
    isHovered: boolean
  ): void {
    const w = BASE_WIDTH * scale;
    const h = BASE_HEIGHT * scale;

    this.ctx.fillStyle = BASE_COLORS[complement];
    this.drawRoundedRect(x - w - PAIR_GAP / 2 - w / 2, y - h / 2, w, h, 4);
    this.ctx.fill();

    this.ctx.fillStyle = '#fff';
    this.ctx.font = `bold ${Math.floor(14 * scale)}px -apple-system, BlinkMacSystemFont, sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(complement, x - w - PAIR_GAP / 2, y);

    this.ctx.strokeStyle = BASE_COLORS[base];
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([3, 3]);
    this.ctx.globalAlpha = 0.5;
    this.ctx.beginPath();
    this.ctx.moveTo(x - PAIR_GAP / 2, y);
    this.ctx.lineTo(x + PAIR_GAP / 2, y);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
    this.ctx.globalAlpha = 1;

    this.ctx.fillStyle = flashColor || BASE_COLORS[base];
    this.drawRoundedRect(x + PAIR_GAP / 2 - w / 2, y - h / 2, w, h, 4);
    this.ctx.fill();

    if (isHovered) {
      this.ctx.strokeStyle = '#fff';
      this.ctx.lineWidth = 2;
      this.drawRoundedRect(x + PAIR_GAP / 2 - w / 2, y - h / 2, w, h, 4);
      this.ctx.stroke();
    }

    this.ctx.fillStyle = '#fff';
    this.ctx.fillText(base, x + PAIR_GAP / 2, y);
  }

  destroy(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}
