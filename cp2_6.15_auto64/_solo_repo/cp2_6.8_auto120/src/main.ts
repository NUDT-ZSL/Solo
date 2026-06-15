import { PhysicsEngine, type Planet, type Ship, type Vector2 } from './physics';
import { Renderer } from './renderer';
import { HUDManager } from './hud';

const PLANET_COLORS = ['#E53E3E', '#DD6B20', '#38A169', '#3182CE', '#805AD5'];
const INITIAL_LAUNCH_SPEED = 5;
const HIGHLIGHT_FADE_SPEED = 10;

class Game {
  private canvas: HTMLCanvasElement;
  private physics: PhysicsEngine;
  private renderer: Renderer;
  private hud: HUDManager;
  private planets: Planet[] = [];
  private ship: Ship;
  private G: number = 1.0;
  private lastTime: number = 0;
  private isAiming: boolean = false;
  private mousePos: Vector2 = { x: 0, y: 0 };
  private draggingPlanet: Planet | null = null;
  private dragOffset: Vector2 = { x: 0, y: 0 };

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.physics = new PhysicsEngine();
    this.renderer = new Renderer(this.canvas);

    this.hud = new HUDManager({
      onGChange: (v) => { this.G = v; },
      onReset: () => { this.reset(); },
      onLaunch: () => { this.startAiming(); },
      onClearTrail: () => { this.clearTrail(); },
      onAddPlanet: () => { this.addRandomPlanet(); }
    });

    this.ship = this.createIdleShip();
    this.resizeCanvas();
    this.initDefaultPlanets();
    this.bindCanvasEvents();
    this.hud.updatePlanetList(this.planets);
    this.hud.setLaunchButtonEnabled(true);
    this.hud.updateStatus('就绪 - 点击发射按钮开始');
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  private createIdleShip(): Ship {
    return {
      position: { x: 60, y: this.canvas.height - 60 },
      velocity: { x: 0, y: 0 },
      isFlying: false,
      trail: []
    };
  }

  private resizeCanvas() {
    const container = document.getElementById('canvas-container')!;
    this.canvas.width = container.clientWidth;
    this.canvas.height = container.clientHeight;
    this.renderer.resize(this.canvas.width, this.canvas.height);
    if (!this.ship.isFlying) {
      this.ship.position.x = 60;
      this.ship.position.y = this.canvas.height - 60;
    }
  }

  private initDefaultPlanets() {
    this.planets = [
      {
        id: 'p1',
        position: { x: this.canvas.width * 0.4, y: this.canvas.height * 0.4 },
        mass: 20,
        radius: 30,
        color: '#4FD1C5',
        isDragging: false,
        highlightAlpha: 0
      },
      {
        id: 'p2',
        position: { x: this.canvas.width * 0.7, y: this.canvas.height * 0.6 },
        mass: 10,
        radius: 20,
        color: '#F6AD55',
        isDragging: false,
        highlightAlpha: 0
      }
    ];
  }

  private addRandomPlanet() {
    const color = PLANET_COLORS[Math.floor(Math.random() * PLANET_COLORS.length)];
    const margin = 80;
    this.planets.push({
      id: 'p' + Date.now(),
      position: {
        x: margin + Math.random() * (this.canvas.width - margin * 2),
        y: margin + Math.random() * (this.canvas.height - margin * 2)
      },
      mass: 10 + Math.floor(Math.random() * 21),
      radius: 20 + Math.floor(Math.random() * 16),
      color,
      isDragging: false,
      highlightAlpha: 0
    });
    this.hud.updatePlanetList(this.planets);
  }

  private reset() {
    this.initDefaultPlanets();
    this.ship = this.createIdleShip();
    this.hud.updatePlanetList(this.planets);
    this.hud.setLaunchButtonEnabled(true);
    this.hud.updateStatus('已重置 - 点击发射按钮开始');
  }

  private startAiming() {
    if (this.ship.isFlying) return;
    this.isAiming = true;
    this.hud.updateStatus('瞄准中 - 在画布上点击确定方向');
  }

