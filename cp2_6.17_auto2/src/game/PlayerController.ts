export interface PlayerState {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  direction: { x: number; y: number };
  facingAngle: number;
  isMoving: boolean;
  animFrame: number;
  animTimer: number;
  idleTimer: number;
  echoCooldown: number;
  maxEchoCooldown: number;
  isStealing: boolean;
  stealProgress: number;
  stealTargetId: string | null;
  inShadow: boolean;
  detectionTimer: number;
}

interface EchoEffect {
  id: number;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  duration: number;
  maxDuration: number;
  active: boolean;
}

export class PlayerController {
  public state: PlayerState;
  private keys: Set<string> = new Set();
  private echoIdCounter = 0;
  public echoEffects: EchoEffect[] = [];
  private echoPool: EchoEffect[] = [];
  private readonly POOL_SIZE = 10;
  public onEcho: ((x: number, y: number) => void) | null = null;
  public onStartSteal: (() => void) | null = null;
  public onStopSteal: (() => void) | null = null;

  constructor(spawnX: number, spawnY: number) {
    this.state = {
      x: spawnX,
      y: spawnY,
      width: 20,
      height: 28,
      speed: 2.5,
      direction: { x: 0, y: 0 },
      facingAngle: 0,
      isMoving: false,
      animFrame: 0,
      animTimer: 0,
      idleTimer: 0,
      echoCooldown: 0,
      maxEchoCooldown: 3000,
      isStealing: false,
      stealProgress: 0,
      stealTargetId: null,
      inShadow: false,
      detectionTimer: 0
    };

    for (let i = 0; i < this.POOL_SIZE; i++) {
      this.echoPool.push({
        id: 0, x: 0, y: 0, radius: 0, maxRadius: 80,
        alpha: 0, duration: 0, maxDuration: 800, active: false
      });
    }
  }

  public init(): void {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  public destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    const key = e.key.toLowerCase();
    if (['w', 'a', 's', 'd', ' ', 'e', 'escape'].includes(key)) {
      e.preventDefault();
    }
    this.keys.add(key);

    if (key === ' ' && this.state.echoCooldown <= 0) {
      this.triggerEcho();
    }

    if (key === 'e') {
      this.state.isStealing = true;
      if (this.onStartSteal) this.onStartSteal();
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    const key = e.key.toLowerCase();
    this.keys.delete(key);

    if (key === 'e') {
      this.state.isStealing = false;
      this.state.stealProgress = 0;
      this.state.stealTargetId = null;
      if (this.onStopSteal) this.onStopSteal();
    }
  };

  private triggerEcho(): void {
    this.state.echoCooldown = this.state.maxEchoCooldown;

    let effect = this.echoPool.find(e => !e.active);
    if (!effect) {
      effect = {
        id: 0, x: 0, y: 0, radius: 0, maxRadius: 80,
        alpha: 0, duration: 0, maxDuration: 800, active: false
      };
      this.echoPool.push(effect);
    }

    effect.id = ++this.echoIdCounter;
    effect.x = this.state.x + this.state.width / 2;
    effect.y = this.state.y + this.state.height / 2;
    effect.radius = 20;
    effect.maxRadius = 80;
    effect.alpha = 0.8;
    effect.duration = 800;
    effect.maxDuration = 800;
    effect.active = true;

    this.echoEffects.push(effect);

    if (this.onEcho) {
      this.onEcho(effect.x, effect.y);
    }
  }

  public update(deltaTime: number, collisionCheck: (x: number, y: number, w: number, h: number) => boolean): void {
    if (this.state.echoCooldown > 0) {
      this.state.echoCooldown = Math.max(0, this.state.echoCooldown - deltaTime);
    }

    for (let i = this.echoEffects.length - 1; i >= 0; i--) {
      const effect = this.echoEffects[i];
      if (!effect.active) {
        this.echoEffects.splice(i, 1);
        continue;
      }
      effect.duration -= deltaTime;
      const progress = 1 - effect.duration / effect.maxDuration;
      effect.radius = 20 + (effect.maxRadius - 20) * progress;
      effect.alpha = 0.8 * (1 - progress);
      if (effect.duration <= 0) {
        effect.active = false;
        this.echoEffects.splice(i, 1);
      }
    }

    if (!this.state.isStealing) {
      this.state.stealProgress = 0;
      this.state.stealTargetId = null;
    }

    if (this.state.detectionTimer > 0) {
      this.state.detectionTimer = Math.max(0, this.state.detectionTimer - deltaTime);
    }

    let dx = 0, dy = 0;
    if (!this.state.isStealing) {
      if (this.keys.has('w')) dy -= 1;
      if (this.keys.has('s')) dy += 1;
      if (this.keys.has('a')) dx -= 1;
      if (this.keys.has('d')) dx += 1;
    }

    const moving = dx !== 0 || dy !== 0;
    this.state.isMoving = moving;

    if (moving) {
      const len = Math.sqrt(dx * dx + dy * dy);
      dx /= len;
      dy /= len;
      this.state.facingAngle = Math.atan2(dy, dx);

      const newX = this.state.x + dx * this.state.speed;
      const newY = this.state.y + dy * this.state.speed;

      if (!collisionCheck(newX, this.state.y, this.state.width, this.state.height)) {
        this.state.x = newX;
      }
      if (!collisionCheck(this.state.x, newY, this.state.width, this.state.height)) {
        this.state.y = newY;
      }

      this.state.animTimer += deltaTime;
      if (this.state.animTimer >= 120) {
        this.state.animTimer = 0;
        this.state.animFrame = (this.state.animFrame + 1) % 4;
      }
    } else {
      this.state.animFrame = 0;
      this.state.idleTimer += deltaTime;
    }

    this.state.direction = { x: dx, y: dy };
  }

  public getCenter(): { x: number; y: number } {
    return {
      x: this.state.x + this.state.width / 2,
      y: this.state.y + this.state.height / 2
    };
  }

  public isEchoReady(): boolean {
    return this.state.echoCooldown <= 0;
  }
}
