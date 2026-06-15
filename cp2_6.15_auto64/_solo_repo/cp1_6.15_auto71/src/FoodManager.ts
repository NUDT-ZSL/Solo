import { Food, FoodManagerState } from './types';

const GRAVITY = 1.5;
const FOOD_COLORS = ['#FF6B35', '#4ECDC4', '#FFE66D', '#FF69B4', '#98FB98', '#DDA0DD'];

export class FoodManager {
  private foods: Food[] = [];
  private nextFoodId: number = 0;
  private canvasWidth: number;
  private canvasHeight: number;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  public resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  public spawnFood(x: number, y: number): void {
    const color = FOOD_COLORS[Math.floor(Math.random() * FOOD_COLORS.length)];
    const vx = (Math.random() - 0.5) * 2;
    const vy = 0;

    this.foods.push({
      id: this.nextFoodId++,
      x,
      y,
      vx,
      vy,
      color,
      eaten: false
    });
  }

  public update(deltaTime: number): void {
    const toRemove: number[] = [];

    for (let i = 0; i < this.foods.length; i++) {
      const food = this.foods[i];

      if (food.eaten) {
        toRemove.push(i);
        continue;
      }

      food.vy += GRAVITY * deltaTime * 60;
      food.vx += (Math.random() - 0.5) * 0.5;
      food.vx = Math.max(-2, Math.min(2, food.vx));

      food.x += food.vx * deltaTime * 60;
      food.y += food.vy * deltaTime * 60;

      if (food.x < 10 || food.x > this.canvasWidth - 10) {
        food.vx *= -0.5;
        food.x = Math.max(10, Math.min(this.canvasWidth - 10, food.x));
      }

      if (food.y > this.canvasHeight - 30) {
        food.y = this.canvasHeight - 30;
        food.vy = 0;
        food.vx *= 0.9;
      }

      if (food.y > this.canvasHeight + 50) {
        toRemove.push(i);
      }
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.foods.splice(toRemove[i], 1);
    }
  }

  public getState(): FoodManagerState {
    return {
      foods: [...this.foods]
    };
  }

  public getFoods(): Food[] {
    return this.foods;
  }
}
