import { Vector2, InputState, PlayerState, TreeNode, TreeBranch } from './types';
import {
  normalize,
  distance,
  clamp,
  pointToSegmentDistance,
  subtractVectors,
  addVectors,
  multiplyVector,
} from './utils';

const BASE_SPEED = 120;
const DECELERATION = 0.92;
const ACCELERATION = 15;
const MAX_SPEED = 180;
const PLAYER_RADIUS = 5;
const TRAIL_MAX_LIFE = 1.5;
const TRAIL_SAMPLE_DISTANCE = 8;
const BRANCH_PATH_HALF_WIDTH = 12;
const BOUNCE_FACTOR = 0.6;
const RED_FLASH_DURATION = 0.2;

export interface PlayerUpdateResult {
  collided: boolean;
  redFlashTimer: number;
}

export class PlayerController {
  state: PlayerState;
  input: InputState = {
    up: false,
    down: false,
    left: false,
    right: false,
    touchStart: null,
    touchCurrent: null,
  };
  private lastTrailPos: Vector2 | null = null;
  private canvasWidth: number = 800;
  private canvasHeight: number = 600;

  constructor(startPosition: Vector2, canvasWidth: number, canvasHeight: number) {
    this.state = {
      position: { ...startPosition },
      velocity: { x: 0, y: 0 },
      facing: { x: 0, y: -1 },
      speed: BASE_SPEED,
      trail: [],
    };
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  setCanvasSize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  bindKeyboard(container: HTMLElement): () => void {
    const onKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
          this.input.up = true;
          e.preventDefault();
          break;
        case 'ArrowDown':
        case 'KeyS':
          this.input.down = true;
          e.preventDefault();
          break;
        case 'ArrowLeft':
        case 'KeyA':
          this.input.left = true;
          e.preventDefault();
          break;
        case 'ArrowRight':
        case 'KeyD':
          this.input.right = true;
          e.preventDefault();
          break;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
          this.input.up = false;
          break;
        case 'ArrowDown':
        case 'KeyS':
          this.input.down = false;
          break;
        case 'ArrowLeft':
        case 'KeyA':
          this.input.left = false;
          break;
        case 'ArrowRight':
        case 'KeyD':
          this.input.right = false;
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }

  bindTouch(canvas: HTMLCanvasElement): () => void {
    const getTouchPos = (e: TouchEvent): Vector2 | null => {
      if (e.touches.length === 0) return null;
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      return {
        x: (touch.clientX - rect.left) * (canvas.width / rect.width),
        y: (touch.clientY - rect.top) * (canvas.height / rect.height),
      };
    };

    const onTouchStart = (e: TouchEvent) => {
      const pos = getTouchPos(e);
      if (pos) {
        this.input.touchStart = pos;
        this.input.touchCurrent = pos;
      }
      e.preventDefault();
    };

    const onTouchMove = (e: TouchEvent) => {
      const pos = getTouchPos(e);
      if (pos) {
        this.input.touchCurrent = pos;
      }
      e.preventDefault();
    };

    const onTouchEnd = () => {
      this.input.touchStart = null;
      this.input.touchCurrent = null;
    };

    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', onTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
      canvas.removeEventListener('touchcancel', onTouchEnd);
    };
  }

  private getInputDirection(): Vector2 {
    let dir: Vector2 = { x: 0, y: 0 };

    if (this.input.up) dir.y -= 1;
    if (this.input.down) dir.y += 1;
    if (this.input.left) dir.x -= 1;
    if (this.input.right) dir.x += 1;

    if (this.input.touchStart && this.input.touchCurrent) {
      const dx = this.input.touchCurrent.x - this.input.touchStart.x;
      const dy = this.input.touchCurrent.y - this.input.touchStart.y;
      const touchDist = Math.sqrt(dx * dx + dy * dy);
      if (touchDist > 10) {
        dir.x += dx / touchDist;
        dir.y += dy / touchDist;
      }
    }

    return normalize(dir);
  }

