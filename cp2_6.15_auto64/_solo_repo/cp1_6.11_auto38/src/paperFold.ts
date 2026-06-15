import { SeasonName, seasonThemes, getRandomProverb } from './seasonThemes';

export type CornerName = 'tl' | 'tr' | 'bl' | 'br';

export const CORNER_HIT_RADIUS_PX = 20;
export const MAX_FOLD_ANGLE_DEG = 150;
export const BOUNCE_BACK_DURATION_S = 0.5;
export const FLIP_THRESHOLD_RATIO = 0.55;
export const FOLD_SMOOTH_DRAG = 0.35;
export const FOLD_SMOOTH_RELEASE = 0.12;
export const FLIP_ANGLE_DEG = 180;

interface FoldState {
  active: boolean;
  corner: CornerName | null;
  currentX: number;
  currentY: number;
  targetX: number;
  targetY: number;
  isFlipped: boolean;
}

export class PaperFold {
  private letterCard: HTMLElement;
  private cornerHitAreas: HTMLElement[];
  private backIcon: HTMLElement;
  private backProverb: HTMLElement;

  private state: FoldState = {
    active: false,
    corner: null,
    currentX: 0,
    currentY: 0,
    targetX: 0,
    targetY: 0,
    isFlipped: false
  };

  private animFrameId: number = 0;
  private currentSeason: SeasonName = 'spring';
  private isDragging: boolean = false;

  constructor(
    letterCard: HTMLElement,
    cornerHitAreas: HTMLElement[],
    backIcon: HTMLElement,
    backProverb: HTMLElement
  ) {
    this.letterCard = letterCard;
    this.cornerHitAreas = cornerHitAreas;
    this.backIcon = backIcon;
    this.backProverb = backProverb;
    this.bindEvents();
    this.updateBackContent();
  }

  private bindEvents(): void {
    for (const area of this.cornerHitAreas) {
      const corner = area.dataset.corner as CornerName;
      if (!corner) continue;

      area.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.startFold(corner, e.clientX, e.clientY);
      });

