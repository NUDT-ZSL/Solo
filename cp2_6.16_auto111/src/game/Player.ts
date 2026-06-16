import type { PlayerState, InputState, LightSource, GameMap, Vector2, Potion } from './types';

export class Player {
  state: PlayerState;
  private map: GameMap;
  private tileSize: number = 16;

  constructor(initialX: number, initialY: number, map: GameMap) {
    this.map = map;
    this.state = {
      x: initialX,
      y: initialY,
      width: 24,
      height: 32,
      baseHeight: 32,
      velocityX: 0,
      velocityY: 0,
      isSneaking: false,
      sneakAnimation: 0,
      visibility: 1.0,
      targetVisibility: 1.0,
      opacity: 1.0,
      health: 100,
      maxHealth: 100,
      hasPotion: false,
      potionActive: false,
      potionTimer: 0,
      potionCooldown: 0,
      potionMaxCooldown: 10,
      facing: 0,
    };
  }

  update(input: InputState, lightSources: LightSource[], dt: number, potions: Potion[]): void {
    const sneakTransitionSpeed = 1 / 0.3;
    if (input.sneak && !this.state.isSneaking) {
      this.state.isSneaking = true;
    } else if (!input.sneak && this.state.isSneaking) {
      this.state.isSneaking = false;
    }

    if (this.state.isSneaking) {
      this.state.sneakAnimation = Math.min(1, this.state.sneakAnimation + dt * sneakTransitionSpeed);
    } else {
      this.state.sneakAnimation = Math.max(0, this.state.sneakAnimation - dt * sneakTransitionSpeed);
    }

    this.state.height = this.state.baseHeight * (1 - this.state.sneakAnimation * 0.5);

    if (input.usePotion && this.state.hasPotion && this.state.potionCooldown <= 0) {
      this.state.potionActive = true;
      this.state.potionTimer = 3;
      this.state.potionCooldown = this.state.potionMaxCooldown;
      this.state.hasPotion = false;
    }

    if (this.state.potionActive) {
      this.state.potionTimer -= dt;
      if (this.state.potionTimer <= 0) {
        this.state.potionActive = false;
      }
    }

    if (this.state.potionCooldown > 0) {
      this.state.potionCooldown -= dt;
    }

    for (const potion of potions) {
      if (!potion.collected) {
        const dist = Math.hypot(this.state.x - potion.x, this.state.y - potion.y);
        if (dist < this.state.width / 2 + potion.radius) {
          potion.collected = true;
          this.state.hasPotion = true;
        }
      }
    }

    const walkSpeed = 80;
    const sneakSpeed = 40;
    const speed = this.state.isSneaking ? sneakSpeed : walkSpeed;

    let dx = 0;
    let dy = 0;
    if (input.up) dy -= 1;
    if (input.down) dy += 1;
    if (input.left) dx -= 1;
    if (input.right) dx += 1;

    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy);
      dx /= len;
      dy /= len;
      this.state.facing = Math.atan2(dy, dx);
    }

    this.state.velocityX = dx * speed;
    this.state.velocityY = dy * speed;

    const newX = this.state.x + this.state.velocityX * dt;
    const newY = this.state.y + this.state.velocityY * dt;

    if (!this.checkCollision(newX, this.state.y)) {
      this.state.x = newX;
    }
    if (!this.checkCollision(this.state.x, newY)) {
      this.state.y = newY;
    }

    this.state.x = Math.max(this.state.width / 2, Math.min(this.map.width - this.state.width / 2, this.state.x));
    this.state.y = Math.max(this.state.height / 2, Math.min(this.map.height - this.state.height / 2, this.state.y));

    const lightIntensity = this.calculateLightIntensity(lightSources);

    if (this.state.potionActive) {
      this.state.targetVisibility = 0.15;
    } else if (this.state.isSneaking) {
      if (lightIntensity >= 0.4) {
        this.state.targetVisibility = 1.0;
      } else {
        this.state.targetVisibility = 1.0 - (0.4 - lightIntensity) / 0.4;
      }
    } else {
      this.state.targetVisibility = 1.0;
    }

    const visibilitySpeed = 1 / 0.8;
    this.state.visibility += (this.state.targetVisibility - this.state.visibility) * Math.min(1, dt * visibilitySpeed);
    this.state.opacity = this.state.visibility;
  }

  private checkCollision(x: number, y: number): boolean {
    const halfWidth = this.state.width / 2 - 2;
    const halfHeight = this.state.height / 2 - 2;

    const corners: Vector2[] = [
      { x: x - halfWidth, y: y - halfHeight },
      { x: x + halfWidth, y: y - halfHeight },
      { x: x - halfWidth, y: y + halfHeight },
      { x: x + halfWidth, y: y + halfHeight },
    ];

    for (const corner of corners) {
      if (this.map.isWall(corner.x, corner.y)) {
        return true;
      }
      if (!this.map.isFloor(corner.x, corner.y)) {
        return true;
      }
    }

    return false;
  }

  private calculateLightIntensity(lightSources: LightSource[]): number {
    let totalIntensity = 0;

    for (const light of lightSources) {
      const dist = Math.hypot(this.state.x - light.x, this.state.y - light.y);
      
      if (dist > light.radius) continue;

      let attenuation = 1 - dist / light.radius;
      attenuation = Math.pow(attenuation, 1.5);

      if (light.type === 'flashlight' && light.angle && light.direction !== undefined) {
        const angleToPlayer = Math.atan2(this.state.y - light.y, this.state.x - light.x);
        let angleDiff = Math.abs(angleToPlayer - light.direction);
        if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
        
        const halfAngle = (light.angle * Math.PI / 180) / 2;
        if (angleDiff > halfAngle) continue;
        
        const angleFactor = 1 - angleDiff / halfAngle;
        attenuation *= angleFactor;
      }

      totalIntensity = Math.min(1, totalIntensity + attenuation * light.intensity);
    }

    return totalIntensity;
  }

  getLightIntensity(lightSources: LightSource[]): number {
    return this.calculateLightIntensity(lightSources);
  }

  getAverageOpacity(): number {
    return this.state.opacity;
  }
}