  private clearTrail() {
    if (this.ship.trail.length > 0) {
      const lastPos = this.ship.trail[this.ship.trail.length - 1];
      this.ship.trail = [lastPos];
    }
  }

  private launchShip(targetX: number, targetY: number) {
    const dx = targetX - this.ship.position.x;
    const dy = targetY - this.ship.position.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1) return;

    this.ship.velocity.x = (dx / len) * INITIAL_LAUNCH_SPEED;
    this.ship.velocity.y = (dy / len) * INITIAL_LAUNCH_SPEED;
    this.ship.isFlying = true;
    this.ship.trail = [{ x: this.ship.position.x, y: this.ship.position.y }];
    this.isAiming = false;
    this.hud.setLaunchButtonEnabled(false);
    this.hud.triggerLaunchFlash();
    this.hud.updateStatus('飞船已发射');
  }

  private bindCanvasEvents() {
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.canvas.addEventListener('mouseleave', () => {
      this.draggingPlanet = null;
    });
  }

  private getCanvasMousePos(e: MouseEvent): Vector2 {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  private onMouseDown(e: MouseEvent) {
    const pos = this.getCanvasMousePos(e);

    for (let i = this.planets.length - 1; i >= 0; i--) {
      const p = this.planets[i];
      const dx = pos.x - p.position.x;
      const dy = pos.y - p.position.y;
      if (dx * dx + dy * dy <= p.radius * p.radius) {
        this.draggingPlanet = p;
        p.isDragging = true;
        p.highlightAlpha = 1;
        this.dragOffset = { x: dx, y: dy };
        return;
      }
    }

    if (this.isAiming) {
      this.launchShip(pos.x, pos.y);
    }
  }

  private onMouseMove(e: MouseEvent) {
    const pos = this.getCanvasMousePos(e);
    this.mousePos = pos;

    if (this.draggingPlanet) {
      this.draggingPlanet.position.x = pos.x - this.dragOffset.x;
      this.draggingPlanet.position.y = pos.y - this.dragOffset.y;
    }
  }

  private onMouseUp(_e: MouseEvent) {
    if (this.draggingPlanet) {
      this.draggingPlanet.isDragging = false;
      this.draggingPlanet = null;
    }
  }

  private updateHighlightAlpha() {
    for (const planet of this.planets) {
      if (!planet.isDragging) {
        if (planet.highlightAlpha > 0) {
          planet.highlightAlpha = Math.max(0, planet.highlightAlpha - HIGHLIGHT_FADE_SPEED / 60);
        }
      }
    }
  }

  private update(_dt: number) {
    const hudData = this.physics.update(this.ship, this.planets, this.G);
    this.updateHighlightAlpha();
    this.hud.update(hudData);

    if (this.ship.isFlying) {
      if (this.physics.checkPlanetHit(this.ship, this.planets)) {
        this.ship.isFlying = false;
        this.hud.setLaunchButtonEnabled(true);
        this.hud.updateStatus('飞船坠毁 - 可重新发射');
      } else if (this.physics.isShipOutOfBounds(this.ship, this.canvas.width, this.canvas.height)) {
        this.ship.isFlying = false;
        this.ship = this.createIdleShip();
        this.hud.setLaunchButtonEnabled(true);
        this.hud.updateStatus('飞船飞出范围 - 可重新发射');
      }
    }
  }

  private render() {
    this.renderer.clear();
    this.renderer.drawStars();

    for (const planet of this.planets) {
      this.renderer.drawPlanet(planet);
    }

    if (this.isAiming && !this.ship.isFlying) {
      this.renderer.drawPredictedTrajectory(this.ship.position, this.mousePos);
    }

    this.renderer.drawShip(this.ship);
  }

  public start() {
    const loop = (timestamp: number) => {
      const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
      this.lastTime = timestamp;
      this.update(dt);
      this.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  game.start();
});
