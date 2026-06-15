import { GameMap, Rect, Role, Vector2, SonarFeedbackPoint } from '../types';

export class MapRenderer {
  private ctx: CanvasRenderingContext2D;
  private readonly WALL_COLOR = '#2a2a3a';
  private readonly FLOOR_COLOR = '#3a3a4a';
  private readonly FURNITURE_COLOR = '#6b4e3a';

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  setContext(ctx: CanvasRenderingContext2D): void {
    this.ctx = ctx;
  }

  render(
    map: GameMap,
    offsetX: number = 0,
    offsetY: number = 0,
    scale: number = 1
  ): void {
    this.ctx.save();
    this.ctx.translate(offsetX, offsetY);
    this.ctx.scale(scale, scale);

    this.drawFloor(map);
    this.drawFloorGrid(map);
    this.drawFurniture(map);
    this.drawWalls(map);

    this.ctx.restore();
  }

  private drawFloor(map: GameMap): void {
    this.ctx.fillStyle = this.FLOOR_COLOR;
    this.ctx.fillRect(0, 0, map.width, map.height);

    for (const room of map.rooms) {
      this.ctx.fillStyle = '#3d3d4e';
      this.ctx.fillRect(
        room.bounds.x + 2,
        room.bounds.y + 2,
        room.bounds.w - 4,
        room.bounds.h - 4
      );
    }

    for (const room of map.rooms) {
      for (const corridor of room.corridors) {
        this.ctx.fillStyle = '#3d3d4e';
        this.ctx.fillRect(
          corridor.x + 2,
          corridor.y + 2,
          corridor.w - 4,
          corridor.h - 4
        );
      }
    }
  }

  private drawFloorGrid(map: GameMap): void {
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    this.ctx.lineWidth = 1;

    const spacing = 40;
    for (let x = 0; x <= map.width; x += spacing) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, map.height);
      this.ctx.stroke();
    }
    for (let y = 0; y <= map.height; y += spacing) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(map.width, y);
      this.ctx.stroke();
    }
  }

  private drawWalls(map: GameMap): void {
    this.ctx.fillStyle = this.WALL_COLOR;
    for (const wall of map.walls) {
      this.ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
      
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      this.ctx.fillRect(wall.x, wall.y, wall.w, 2);
      this.ctx.fillRect(wall.x, wall.y, 2, wall.h);
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      this.ctx.fillRect(wall.x, wall.y + wall.h - 2, wall.w, 2);
      this.ctx.fillRect(wall.x + wall.w - 2, wall.y, 2, wall.h);
      this.ctx.fillStyle = this.WALL_COLOR;
    }
  }

  private drawFurniture(map: GameMap): void {
    for (const f of map.furniture) {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      this.ctx.fillRect(f.x + 3, f.y + 3, f.w, f.h);

      this.ctx.fillStyle = this.FURNITURE_COLOR;
      this.ctx.fillRect(f.x, f.y, f.w, f.h);

      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      this.ctx.fillRect(f.x, f.y, f.w, 2);
      this.ctx.fillRect(f.x, f.y, 2, f.h);
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      this.ctx.fillRect(f.x, f.y + f.h - 2, f.w, 2);
      this.ctx.fillRect(f.x + f.w - 2, f.y, 2, f.h);
    }
  }

  renderMinimap(
    x: number,
    y: number,
    size: number,
    map: GameMap,
    hunterPos: Vector2,
    stalkerPos: Vector2 | null,
    feedbackPoints: SonarFeedbackPoint[],
    timeRemaining: number,
    totalTime: number
  ): void {
    const scaleX = size / map.width;
    const scaleY = size / map.height;

    this.ctx.save();

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.beginPath();
    this.ctx.roundRect(x, y, size, size, 4);
    this.ctx.fill();

    const timeRatio = timeRemaining / totalTime;
    let borderColor: string;
    if (timeRemaining <= 30000) {
      const flash = Math.sin(performance.now() / 150) * 0.3 + 0.7;
      borderColor = `rgba(255, 60, 60, ${flash})`;
    } else {
      const r = Math.floor(255 * (1 - timeRatio));
      const g = Math.floor(255 * timeRatio);
      borderColor = `rgb(${r}, ${g}, 100)`;
    }

    this.ctx.shadowColor = borderColor;
    this.ctx.shadowBlur = 10;
    this.ctx.strokeStyle = borderColor;
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x, y, size, size);
    this.ctx.shadowBlur = 0;

    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.roundRect(x, y, size, size, 4);
    this.ctx.clip();

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    this.ctx.lineWidth = 1;
    for (const room of map.rooms) {
      this.ctx.strokeRect(
        x + room.bounds.x * scaleX,
        y + room.bounds.y * scaleY,
        room.bounds.w * scaleX,
        room.bounds.h * scaleY
      );
    }

    this.ctx.fillStyle = '#6b4e3a';
    for (const f of map.furniture) {
      this.ctx.fillRect(
        x + f.x * scaleX,
        y + f.y * scaleY,
        Math.max(1, f.w * scaleX),
        Math.max(1, f.h * scaleY)
      );
    }

    for (const point of feedbackPoints) {
      const age = performance.now() - point.timestamp;
      if (age < 1500) {
        const alpha = 1 - age / 1500;
        this.ctx.fillStyle = point.isHit 
          ? `rgba(255, 80, 80, ${alpha})` 
          : `rgba(100, 180, 255, ${alpha * 0.7})`;
        this.ctx.beginPath();
        this.ctx.arc(
          x + point.position.x * scaleX,
          y + point.position.y * scaleY,
          point.isHit ? 3 : 2,
          0,
          Math.PI * 2
        );
        this.ctx.fill();
      }
    }

    this.ctx.fillStyle = '#ff4444';
    this.ctx.shadowColor = '#ff4444';
    this.ctx.shadowBlur = 5;
    this.ctx.beginPath();
    this.ctx.arc(
      x + hunterPos.x * scaleX,
      y + hunterPos.y * scaleY,
      3,
      0,
      Math.PI * 2
    );
    this.ctx.fill();
    this.ctx.shadowBlur = 0;

    this.ctx.restore();
    this.ctx.restore();
  }

  getRectAt(map: GameMap, x: number, y: number): Rect | null {
    for (const wall of map.walls) {
      if (x >= wall.x && x < wall.x + wall.w && y >= wall.y && y < wall.y + wall.h) {
        return wall;
      }
    }
    for (const f of map.furniture) {
      if (x >= f.x && x < f.x + f.w && y >= f.y && y < f.y + f.h) {
        return f;
      }
    }
    return null;
  }
}
