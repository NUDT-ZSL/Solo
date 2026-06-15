export interface Vector2 {
  x: number;
  y: number;
}

export class Submarine {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number = 80;
  height: number = 25;
  health: number = 3;
  maxHealth: number = 3;
  propellerAngle: number = 0;
  bubbleParticles: BubbleParticle[] = [];
  exposed: boolean = false;
  exposedTimer: number = 0;
  isDiving: boolean = false;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
  }

  update(keys: Set<string>, canvasWidth: number, canvasHeight: number, deltaTime: number) {
    const speedX = 2;
    const baseSpeedY = 1.5;
    const depthFactor = this.y / canvasHeight;
    const speedY = baseSpeedY * (0.5 + depthFactor * 0.5);

    this.vx = 0;
    this.vy = 0;

    if (keys.has('a') || keys.has('A') || keys.has('ArrowLeft')) {
      this.vx = -speedX;
    }
    if (keys.has('d') || keys.has('D') || keys.has('ArrowRight')) {
      this.vx = speedX;
    }
    if (keys.has('w') || keys.has('W') || keys.has('ArrowUp')) {
      this.vy = -speedY;
    }
    if (keys.has('s') || keys.has('S') || keys.has('ArrowDown')) {
      this.vy = speedY;
    }

    this.x += this.vx;
    this.y += this.vy;

    this.x = Math.max(this.width / 2, Math.min(canvasWidth - this.width / 2, this.x));
    this.y = Math.max(50, Math.min(canvasHeight - this.height / 2 - 40, this.y));

    this.isDiving = this.y > canvasHeight * 0.7;

    this.propellerAngle += 0.3;

    if (Math.abs(this.vx) > 0 || Math.abs(this.vy) > 0) {
      if (Math.random() < 0.4) {
        this.bubbleParticles.push(new BubbleParticle(
          this.x - this.width / 2 + Math.random() * 10,
          this.y + 5 + Math.random() * 10
        ));
      }
    }

    this.bubbleParticles = this.bubbleParticles.filter(p => {
      p.update();
      return p.life > 0;
    });

    if (this.exposed) {
      this.exposedTimer -= deltaTime;
      if (this.exposedTimer <= 0) {
        this.exposed = false;
      }
    }
  }

  triggerExpose() {
    this.exposed = true;
    this.exposedTimer = 0.15;
  }

  takeDamage(): boolean {
    this.health--;
    return this.health <= 0;
  }

  getBounds() {
    return {
      left: this.x - this.width / 2,
      right: this.x + this.width / 2,
      top: this.y - this.height / 2,
      bottom: this.y + this.height / 2
    };
  }
}

export class BubbleParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  life: number;
  maxLife: number;
  alpha: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.vx = -0.5 - Math.random() * 1;
    this.vy = -0.3 - Math.random() * 0.5;
    this.radius = 1 + Math.random() * 2;
    this.maxLife = 40 + Math.random() * 30;
    this.life = this.maxLife;
    this.alpha = 0.5;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vx += (Math.random() - 0.5) * 0.05;
    this.vy *= 0.99;
    this.life--;
    this.alpha = (this.life / this.maxLife) * 0.5;
  }
}

export class Cruiser {
  x: number;
  y: number;
  vx: number;
  width: number = 120;
  height: number = 50;
  color: string = '#333333';
  fromLeft: boolean;
  speed: number;
  sonarTimer: number;
  torpedoTimer: number;
  wave: number;
  active: boolean = true;

  constructor(canvasWidth: number, canvasHeight: number, wave: number) {
    this.wave = wave;
    this.fromLeft = Math.random() < 0.5;
    this.speed = 1 + (wave - 1) * 0.16;
    this.y = 80 + Math.random() * (canvasHeight * 0.4);
    this.x = this.fromLeft ? -this.width : canvasWidth + this.width;
    this.vx = this.fromLeft ? this.speed : -this.speed;
    this.sonarTimer = Math.random() * 2;
    this.torpedoTimer = 15 + Math.random() * 5;
  }

  update(canvasWidth: number, canvasHeight: number, deltaTime: number, submarine: Submarine): SonarWave | null {
    this.x += this.vx;

    if (this.fromLeft && this.x > canvasWidth + this.width) {
      this.active = false;
    }
    if (!this.fromLeft && this.x < -this.width) {
      this.active = false;
    }

    this.sonarTimer -= deltaTime;
    let sonarWave: SonarWave | null = null;
    if (this.sonarTimer <= 0) {
      this.sonarTimer = 3 + Math.random() * 2;
      const offsetX = (Math.random() - 0.5) * 100;
      const offsetY = (Math.random() - 0.5) * 50;
      sonarWave = new SonarWave(this.x + offsetX, this.y + offsetY);
    }

    return sonarWave;
  }

