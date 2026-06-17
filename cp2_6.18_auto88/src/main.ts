import { PlantModelManager } from './plantModel';
import { SceneManager } from './sceneManager';
import { UIController } from './uiController';

class App {
  private container: HTMLElement;
  private plantModelManager!: PlantModelManager;
  private sceneManager!: SceneManager;
  private uiController!: UIController;

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container with id "${containerId}" not found`);
    }
    this.container = container;
    this.init();
  }

  private async init(): Promise<void> {
    try {
      this.plantModelManager = new PlantModelManager();
      await this.plantModelManager.loadPlantData();

      this.sceneManager = new SceneManager(this.container, this.plantModelManager);

      this.uiController = new UIController(
        this.container,
        this.plantModelManager,
        this.sceneManager
      );

      this.sceneManager.animate();

      this.setupResponsiveLayout();

      console.log('Virtual Garden 3D App initialized successfully');
    } catch (error) {
      console.error('Failed to initialize app:', error);
    }
  }

  private setupResponsiveLayout(): void {
    const updateLayout = () => {
      const width = window.innerWidth;
      const leftPanel = document.querySelector<HTMLElement>('[style*="left: 0px"]');
      const rightPanel = document.getElementById('detail-panel');
      const zoomIndicator = document.querySelector<HTMLElement>('[style*="left: 260px"]');

      if (width < 1200 && leftPanel) {
        leftPanel.style.width = '200px';
        if (zoomIndicator) {
          zoomIndicator.style.left = '220px';
        }
      } else if (leftPanel) {
        leftPanel.style.width = '240px';
        if (zoomIndicator) {
          zoomIndicator.style.left = '260px';
        }
      }

      if (width < 1400 && rightPanel) {
        rightPanel.style.width = '280px';
      } else if (rightPanel) {
        rightPanel.style.width = '320px';
      }
    };

    window.addEventListener('resize', updateLayout);
    updateLayout();
  }

  public dispose(): void {
    if (this.sceneManager) {
      this.sceneManager.dispose();
    }
    if (this.uiController) {
      this.uiController.dispose();
    }
    if (this.plantModelManager) {
      this.plantModelManager.dispose();
    }
  }
}

let app: App | null = null;

window.addEventListener('DOMContentLoaded', () => {
  app = new App('app');
});

window.addEventListener('beforeunload', () => {
  if (app) {
    app.dispose();
  }
});

export default App;
