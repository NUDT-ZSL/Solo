export interface FrameData {
  x: number;
  y: number;
  vx: number;
  vy: number;
  onGround: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

export class Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number = 20;
  height: number = 20;
  onGround: boolean;
  scaleY: number = 1;
  landAnimationTime: number = 0;
  wasOnGround: boolean = false;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
  }

  update(dt: number, keys: Set<string>): void {
    const MOVE_SPEED = 200;
    const JUMP_FORCE = -350;

    this.vx = 0;
    if (keys.has('a') || keys.has('arrowleft')) {
      this.vx = -MOVE_SPEED;
    }
    if (keys.has('d') || keys.has('arrowright')) {
      this.vx = MOVE_SPEED;
    }

    if ((keys.has('w') || keys.has('arrowup') || keys.has(' ')) && this.onGround) {
      this.vy = JUMP_FORCE;
      this.onGround = false;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (this.landAnimationTime > 0) {
      this.landAnimationTime -= dt;
      const t = 1 - this.landAnimationTime / 0.1;
      if (t < 0.5) {
        this.scaleY = 0.8 + t * 0.5;
      } else {
        this.scaleY = 1.05 - (t - 0.5) * 0.1;
      }
      if (this.landAnimationTime <= 0) {
        this.scaleY = 1;
      }
    }
  }

  applyGravity(dt: number): void {
    const GRAVITY = 600;
    this.vy += GRAVITY * dt;
  }

  checkCollision(platforms: Platform[]): void {
    this.wasOnGround = this.onGround;
    this.onGround = false;

    for (const platform of platforms) {
      if (this.intersects(platform)) {
        const overlapLeft = (this.x + this.width) - platform.x;
        const overlapRight = (platform.x + platform.width) - this.x;
        const overlapTop = (this.y + this.height) - platform.y;
        const overlapBottom = (platform.y + platform.height) - this.y;

        const minOverlapX = Math.min(overlapLeft, overlapRight);
        const minOverlapY = Math.min(overlapTop, overlapBottom);

        if (minOverlapY < minOverlapX) {
          if (overlapTop < overlapBottom && this.vy > 0) {
            this.y = platform.y - this.height;
            this.vy = 0;
            this.onGround = true;
            if (!this.wasOnGround) {
              this.startLandAnimation();
            }
          } else if (this.vy < 0) {
            this.y = platform.y + platform.height;
            this.vy = 0;
          }
        } else {
          if (overlapLeft < overlapRight) {
            this.x = platform.x - this.width;
          } else {
            this.x = platform.x + platform.width;
          }
          this.vx = 0;
        }
      }
    }
  }

  intersects(platform: Platform): boolean {
    return (
      this.x < platform.x + platform.width &&
      this.x + this.width > platform.x &&
      this.y < platform.y + platform.height &&
      this.y + this.height > platform.y
    );
  }

  checkSpikeCollision(spikes: Spike[]): boolean {
    for (const spike of spikes) {
      if (
        this.x < spike.x + spike.width &&
        this.x + this.width > spike.x &&
        this.y < spike.y + spike.height &&
        this.y + this.height > spike.y
      ) {
        return true;
      }
    }
    return false;
  }

  checkSwitchCollision(switches: GameSwitch[], platforms: Platform[]): number | null {
    for (let i = 0; i < switches.length; i++) {
      const sw = switches[i];
      if (!sw.activated && this.intersectsSwitch(sw)) {
        const targetPlatform = platforms[sw.targetPlatformIndex];
        if (targetPlatform && targetPlatform.movable) {
          targetPlatform.move(30);
          sw.activated = true;
          return i;
        }
      }
    }
    return null;
  }

  intersectsSwitch(sw: GameSwitch): boolean {
    return (
      this.x < sw.x + sw.width &&
      this.x + this.width > sw.x &&
      this.y < sw.y + sw.height &&
      this.y + this.height > sw.y
    );
  }

  checkGoal(goal: { x: number; y: number }): boolean {
    const goalWidth = 30;
    const goalHeight = 30;
    return (
      this.x < goal.x + goalWidth &&
      this.x + this.width > goal.x &&
      this.y < goal.y + goalHeight &&
      this.y + this.height > goal.y
    );
  }

  startLandAnimation(): void {
    this.landAnimationTime = 0.1;
    this.scaleY = 0.8;
  }

  reset(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.scaleY = 1;
    this.landAnimationTime = 0;
  }
}