  update(
    dt: number,
    branches: TreeBranch[],
    nodes: Map<string, TreeNode>,
    getNodeById: (id: string) => TreeNode | undefined
  ): PlayerUpdateResult {
    const inputDir = this.getInputDirection();
    let collided = false;
    let redFlashTimer = 0;

    if (inputDir.x !== 0 || inputDir.y !== 0) {
      this.state.velocity.x += inputDir.x * ACCELERATION * dt * 60;
      this.state.velocity.y += inputDir.y * ACCELERATION * dt * 60;
      this.state.facing = { ...inputDir };
    }

    const velMag = Math.sqrt(
      this.state.velocity.x ** 2 + this.state.velocity.y ** 2
    );
    if (velMag > MAX_SPEED) {
      this.state.velocity.x = (this.state.velocity.x / velMag) * MAX_SPEED;
      this.state.velocity.y = (this.state.velocity.y / velMag) * MAX_SPEED;
    }

    this.state.velocity.x *= Math.pow(DECELERATION, dt * 60);
    this.state.velocity.y *= Math.pow(DECELERATION, dt * 60);

    let newPos: Vector2 = {
      x: this.state.position.x + this.state.velocity.x * dt,
      y: this.state.position.y + this.state.velocity.y * dt,
    };

    const pathResult = this.snapToPath(newPos, branches, getNodeById);
    if (pathResult.isOnPath) {
      newPos = pathResult.position;
    } else {
      collided = true;
      redFlashTimer = RED_FLASH_DURATION;

      const pushDir = normalize(subtractVectors(this.state.position, pathResult.closestPoint));
      newPos = addVectors(
        pathResult.closestPoint,
        multiplyVector(pushDir, BRANCH_PATH_HALF_WIDTH - 1)
      );

      this.state.velocity.x *= -BOUNCE_FACTOR;
      this.state.velocity.y *= -BOUNCE_FACTOR;
    }

    const prevOnScreen = this.isOnScreen(this.state.position, 0);
    const nowOnScreen = this.isOnScreen(newPos, 20);
    if (prevOnScreen && !nowOnScreen) {
      collided = true;
      redFlashTimer = RED_FLASH_DURATION;
      newPos = { ...this.state.position };
      this.state.velocity.x *= -BOUNCE_FACTOR;
      this.state.velocity.y *= -BOUNCE_FACTOR;
    }

    this.updateTrail(newPos, dt);

    this.state.position = newPos;

    return { collided, redFlashTimer };
  }

  private isOnScreen(pos: Vector2, margin: number): boolean {
    return (
      pos.x >= -margin &&
      pos.x <= this.canvasWidth + margin &&
      pos.y >= -margin
    );
  }

  private snapToPath(
    pos: Vector2,
    branches: TreeBranch[],
    getNodeById: (id: string) => TreeNode | undefined
  ): { position: Vector2; isOnPath: boolean; closestPoint: Vector2 } {
    let closestDist = Infinity;
    let closestPoint: Vector2 = { ...pos };
    let closestOnBranch = false;

    for (const node of nodes.values()) {
      const d = distance(pos, node.position);
      const nodeRadius = node.width * 1.5 + BRANCH_PATH_HALF_WIDTH;
      if (d < nodeRadius && d < closestDist) {
        closestDist = d;
        closestPoint = { ...node.position };
        closestOnBranch = true;
      }
    }

    for (const branch of branches) {
      if (!branch.isActive) continue;

      const from = getNodeById(branch.from);
      const to = getNodeById(branch.to);
      if (!from || !to) continue;

      const pts = branch.curvePoints;
      for (let i = 0; i < pts.length - 1; i++) {
        const segResult = pointToSegmentDistance(pos, pts[i], pts[i + 1]);
        const effectiveWidth = BRANCH_PATH_HALF_WIDTH * branch.shrinkFactor + branch.thickness;

        if (segResult.distance < effectiveWidth && segResult.distance < closestDist) {
          closestDist = segResult.distance;
          closestPoint = segResult.closest;
          closestOnBranch = true;
        } else if (segResult.distance < closestDist) {
          closestDist = segResult.distance;
          closestPoint = segResult.closest;
        }
      }
    }

    if (closestOnBranch) {
      return { position: { ...pos }, isOnPath: true, closestPoint };
    }

    return { position: closestPoint, isOnPath: false, closestPoint };
  }

  private updateTrail(newPos: Vector2, dt: number): void {
    for (const t of this.state.trail) {
      t.life -= dt;
    }
    this.state.trail = this.state.trail.filter((t) => t.life > 0);

    if (!this.lastTrailPos || distance(this.lastTrailPos, newPos) >= TRAIL_SAMPLE_DISTANCE) {
      this.state.trail.push({
        position: { ...newPos },
        life: TRAIL_MAX_LIFE,
      });
      this.lastTrailPos = { ...newPos };
    }
  }

  resetTrail(): void {
    this.state.trail = [];
    this.lastTrailPos = null;
  }

  teleportTo(pos: Vector2): void {
    this.state.position = { ...pos };
    this.state.velocity = { x: 0, y: 0 };
    this.resetTrail();
  }
}
