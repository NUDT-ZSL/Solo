import type { DragState, Vector2 } from '../types';
import { GRID_SIZE } from '../types';

interface Draggable {
  id: number;
  type: 'mirror' | 'prism';
  x: number;
  y: number;
  radius: number;
  movable: boolean;
}

interface InputHandlerConfig {
  getDraggables: () => Draggable[];
  onDragStart?: (state: DragState) => void;
  onDragMove?: (state: DragState, x: number, y: number) => void;
  onDragEnd?: (state: DragState) => void;
  snapToGrid?: boolean;
  gridSize?: number;
  touchScale?: number;
}

export class InputHandler {
  private scene: Phaser.Scene;
  private config: InputHandlerConfig;
  private dragState: DragState | null = null;
  private isDragging = false;
  private lastPointerX = { x: 0, y: 0 };
  private pointerDown = false;
  private dragThreshold = 5;
  private pointerDownPos: { x: number; y: number } = { x: 0, y: 0 };
  private inertiaVelocity = { x: 0, y: 0 };
  private lastMoveTime = 0;
  private snapToGrid: boolean;
  private gridSize: number;
  private touchScale: number;
  private inertiaTimer: Phaser.Time.TimerEvent | null = null;

  constructor(scene: Phaser.Scene, config: InputHandlerConfig) {
    this.scene = scene;
    this.config = config;
    this.snapToGrid = config.snapToGrid ?? false;
    this.gridSize = config.gridSize ?? GRID_SIZE;
    this.touchScale = config.touchScale ?? 1.5;
    this.setupInput();
  }

  private setupInput(): void {
    const input = this.scene.input;

    input.on('pointerdown', this.handlePointerDown, this);
    input.on('pointermove', this.handlePointerMove, this);
    input.on('pointerup', this.handlePointerUp, this);
    input.on('pointerupoutside', this.handlePointerUp, this);
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    this.pointerDown = true;
    this.pointerDownPos = { x: pointer.x, y: pointer.y };
    this.lastPointerX = { x: pointer.x, y: pointer.y };
    this.lastMoveTime = this.scene.time.now;

    const hitTarget = this.hitTest(pointer.x, pointer.y);
    if (hitTarget && hitTarget.movable) {
      this.dragState = {
        isDragging: false,
        targetId: hitTarget.id,
        targetType: hitTarget.type,
        offsetX: pointer.x - hitTarget.x,
        offsetY: pointer.y - hitTarget.y,
        startX: hitTarget.x,
        startY: hitTarget.y,
        velocityX: 0,
        velocityY: 0,
      };
    }
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.pointerDown) return;

    const now = this.scene.time.now;
    const dt = (now - this.lastMoveTime) / 1000;
    this.lastMoveTime = now;

    const dx = pointer.x - this.lastPointerX.x;
    const dy = pointer.y - this.lastPointerY.y;

    if (dt > 0) {
      this.inertiaVelocity.x = dx / dt;
      this.inertiaVelocity.y = dy / dt;
    }

    this.lastPointerX = { x: pointer.x, y: pointer.y };

    if (!this.dragState) return;

    if (!this.isDragging) {
      let newX = pointer.x - this.dragState.offsetX;
      let newY = pointer.y - this.dragState.offsetY;

      if (this.snapToGrid) {
        newX = Math.round(newX / this.gridSize) * this.gridSize;
        newY = Math.round(newY / this.gridSize) * this.gridSize;
      }

      this.dragState.velocityX = dx;
      this.dragState.velocityY = dy;

      if (this.config.onDragMove) {
        this.config.onDragMove(this.dragState, newX, newY);
      }
    } else {
      const dist = Phaser.Math.Distance.Between(
      this.pointerDownPos.x, this.pointerDownPos.y,
      pointer.x, pointer.y
    );
      if (dist > this.dragThreshold) {
        this.isDragging = true;
        this.dragState.isDragging = true;
        if (this.config.onDragStart) {
          this.config.onDragStart(this.dragState);
        }
      }
    }
  }

  private handlePointerUp(): void {
    this.pointerDown = false;

    if (this.dragState && this.isDragging) {
      if (this.config.onDragEnd) {
        this.dragState.velocityX = this.inertiaVelocity.x;
        this.dragState.velocityY = this.inertiaVelocity.y;
        this.config.onDragEnd(this.dragState);
      }
      this.startInertia();
    }

    this.dragState = null;
    this.isDragging = false;
  }

  private startInertia(): void {
    if (this.inertiaTimer) {
      this.inertiaTimer.remove();
    }

    const damping = 0.9;
    const duration = 150;
    const startTime = this.scene.time.now;
    const startVel = { ...this.inertiaVelocity };

    this.inertiaTimer = this.scene.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        const elapsed = this.scene.time.now - startTime;
        if (elapsed > duration) {
          this.inertiaTimer?.remove();
          this.inertiaTimer = null;
          return;
        }

        const factor = Math.pow(damping, elapsed / 16);
        startVel.x *= factor;
        startVel.y *= factor;

        if (this.dragState && this.config.onDragMove) {
          const draggables = this.config.getDraggables();
          const target = draggables.find(
            (d) => d.id === this.dragState?.targetId && d.type === this.dragState?.targetType
          );
          if (target) {
            let newX = target.x + startVel.x * 0.016;
            let newY = target.y + startVel.y * 0.016;

            if (this.snapToGrid) {
              newX = Math.round(newX / this.gridSize) * this.gridSize;
              newY = Math.round(newY / this.gridSize) * this.gridSize;
            }

            this.config.onDragMove(this.dragState, newX, newY);
          }
        }
      },
    });
  }

  private hitTest(px: number, py: number): Draggable | null {
    const draggables = this.config.getDraggables();
    let closest: Draggable | null = null;
    let minDist = Infinity;

    for (const d of draggables) {
      const radius = d.radius * (this.scene.input.activePointer.isDown ? 1 : 1);
      const scale = this.isTouchDevice() ? this.touchScale : 1;
      const hitRadius = radius * scale;
      
      const dist = Phaser.Math.Distance.Between(px, py, d.x, d.y);
      if (dist < hitRadius && dist < minDist) {
        minDist = dist;
        closest = d;
      }
    }

    return closest;
  }

  isPointerDown(): boolean {
    return this.pointerDown;
  }

  getPointerPosition(): Vector2 {
    return { x: this.lastPointerX.x, y: this.lastPointerY.y };
  }

  destroy(): void {
    if (this.inertiaTimer?.remove();
    this.scene.input.off('pointerdown', this.handlePointerDown, this);
    this.scene.input.off('pointermove', this.handlePointerMove, this);
    this.scene.input.off('pointerup', this.handlePointerUp, this);
    this.scene.input.off('pointerupoutside', this.handlePointerUp, this);
  }
}

function isTouchDevice(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}