export class Platform {
  x: number;
  y: number;
  width: number;
  height: number = 40;
  movable: boolean;
  originalX: number;
  moved: boolean = false;

  constructor(x: number, y: number, width: number, height: number = 40, movable: boolean = false) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.movable = movable;
    this.originalX = x;
  }

  move(offset: number): void {
    if (this.movable && !this.moved) {
      this.x += offset;
      this.moved = true;
    }
  }

  reset(): void {
    if (this.moved) {
      this.x = this.originalX;
      this.moved = false;
    }
  }
}

export class Spike {
  x: number;
  y: number;
  width: number = 20;
  height: number = 20;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}

export class GameSwitch {
  x: number;
  y: number;
  width: number = 30;
  height: number = 10;
  targetPlatformIndex: number;
  activated: boolean = false;

  constructor(x: number, y: number, targetPlatformIndex: number) {
    this.x = x;
    this.y = y;
    this.targetPlatformIndex = targetPlatformIndex;
  }

  reset(): void {
    this.activated = false;
  }
}

export class TimeClone {
  frames: FrameData[];
  currentFrame: number;
  x: number;
  y: number;
  opacity: number = 0.7;
  lifetime: number = 6;
  elapsed: number = 0;
  dissipating: boolean = false;
  particles: Particle[] = [];
  frameTime: number = 0;
  readonly FRAME_DURATION: number = 1 / 60;

  constructor(frames: FrameData[], startX: number, startY: number) {
    this.frames = frames;
    this.currentFrame = 0;
    this.x = startX;
    this.y = startY;
  }

  update(dt: number): boolean {
    if (this.dissipating) {
      this.updateParticles(dt);
      this.elapsed += dt;
      return this.elapsed < 0.5;
    }

    this.elapsed += dt;
    this.frameTime += dt;

    while (this.frameTime >= this.FRAME_DURATION && this.currentFrame < this.frames.length - 1) {
      this.currentFrame++;
      this.frameTime -= this.FRAME_DURATION;
    }

    if (this.currentFrame < this.frames.length) {
      const frame = this.frames[this.currentFrame];
      this.x = frame.x;
      this.y = frame.y;
    }

    return this.elapsed < this.lifetime;
  }

  checkSwitchCollision(switches: GameSwitch[], platforms: Platform[]): number | null {
    for (let i = 0; i < switches.length; i++) {
      const sw = switches[i];
      if (!sw.activated && this.intersectsSwitch(sw)) {
        const targetPlatform = platforms[sw.targetPlatformIndex];
        if (targetPlatform && targetPlatform.movable) {
          targetPlatform.move(30);
          sw.activated = true;
          return i;
        }
      }
    }
    return null;
  }

  intersectsSwitch(sw: GameSwitch): boolean {
    return (
      this.x < sw.x + sw.width &&
      this.x + 20 > sw.x &&
      this.y < sw.y + sw.height &&
      this.y + 20 > sw.y
    );
  }

  checkSpikeCollision(spikes: Spike[]): boolean {
    for (const spike of spikes) {
      if (
        this.x < spike.x + spike.width &&
        this.x + 20 > spike.x &&
        this.y < spike.y + spike.height &&
        this.y + 20 > spike.y
      ) {
        return true;
      }
    }
    return false;
  }

  startDissipate(): void {
    if (!this.dissipating) {
      this.dissipating = true;
      this.elapsed = 0;
      this.opacity = 0;
      for (let i = 0; i < 30; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 50 + Math.random() * 100;
        this.particles.push({
          x: this.x + 10,
          y: this.y + 10,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0.5,
          maxLife: 0.5,
          size: 2 + Math.random() * 3
        });
      }
    }
  }

  private updateParticles(dt: number): void {
    for (const particle of this.particles) {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 200 * dt;
      particle.life -= dt;
    }
    this.particles = this.particles.filter(p => p.life > 0);
  }
}

function playCrashSound(): void {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext();
    const bufferSize = audioContext.sampleRate * 0.1;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }
    
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    
    const filter = audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1000;
    
    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    source.start();
  } catch (e) {
    console.log('Audio not supported');
  }
}

export { playCrashSound };
