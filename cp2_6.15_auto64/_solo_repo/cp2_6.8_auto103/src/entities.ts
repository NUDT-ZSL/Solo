export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Circle {
  x: number;
  y: number;
  radius: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
}

export class Car implements Rect {
  public x: number;
  public y: number;
  public width: number = 30;
  public height: number = 48;
  public speedY: number = 0;
  public speedX: number = 0;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}

export class Obstacle implements Rect {
  public x: number;
  public y: number;
  public width: number = 40;
  public height: number = 30;
  public active: boolean = true;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}

export class Coin implements Circle {
  public x: number;
  public y: number;
  public radius: number = 10;
  public active: boolean = true;
  public collected: boolean = false;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}

export function aabbCollision(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

export function rectCircleCollision(rect: Rect, circle: Circle): boolean {
  const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
  const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));
  const distanceX = circle.x - closestX;
  const distanceY = circle.y - closestY;
  return (distanceX * distanceX + distanceY * distanceY) < (circle.radius * circle.radius);
}
