import Phaser from 'phaser';

export interface Wall {
  x: number;
  y: number;
  width: number;
  height: number;
  sprite?: Phaser.GameObjects.Rectangle;
}

export interface ShadowPlatform {
  x: number;
  y: number;
  width: number;
  height: number;
  isActive: boolean;
  activeTimer: number;
  sprite: Phaser.GameObjects.Rectangle;
  glowSprite: Phaser.GameObjects.Rectangle;
}

export class ShadowSystem {
  private scene: Phaser.Scene;
  private shadowGraphics: Phaser.GameObjects.Graphics;
  private lightPosition: Phaser.Math.Vector2;
  private lightRadius: number = 200;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.lightPosition = new Phaser.Math.Vector2(400, 300);
    this.shadowGraphics = scene.add.graphics();
    this.shadowGraphics.setDepth(5);
  }

  public setLightPosition(x: number, y: number): void {
    this.lightPosition.set(x, y);
  }

  public updateShadows(walls: Wall[], platforms: ShadowPlatform[]): void {
    this.shadowGraphics.clear();

    for (const wall of walls) {
      this.castShadowForWall(wall);
    }

    this.checkPlatformShadowCoverage(walls, platforms);
  }

  private getWallCorners(wall: Wall): Phaser.Math.Vector2[] {
    return [
      new Phaser.Math.Vector2(wall.x, wall.y),
      new Phaser.Math.Vector2(wall.x + wall.width, wall.y),
      new Phaser.Math.Vector2(wall.x + wall.width, wall.y + wall.height),
      new Phaser.Math.Vector2(wall.x, wall.y + wall.height)
    ];
  }

  private castShadowForWall(wall: Wall): void {
    const corners = this.getWallCorners(wall);
    const lightToCornerVectors: Phaser.Math.Vector2[] = [];
    const distances: number[] = [];

    for (const corner of corners) {
      const dir = new Phaser.Math.Vector2(
        corner.x - this.lightPosition.x,
        corner.y - this.lightPosition.y
      );
      lightToCornerVectors.push(dir);
      distances.push(dir.length());
    }

    const projections: Phaser.Math.Vector2[] = [];
    const shadowLength = this.lightRadius * 1.5;

    for (let i = 0; i < corners.length; i++) {
      const dir = lightToCornerVectors[i];
      const len = distances[i];
      if (len < 1) {
        projections.push(new Phaser.Math.Vector2(corners[i].x, corners[i].y));
        continue;
      }
      const normalized = dir.clone().normalize();
      const proj = corners[i].clone().add(normalized.scale(shadowLength));
      projections.push(proj);
    }

    let minDot = Infinity;
    let maxDot = -Infinity;
    let minIdx = 0;
    let maxIdx = 0;
    const axis = new Phaser.Math.Vector2(1, 0);

    for (let i = 0; i < 4; i++) {
      const dot = lightToCornerVectors[i].x;
      if (dot < minDot) { minDot = dot; minIdx = i; }
      if (dot > maxDot) { maxDot = dot; maxIdx = i; }
    }

    const avgDist = distances.reduce((a, b) => a + b, 0) / 4;
    const alpha = Phaser.Math.Clamp(
      0.3 + (1 - avgDist / (this.lightRadius * 2)) * 0.4,
      0.3,
      0.7
    );

    this.shadowGraphics.fillStyle(0x000000, alpha);
    this.shadowGraphics.beginPath();

    const startCorner = corners[minIdx];
    const endCorner = corners[maxIdx];
    const startProj = projections[minIdx];
    const endProj = projections[maxIdx];

    this.shadowGraphics.moveTo(startCorner.x, startCorner.y);
    this.shadowGraphics.lineTo(startProj.x, startProj.y);
    this.shadowGraphics.lineTo(endProj.x, endProj.y);
    this.shadowGraphics.lineTo(endCorner.x, endCorner.y);
    this.shadowGraphics.closePath();
    this.shadowGraphics.fillPath();
  }

  public checkPlatformShadowCoverage(
    walls: Wall[],
    platforms: ShadowPlatform[]
  ): void {
    const now = this.scene.time.now;

    for (const platform of platforms) {
      const coverage = this.calculatePlatformCoverage(platform, walls);

      if (coverage > 0.8) {
        platform.isActive = true;
        platform.activeTimer = now + 2000;
        platform.sprite.setAlpha(1);
        platform.glowSprite.setAlpha(0.8);
        platform.sprite.setStrokeStyle(3, 0x00ffff, 1);
      } else if (platform.isActive && now > platform.activeTimer) {
        platform.isActive = false;
        platform.sprite.setAlpha(0.2);
        platform.glowSprite.setAlpha(0);
        platform.sprite.setStrokeStyle(0, 0x00ffff, 0);
      }
    }
  }

  private calculatePlatformCoverage(platform: ShadowPlatform, walls: Wall[]): number {
    const cx = platform.x + platform.width / 2;
    const cy = platform.y + platform.height / 2;

    let isBehindWall = false;
    for (const wall of walls) {
      const wallCx = wall.x + wall.width / 2;
      const wallCy = wall.y + wall.height / 2;

      const lightToWall = new Phaser.Math.Vector2(wallCx - this.lightPosition.x, wallCy - this.lightPosition.y);
      const lightToPlatform = new Phaser.Math.Vector2(cx - this.lightPosition.x, cy - this.lightPosition.y);

      if (lightToWall.length() < 5) continue;
      if (lightToPlatform.length() < lightToWall.length()) continue;

      const dot = lightToWall.dot(lightToPlatform);
      if (dot <= 0) continue;

      const normWall = lightToWall.clone().normalize();
      const projection = lightToPlatform.dot(normWall);
      const projectedPoint = normWall.scale(projection);
      const perpDist = new Phaser.Math.Vector2(
        lightToPlatform.x - projectedPoint.x,
        lightToPlatform.y - projectedPoint.y
      ).length();

      const wallHalfW = wall.width / 2;
      if (perpDist < wallHalfW + 15) {
        const distToLight = new Phaser.Math.Vector2(
          cx - this.lightPosition.x,
          cy - this.lightPosition.y
        ).length();
        const wallDist = lightToWall.length();
        if (distToLight > wallDist * 0.8 && distToLight < wallDist * 3) {
          isBehindWall = true;
          break;
        }
      }
    }

    if (!isBehindWall) return 0;

    const distToLight = new Phaser.Math.Vector2(
      cx - this.lightPosition.x,
      cy - this.lightPosition.y
    ).length();

    return Phaser.Math.Clamp(
      0.5 + (1 - distToLight / (this.lightRadius * 2)) * 0.5,
      0,
      1
    );
  }

  public isPointInShadow(x: number, y: number, walls: Wall[]): boolean {
    const distToLight = new Phaser.Math.Vector2(
      x - this.lightPosition.x,
      y - this.lightPosition.y
    ).length();

    for (const wall of walls) {
      const wallCx = wall.x + wall.width / 2;
      const wallCy = wall.y + wall.height / 2;

      const lightToWall = new Phaser.Math.Vector2(wallCx - this.lightPosition.x, wallCy - this.lightPosition.y);
      const lightToPoint = new Phaser.Math.Vector2(x - this.lightPosition.x, y - this.lightPosition.y);

      const wallDist = lightToWall.length();
      if (wallDist < 5 || distToLight < wallDist) continue;

      const dot = lightToWall.dot(lightToPoint);
      if (dot <= 0) continue;

      const normWall = lightToWall.clone().normalize();
      const projection = lightToPoint.dot(normWall);
      const projectedPoint = normWall.scale(projection);
      const perpDist = new Phaser.Math.Vector2(
        lightToPoint.x - projectedPoint.x,
        lightToPoint.y - projectedPoint.y
      ).length();

      if (perpDist < wall.width / 2 + 5 && distToLight < wallDist * 2.5) {
        return true;
      }
    }

    return false;
  }

  public getShadowsGraphics(): Phaser.GameObjects.Graphics {
    return this.shadowGraphics;
  }

  public setDepth(depth: number): void {
    this.shadowGraphics.setDepth(depth);
  }

  public clear(): void {
    this.shadowGraphics.clear();
  }

  public destroy(): void {
    this.shadowGraphics.destroy();
  }
}
