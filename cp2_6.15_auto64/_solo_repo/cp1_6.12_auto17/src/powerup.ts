import type { Rect } from './types';

export enum PowerUpType {
  DOUBLE_FIRE = 'double_fire',
  SHIELD = 'shield',
  SPEED_BOOST = 'speed_boost'
}

export interface PowerUpConfig {
  type: PowerUpType;
  dropChance: number;
  duration: number;
  color: string;
  glowColor: string;
  icon: string;
}

export const POWER_UP_CONFIGS: Record<PowerUpType, PowerUpConfig> = {
  [PowerUpType.DOUBLE_FIRE]: {
    type: PowerUpType.DOUBLE_FIRE,
    dropChance: 0.15,
    duration: 5000,
    color: '#00ff66',
    glowColor: 'rgba(50, 255, 100, 0.6)',
    icon: '⚡'
  },
  [PowerUpType.SHIELD]: {
    type: PowerUpType.SHIELD,
    dropChance: 0.08,
    duration: 8000,
    color: '#4a9eff',
    glowColor: 'rgba(74, 158, 255, 0.6)',
    icon: '🛡️'
  },
  [PowerUpType.SPEED_BOOST]: {
    type: PowerUpType.SPEED_BOOST,
    dropChance: 0.1,
    duration: 6000,
    color: '#ffd700',
    glowColor: 'rgba(255, 215, 0, 0.6)',
    icon: '🚀'
  }
};

export interface PowerUpState {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  active: boolean;
  picked: boolean;
  type: PowerUpType;
  rotation: number;
}

export class PowerUp {
  state: PowerUpState;
  config: PowerUpConfig;
  readonly baseSize: number = 30;
  readonly fallSpeed: number = 0.1;
  readonly rotationSpeed: number = 0.05;

  constructor(x: number, y: number, type: PowerUpType = PowerUpType.DOUBLE_FIRE) {
    this.config = POWER_UP_CONFIGS[type];
    this.state = {
      x: x - this.baseSize / 2,
      y: y,
      width: this.baseSize,
      height: this.baseSize,
      speed: this.fallSpeed,
      active: true,
      picked: false,
      type: type,
      rotation: 0
    };
  }

  update(deltaTime: number, canvasHeight: number): void {
    if (!this.state.active || this.state.picked) return;

    this.state.y += this.state.speed * deltaTime;
    this.state.rotation += this.rotationSpeed;

    if (this.state.y > canvasHeight + 50) {
      this.state.active = false;
    }
  }

  checkCollision(playerRect: Rect): boolean {
    if (!this.state.active || this.state.picked) return false;

    const shrinkFactor = 0.8;
    const pw = this.state.width * shrinkFactor;
    const ph = this.state.height * shrinkFactor;
    const px = this.state.x + (this.state.width - pw) / 2;
    const py = this.state.y + (this.state.height - ph) / 2;

    const playerShrink = 0.9;
    const prw = playerRect.width * playerShrink;
    const prh = playerRect.height * playerShrink;
    const prx = playerRect.x + (playerRect.width - prw) / 2;
    const pry = playerRect.y + (playerRect.height - prh) / 2;

    const collision = px < prx + prw &&
                      px + pw > prx &&
                      py < pry + prh &&
                      py + ph > pry;

    if (collision) {
      this.state.picked = true;
      this.state.active = false;
    }

    return collision;
  }

  getRect(): Rect {
    return {
      x: this.state.x,
      y: this.state.y,
      width: this.state.width,
      height: this.state.height
    };
  }

  reset(): void {
    this.state.active = false;
    this.state.picked = false;
  }
}

export class PowerUpManager {
  powerUps: PowerUp[] = [];
  readonly maxPowerUps: number = 5;
  private canvasHeight: number;

  constructor(_canvasWidth: number, canvasHeight: number) {
    this.canvasHeight = canvasHeight;
  }

  spawn(x: number, y: number, forcedType?: PowerUpType): void {
    if (this.powerUps.filter(p => p.state.active).length >= this.maxPowerUps) {
      return;
    }

    let type: PowerUpType;
    if (forcedType) {
      type = forcedType;
    } else {
      type = this.selectRandomType();
    }

    const inactive = this.powerUps.find(p => !p.state.active && !p.state.picked);
    if (inactive) {
      inactive.state.x = x - inactive.baseSize / 2;
      inactive.state.y = y;
      inactive.state.active = true;
      inactive.state.picked = false;
      inactive.state.type = type;
      inactive.state.rotation = 0;
      inactive.config = POWER_UP_CONFIGS[type];
    } else {
      this.powerUps.push(new PowerUp(x, y, type));
    }
  }

  private selectRandomType(): PowerUpType {
    const rand = Math.random();
    let cumulative = 0;

    const totalChance = Object.values(POWER_UP_CONFIGS).reduce((sum, c) => sum + c.dropChance, 0);

    for (const [type, config] of Object.entries(POWER_UP_CONFIGS)) {
      cumulative += config.dropChance / totalChance;
      if (rand <= cumulative) {
        return type as PowerUpType;
      }
    }

    return PowerUpType.DOUBLE_FIRE;
  }

  trySpawnWithChance(x: number, y: number): boolean {
    const totalDropChance = Object.values(POWER_UP_CONFIGS).reduce((sum, c) => sum + c.dropChance, 0);
    if (Math.random() < totalDropChance) {
      this.spawn(x, y);
      return true;
    }
    return false;
  }

  update(deltaTime: number): void {
    this.powerUps.forEach(powerUp => {
      powerUp.update(deltaTime, this.canvasHeight);
    });
  }

  checkCollisions(playerRect: Rect): PowerUpType[] {
    const collected: PowerUpType[] = [];
    this.powerUps.forEach(powerUp => {
      if (powerUp.checkCollision(playerRect)) {
        collected.push(powerUp.state.type);
      }
    });
    return collected;
  }

  cleanup(): void {
    this.powerUps = this.powerUps.filter(p => p.state.active && !p.state.picked);
  }

  resize(_canvasWidth: number, canvasHeight: number): void {
    this.canvasHeight = canvasHeight;
  }

  reset(): void {
    this.powerUps.forEach(p => p.reset());
    this.powerUps = [];
  }
}
