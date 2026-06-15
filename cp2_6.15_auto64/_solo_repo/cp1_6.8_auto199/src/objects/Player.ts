import Phaser from 'phaser';
import { OrbitSimulator, PlanetData, PortalData, WavePathResult } from '../systems/OrbitSimulator';

export interface LaunchInfo {
  gridX: number;
  gridY: number;
  dirX: number;
  dirY: number;
}

export class Player {
  private scene: Phaser.Scene;
  private simulator: OrbitSimulator;
  private planets: PlanetData[];
  private portals: PortalData[];

  private hoverNode: { gx: number; gy: number } | null = null;
  private isDragging: boolean = false;
  private dragStart: { x: number; y: number } | null = null;
  private selectedNode: { gx: number; gy: number } | null = null;

  private onLaunch: ((info: LaunchInfo, path: WavePathResult) => void) | null = null;
  private onHover: ((gx: number, gy: number | null) => void) | null = null;

  private aimGraphics: Phaser.GameObjects.Graphics;
  private launchCount: number = 0;

  constructor(
    scene: Phaser.Scene,
    simulator: OrbitSimulator,
    planets: PlanetData[],
    portals: PortalData[]
  ) {
    this.scene = scene;
    this.simulator = simulator;
    this.planets = planets;
    this.portals = portals;

    this.aimGraphics = scene.add.graphics();
    this.aimGraphics.setDepth(50);

    this.setupInput();
  }

  private setupInput(): void {
    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.handlePointerMove(pointer);
    });

    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.handlePointerDown(pointer);
    });

    this.scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      this.handlePointerUp(pointer);
    });
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    const grid = this.simulator.worldToGrid(pointer.x, pointer.y);

    if (this.simulator.isInBounds(grid.gx, grid.gy)) {
      if (!this.hoverNode || this.hoverNode.gx !== grid.gx || this.hoverNode.gy !== grid.gy) {
        this.hoverNode = grid;
        if (this.onHover) {
          this.onHover(grid.gx, grid.gy);
        }
      }
    } else {
      if (this.hoverNode) {
        this.hoverNode = null;
        if (this.onHover) {
          this.onHover(-1, null);
        }
      }
    }

    if (this.isDragging && this.selectedNode) {
      this.updateAimLine(pointer);
    }
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    const grid = this.simulator.worldToGrid(pointer.x, pointer.y);

    if (this.simulator.isInBounds(grid.gx, grid.gy)) {
      let onPlanet = false;
      for (const p of this.planets) {
        if (p.gridX === grid.gx && p.gridY === grid.gy) {
          onPlanet = true;
          break;
        }
      }

      if (!onPlanet) {
        this.isDragging = true;
        this.dragStart = { x: pointer.x, y: pointer.y };
        this.selectedNode = { gx: grid.gx, gy: grid.gy };
      }
    }
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer): void {
    if (this.isDragging && this.selectedNode && this.dragStart) {
      const dx = pointer.x - this.dragStart.x;
      const dy = pointer.y - this.dragStart.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 15) {
        let dirX = 0;
        let dirY = 0;

        if (Math.abs(dx) > Math.abs(dy)) {
          dirX = dx > 0 ? 1 : -1;
        } else {
          dirY = dy > 0 ? 1 : -1;
        }

        this.launchWave(this.selectedNode.gx, this.selectedNode.gy, dirX, dirY);
      } else {
        const directions = [
          { dx: 1, dy: 0 },
          { dx: -1, dy: 0 },
          { dx: 0, dy: 1 },
          { dx: 0, dy: -1 },
        ];
        const dir = directions[Math.floor(Math.random() * 4)];
        this.launchWave(this.selectedNode.gx, this.selectedNode.gy, dir.dx, dir.dy);
      }
    }

    this.isDragging = false;
    this.dragStart = null;
    this.selectedNode = null;
    this.aimGraphics.clear();
  }

  private updateAimLine(pointer: Phaser.Input.Pointer): void {
    this.aimGraphics.clear();

    if (!this.selectedNode) return;

    const startWorld = this.simulator.gridToWorld(this.selectedNode.gx, this.selectedNode.gy);
    const dx = pointer.x - startWorld.x;
    const dy = pointer.y - startWorld.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 15) return;

    let dirX = 0;
    let dirY = 0;
    if (Math.abs(dx) > Math.abs(dy)) {
      dirX = dx > 0 ? 1 : -1;
    } else {
      dirY = dy > 0 ? 1 : -1;
    }

    const lineLen = 60;
    const endX = startWorld.x + dirX * lineLen;
    const endY = startWorld.y + dirY * lineLen;

    this.aimGraphics.lineStyle(3, 0x88ccff, 0.8);
    this.aimGraphics.lineBetween(startWorld.x, startWorld.y, endX, endY);

    const arrowSize = 8;
    const angle = Math.atan2(dirY, dirX);
    this.aimGraphics.fillStyle(0x88ccff, 0.9);
    this.aimGraphics.fillTriangle(
      endX,
      endY,
      endX - arrowSize * Math.cos(angle - 0.5),
      endY - arrowSize * Math.sin(angle - 0.5),
      endX - arrowSize * Math.cos(angle + 0.5),
      endY - arrowSize * Math.sin(angle + 0.5)
    );
  }

  private launchWave(gx: number, gy: number, dirX: number, dirY: number): void {
    const result = this.simulator.simulateWavePath(gx, gy, dirX, dirY, this.planets, this.portals);

    this.launchCount++;

    if (this.onLaunch) {
      this.onLaunch({ gridX: gx, gridY: gy, dirX, dirY }, result);
    }
  }

  setOnLaunch(callback: (info: LaunchInfo, path: WavePathResult) => void): void {
    this.onLaunch = callback;
  }

  setOnHover(callback: (gx: number, gy: number | null) => void): void {
    this.onHover = callback;
  }

  getHoverNode(): { gx: number; gy: number } | null {
    return this.hoverNode;
  }

  getLaunchCount(): number {
    return this.launchCount;
  }

  resetLaunchCount(): void {
    this.launchCount = 0;
  }

  updatePlanetsAndPortals(planets: PlanetData[], portals: PortalData[]): void {
    this.planets = planets;
    this.portals = portals;
  }

  updateSimulator(simulator: OrbitSimulator): void {
    this.simulator = simulator;
  }

  destroy(): void {
    this.aimGraphics.destroy();
  }
}
