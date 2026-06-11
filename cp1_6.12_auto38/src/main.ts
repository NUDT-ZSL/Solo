import { SceneManager } from './scene';
import { UIController, TerrainConfig } from './ui';
import { generateTerrain } from '../core/terrain';
import {
  generateVegetation,
  createTreeAssets,
  buildInstancedTrees
} from '../core/vegetation';

class TerrainApp {
  private sceneManager: SceneManager;
  private uiController: UIController;
  private treeAssets: ReturnType<typeof createTreeAssets>;

  private frameCount: number = 0;
  private lastFpsTime: number = performance.now();
  private currentFps: number = 60;
  private currentVertexCount: number = 0;
  private currentTreeCount: number = 0;

  constructor() {
    this.sceneManager = new SceneManager('canvas-container');
    this.uiController = new UIController();
    this.treeAssets = createTreeAssets();

    this.uiController.onUpdate(this.handleTerrainUpdate.bind(this));
    this.initialGenerate();
    this.startRenderLoop();
  }

  private initialGenerate(): void {
    const config = this.uiController.getConfig();
    this.uiController.showLoading();
    requestAnimationFrame(() => {
      this.generateTerrainAndVegetation(config);
    });
  }

  private async handleTerrainUpdate(config: TerrainConfig): Promise<void> {
    await this.sleep(50);
    this.generateTerrainAndVegetation(config);
  }

  private generateTerrainAndVegetation(config: TerrainConfig): void {
    const startTime = performance.now();

    const terrainResult = generateTerrain({
      noiseFrequency: config.noiseFrequency,
      flatness: config.flatness,
      seed: config.seed
    });

    this.currentVertexCount = terrainResult.vertexCount;

    const vegetationResult = generateVegetation({
      heightMap: terrainResult.heightMap,
      density: config.treeDensity,
      seed: config.seed
    });

    this.currentTreeCount = vegetationResult.treeCount;

    this.sceneManager.clearTerrain();
    this.sceneManager.addTerrain(terrainResult.geometry);

    const { trunkMesh, canopyMesh } = buildInstancedTrees(
      vegetationResult.transforms,
      this.treeAssets
    );
    this.sceneManager.addTrees(trunkMesh, canopyMesh);

    const elapsed = performance.now() - startTime;
    const minDelay = 800;
    const hideDelay = Math.max(0, minDelay - elapsed);

    setTimeout(() => {
      this.uiController.hideLoading();
    }, hideDelay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private startRenderLoop(): void {
    const animate = () => {
      requestAnimationFrame(animate);

      this.frameCount++;
      const now = performance.now();
      if (now - this.lastFpsTime >= 500) {
        this.currentFps = Math.round(
          (this.frameCount * 1000) / (now - this.lastFpsTime)
        );
        this.frameCount = 0;
        this.lastFpsTime = now;
        this.uiController.updateStats({
          fps: this.currentFps,
          vertexCount: this.currentVertexCount,
          treeCount: this.currentTreeCount
        });
      }

      this.sceneManager.render();
    };

    animate();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new TerrainApp();
});