      area.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const t = e.touches[0];
        this.startFold(corner, t.clientX, t.clientY);
      }, { passive: false });
    }

    window.addEventListener('mousemove', (e) => {
      if (this.isDragging) this.updateDrag(e.clientX, e.clientY);
    });

    window.addEventListener('touchmove', (e) => {
      if (this.isDragging) {
        const t = e.touches[0];
        this.updateDrag(t.clientX, t.clientY);
      }
    }, { passive: true });

    const end = () => { if (this.isDragging) this.endFold(); };
    window.addEventListener('mouseup', end);
    window.addEventListener('touchend', end);
    window.addEventListener('touchcancel', end);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.reset();
    });
  }

  private startFold(corner: CornerName, clientX: number, clientY: number): void {
    this.isDragging = true;
    this.state.active = true;
    this.state.corner = corner;
    this.state.targetX = 0;
    this.state.targetY = 0;
    if (!this.animFrameId) this.startAnimationLoop();
  }

  private updateDrag(clientX: number, clientY: number): void {
    if (!this.state.active || !this.state.corner) return;
    const rect = this.letterCard.getBoundingClientRect();
    let fx = 0, fy = 0;

    switch (this.state.corner) {
      case 'tl':
        fx = ((clientX - rect.left) / rect.width) * MAX_FOLD_ANGLE_DEG;
        fy = ((clientY - rect.top) / rect.height) * MAX_FOLD_ANGLE_DEG;
        break;
      case 'tr':
        fx = ((rect.right - clientX) / rect.width) * MAX_FOLD_ANGLE_DEG;
        fy = ((clientY - rect.top) / rect.height) * MAX_FOLD_ANGLE_DEG;
        break;
      case 'bl':
        fx = ((clientX - rect.left) / rect.width) * MAX_FOLD_ANGLE_DEG;
        fy = ((rect.bottom - clientY) / rect.height) * MAX_FOLD_ANGLE_DEG;
        break;
      case 'br':
        fx = ((rect.right - clientX) / rect.width) * MAX_FOLD_ANGLE_DEG;
        fy = ((rect.bottom - clientY) / rect.height) * MAX_FOLD_ANGLE_DEG;
        break;
    }

    fx = Math.max(0, Math.min(MAX_FOLD_ANGLE_DEG, fx));
    fy = Math.max(0, Math.min(MAX_FOLD_ANGLE_DEG, fy));

    const dist = Math.sqrt(fx * fx + fy * fy);
    if (dist > MAX_FOLD_ANGLE_DEG * FLIP_THRESHOLD_RATIO) {
      this.state.isFlipped = true;
    }

    this.state.targetX = fx;
    this.state.targetY = fy;
  }

  private endFold(): void {
    this.isDragging = false;
    this.state.active = false;

    const dist = Math.sqrt(this.state.targetX ** 2 + this.state.targetY ** 2);

    if (dist > MAX_FOLD_ANGLE_DEG * FLIP_THRESHOLD_RATIO && !this.state.isFlipped) {
      this.state.isFlipped = true;
      this.state.targetX = FLIP_ANGLE_DEG;
      this.state.targetY = 0;
      this.refreshProverb();
    } else if (this.state.isFlipped && dist > MAX_FOLD_ANGLE_DEG * 0.3) {
      return;
    } else {
      this.state.isFlipped = false;
      this.state.targetX = 0;
      this.state.targetY = 0;
    }
  }

  reset(): void {
    this.state.isFlipped = false;
    this.state.targetX = 0;
    this.state.targetY = 0;
  }

  setSeason(season: SeasonName): void {
    this.currentSeason = season;
    this.updateBackContent();
  }

  private updateBackContent(): void {
    const theme = seasonThemes[this.currentSeason];
    this.backIcon.innerHTML = theme.iconSVG;
    this.refreshProverb();
  }

  private refreshProverb(): void {
    this.backProverb.textContent = getRandomProverb(this.currentSeason);
  }

  startAnimationLoop(): void {
    const loop = () => {
      this.updateAnimation();
      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  stopAnimationLoop(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = 0;
    }
  }

  private updateAnimation(): void {
    const smooth = this.state.active ? FOLD_SMOOTH_DRAG : FOLD_SMOOTH_RELEASE;
    const dx = this.state.targetX - this.state.currentX;
    const dy = this.state.targetY - this.state.currentY;
    this.state.currentX += dx * smooth;
    this.state.currentY += dy * smooth;

    if (!this.state.active) {
      if (Math.abs(dx) < 0.3) this.state.currentX = this.state.targetX;
      if (Math.abs(dy) < 0.3) this.state.currentY = this.state.targetY;
    }

    this.applyTransform();
  }

  private applyTransform(): void {
    let rotateY = 0;
    let rotateX = 0;

    if (this.state.isFlipped) {
      rotateY = FLIP_ANGLE_DEG;
    } else {
      switch (this.state.corner) {
        case 'tl':
          rotateY = -this.state.currentX;
          rotateX = this.state.currentY;
          break;
        case 'tr':
          rotateY = this.state.currentX;
          rotateX = this.state.currentY;
          break;
        case 'bl':
          rotateY = -this.state.currentX;
          rotateX = -this.state.currentY;
          break;
        case 'br':
          rotateY = this.state.currentX;
          rotateX = -this.state.currentY;
          break;
        default:
          rotateY = this.state.currentX;
          rotateX = 0;
          break;
      }
    }

    const origin = this.state.isFlipped ? 'center center' : this.getFoldOrigin();
    this.letterCard.style.transformOrigin = origin;
    this.letterCard.style.transform = `rotateY(${rotateY}deg) rotateX(${rotateX}deg)`;
  }

  private getFoldOrigin(): string {
    switch (this.state.corner) {
      case 'tl': return '100% 100%';
      case 'tr': return '0% 100%';
      case 'bl': return '100% 0%';
      case 'br': return '0% 0%';
      default: return 'center center';
    }
  }

  getLetterCard(): HTMLElement {
    return this.letterCard;
  }

  isFlipped(): boolean {
    return this.state.isFlipped;
  }
}