  canFireTorpedo(deltaTime: number): boolean {
    this.torpedoTimer -= deltaTime;
    if (this.torpedoTimer <= 0) {
      this.torpedoTimer = 15 + Math.random() * 5;
      return true;
    }
    return false;
  }

  getBounds() {
    return {
      left: this.x - this.width / 2,
      right: this.x + this.width / 2,
      top: this.y - this.height / 2,
      bottom: this.y + this.height / 2
    };
  }
}

export class SonarWave {
  x: number;
  y: number;
  radius: number = 5;
  maxRadius: number = 600;
  alpha: number = 0.6;
  duration: number = 1.5;
  elapsed: number = 0;
  active: boolean = true;
  hasHit: boolean = false;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  update(deltaTime: number, submarine: Submarine, canvasHeight: number): { hit: boolean } {
    this.elapsed += deltaTime;
    const progress = this.elapsed / this.duration;
    this.radius = 5 + (this.maxRadius - 5) * progress;
    this.alpha = 0.6 * (1 - progress);

    if (this.elapsed >= this.duration) {
      this.active = false;
    }

    let hit = false;
    if (!this.hasHit) {
      const bounds = submarine.getBounds();
      const closestX = Math.max(bounds.left, Math.min(this.x, bounds.right));
      const closestY = Math.max(bounds.top, Math.min(this.y, bounds.bottom));
      const distX = this.x - closestX;
      const distY = this.y - closestY;
      const distance = Math.sqrt(distX * distX + distY * distY);

      const prevRadius = this.radius - (this.maxRadius - 5) * (deltaTime / this.duration);
      if (distance <= this.radius && distance >= prevRadius - 5) {
        if (submarine.y <= canvasHeight * 0.7) {
          hit = true;
          this.hasHit = true;
        }
      }
    }

    return { hit };
  }
}

export class Torpedo {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  speed: number = 3;
  turnRate: number = 0.02;
  length: number = 15;
  width: number = 6;
  active: boolean = true;
  fireParticles: FireParticle[] = [];

  constructor(x: number, y: number, angle: number) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;
  }

  update(target: { x: number; y: number }, decoys: Decoy[], canvasWidth: number, canvasHeight: number, deltaTime: number) {
    let actualTarget = target;
    let minDist = Infinity;
    for (const decoy of decoys) {
      if (!decoy.active) continue;
      const dx = decoy.x - this.x;
      const dy = decoy.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 200 && dist < minDist) {
        minDist = dist;
        actualTarget = decoy;
      }
    }

    const dx = actualTarget.x - this.x;
    const dy = actualTarget.y - this.y;
    const targetAngle = Math.atan2(dy, dx);

    let angleDiff = targetAngle - this.angle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    const maxTurn = this.turnRate * deltaTime * 60;
    if (angleDiff > maxTurn) {
      this.angle += maxTurn;
    } else if (angleDiff < -maxTurn) {
      this.angle -= maxTurn;
    } else {
      this.angle = targetAngle;
    }

    this.vx = Math.cos(this.angle) * this.speed;
    this.vy = Math.sin(this.angle) * this.speed;

    this.x += this.vx;
    this.y += this.vy;

    if (this.x < -50 || this.x > canvasWidth + 50 || this.y < -50 || this.y > canvasHeight + 50) {
      this.active = false;
    }

    if (Math.random() < 0.7) {
      this.fireParticles.push(new FireParticle(
        this.x - Math.cos(this.angle) * this.length / 2,
        this.y - Math.sin(this.angle) * this.length / 2
      ));
    }

    this.fireParticles = this.fireParticles.filter(p => {
      p.update();
      return p.life > 0;
    });
  }

  checkCollision(submarine: Submarine): boolean {
    const bounds = submarine.getBounds();
    if (this.x > bounds.left && this.x < bounds.right &&
        this.y > bounds.top && this.y < bounds.bottom) {
      return true;
    }
    return false;
  }
}

export class FireParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  radius: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 0.5;
    this.vy = (Math.random() - 0.5) * 0.5;
    this.maxLife = 15 + Math.random() * 10;
    this.life = this.maxLife;
    this.radius = 1.5 + Math.random() * 1.5;
    const r = Math.random();
    if (r < 0.5) this.color = '#FFAA00';
    else if (r < 0.8) this.color = '#FF4400';
    else this.color = '#FFDD00';
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.95;
    this.vy *= 0.95;
    this.life--;
  }
}

export class Decoy {
  x: number;
  y: number;
  radius: number = 15;
  duration: number = 3;
  elapsed: number = 0;
  active: boolean = true;
  blinkTimer: number = 0;
  visible: boolean = true;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  update(deltaTime: number) {
    this.elapsed += deltaTime;
    if (this.elapsed >= this.duration) {
      this.active = false;
    }
    this.blinkTimer += deltaTime;
    if (this.blinkTimer > 0.15) {
      this.blinkTimer = 0;
      this.visible = !this.visible;
    }
  }
}
