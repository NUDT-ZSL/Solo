export type MaterialType = 'grass' | 'sand' | 'stone' | 'metal' | 'wood';

export interface MaterialParams {
  friction: number;
  bounce: number;
}

export interface PhysicsState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  onGround: boolean;
  currentMaterial: MaterialType | null;
  justLanded: boolean;
  isMoving: boolean;
}

export const CANVAS_WIDTH = 1200;
export const CANVAS_HEIGHT = 600;
export const SURFACE_WIDTH = 200;
export const CHAR_WIDTH = 40;
export const CHAR_HEIGHT = 60;
export const CHAR_HEAD_HEIGHT = 20;
export const GROUND_Y = 500;
export const GRAVITY = 980;

export const MATERIALS: MaterialType[] = ['grass', 'sand', 'stone', 'metal', 'wood'];

export const DEFAULT_PARAMS: Record<MaterialType, MaterialParams> = {
  grass: { friction: 0.6, bounce: 0.1 },
  sand: { friction: 0.8, bounce: 0.0 },
  stone: { friction: 0.1, bounce: 0.3 },
  metal: { friction: 0.2, bounce: 0.5 },
  wood: { friction: 0.4, bounce: 0.2 }
};

export class PhysicsEngine {
  state: PhysicsState;
  materialParams: Record<MaterialType, MaterialParams>;
  keys: { left: boolean; right: boolean; jump: boolean };

  constructor() {
    this.state = {
      x: 100,
      y: GROUND_Y - CHAR_HEIGHT,
      vx: 0,
      vy: 0,
      onGround: true,
      currentMaterial: 'grass',
      justLanded: false,
      isMoving: false
    };
    this.materialParams = { ...DEFAULT_PARAMS };
    this.keys = { left: false, right: false, jump: false };
  }

  getMaterialAt(x: number): MaterialType {
    const idx = Math.floor(x / SURFACE_WIDTH);
    return MATERIALS[Math.max(0, Math.min(idx, MATERIALS.length - 1))];
  }

  update(dt: number): void {
    this.state.justLanded = false;
    this.state.isMoving = false;

    const mat = this.getMaterialAt(this.state.x + CHAR_WIDTH / 2);
    this.state.currentMaterial = mat;
    const params = this.materialParams[mat];

    const MOVE_ACCEL = 1200;

    let ax = 0;
    if (this.keys.left) ax -= MOVE_ACCEL;
    if (this.keys.right) ax += MOVE_ACCEL;

    if (this.state.onGround && ax !== 0) {
      this.state.isMoving = true;
    }

    this.state.vx += ax * dt;

    if (this.state.onGround) {
      const frictionDecel = params.friction * MOVE_ACCEL * dt;
      if (Math.abs(this.state.vx) <= frictionDecel) {
        this.state.vx = 0;
      } else {
        this.state.vx -= Math.sign(this.state.vx) * frictionDecel;
      }
    }

    this.state.vx = Math.max(-400, Math.min(400, this.state.vx));

    this.state.vy += GRAVITY * dt;

    const JUMP_VELOCITY = -420;
    if (this.keys.jump && this.state.onGround) {
      this.state.vy = JUMP_VELOCITY * (1 + params.bounce * 0.5);
      this.state.onGround = false;
    }

    this.state.x += this.state.vx * dt;
    this.state.y += this.state.vy * dt;

    if (this.state.y + CHAR_HEIGHT >= GROUND_Y) {
      if (!this.state.onGround && this.state.vy > 50) {
        this.state.justLanded = true;
      }
      this.state.y = GROUND_Y - CHAR_HEIGHT;
      if (this.state.vy > 0) {
        this.state.vy = -this.state.vy * params.bounce;
        if (Math.abs(this.state.vy) < 30) {
          this.state.vy = 0;
          this.state.onGround = true;
        }
      } else {
        this.state.onGround = true;
      }
    }

    if (this.state.x < 0) {
      this.state.x = 0;
      this.state.vx = 0;
    }
    if (this.state.x + CHAR_WIDTH > CANVAS_WIDTH) {
      this.state.x = CANVAS_WIDTH - CHAR_WIDTH;
      this.state.vx = 0;
    }
  }

  reset(): void {
    this.state = {
      x: 100,
      y: GROUND_Y - CHAR_HEIGHT,
      vx: 0,
      vy: 0,
      onGround: true,
      currentMaterial: 'grass',
      justLanded: false,
      isMoving: false
    };
  }
}
