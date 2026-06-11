import { SceneManager } from './scene';
import { UIController, TerrainConfig } from './ui';
import { generateTerrain, MAX_TOTAL_VERTICES } from '../core/terrain';
import {
  generateVegetation,
  createMergedTreeAsset,
  buildMergedInstancedTrees
} from '../core/vegetation';

class TerrainApp {
  private sceneManager: SceneManager;
  private uiController: UIController;
  private treeAssets: ReturnType<typeof createMergedTreeAsset>;

  private frameCount: number = 0;
  private lastFpsTime: number = performance.now();
  private currentFps: number = 60;
  private currentTerrainVertices: number = 0;
  private currentTreeVertices: number = 0;
  private currentTreeCount: number = 0;

  private readonly FPS_SAMPLE_INTERVAL = 500;

  constructor() {
    this.sceneManager = new SceneManager('canvas-container');
    this.uiController = new UIController();
    this.treeAssets = createMergedTreeAsset();

    this.uiController.onUpdate(this.handleTerrainUpdate.bind(this));
    this.initialGenerate();
    this.startRenderLoop();
  }

  private initialGenerate(): void {
    const config = this.uiController.getConfig();
    this.uiController.showLoading();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.generateTerrainAndVegetation(config);
      });
    });
  }

  private async handleTerrainUpdate(config: TerrainConfig): Promise<void> {
    await this.sleep(60);
    this.generateTerrainAndVegetation(config);
  }

  private generateTerrainAndVegetation(config: TerrainConfig): void {
    const startTime = performance.now();

    const terrainResult = generateTerrain({
      noiseFrequency: config.noiseFrequency,
      flatness: config.flatness,
      seed: config.seed
    });

    this.currentTerrainVertices = terrainResult.vertexCount;

    const vertexBudget = Math.max(5000, MAX_TOTAL_VERTICES - this.currentTerrainVertices);

    const vegetationResult = generateVegetation({
      heightMap: terrainResult.heightMap,
      normalizedHeightMap: terrainResult.normalizedHeightMap,
      density: config.treeDensity,
      seed: config.seed,
      vertexBudget
    });

    this.currentTreeCount = vegetationResult.treeCount;
    this.currentTreeVertices = vegetationResult.totalTreeVertices;

    this.sceneManager.clearTerrain();
    this.sceneManager.addTerrain(terrainResult.geometry);

    const treesMesh = buildMergedInstancedTrees(
      vegetationResult.transforms,
      this.treeAssets
    );
    this.sceneManager.addTrees(treesMesh);

    const elapsed = performance.now() - startTime;
    const minDisplayTime = 900;
    const hideDelay = Math.max(0, minDisplayTime - elapsed);

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
      if (now - this.lastFpsTime >= this.FPS_SAMPLE_INTERVAL) {
        const rawFps = Math.round(
          (this.frameCount * 1000) / (now - this.lastFpsTime)
        );
        this.currentFps = Math.max(1, Math.min(240, rawFps));
        this.frameCount = 0;
        this.lastFpsTime = now;

        this.uiController.updateStats({
          fps: this.currentFps,
          vertexCount: this.currentTerrainVertices,
          treeCount: this.currentTreeCount,
          totalVertices: this.currentTerrainVertices + this.currentTreeVertices
        });
      }

      this.sceneManager.render();
    };

    animate();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  try {
    new TerrainApp();
  } catch (e) {
    console.error('TerrainApp initialization failed:', e);
  }
});
