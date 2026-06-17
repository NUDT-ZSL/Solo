import { SceneManager } from './sceneManager';
import { UIController } from './uiController';
import { loadPlantsData } from './plantModel';
import { getGarden, GardenPlant } from './apiService';

let sceneManager: SceneManager;
let uiController: UIController;
let zoomUpdateTimer: number | null = null;

async function init(): Promise<void> {
  const container = document.getElementById('canvas-container');
  if (!container) {
    console.error('Canvas container not found');
    return;
  }

  sceneManager = new SceneManager(container, {
    onPlantSelected: (plantId: string | null) => {
      if (!plantId) {
        uiController.hidePlantDetails();
      }
    },
    onPlantClicked: (plant: GardenPlant) => {
      uiController.showPlantDetails(plant);
    },
    onFpsUpdate: (fps: number) => {
      uiController.updateFps(fps);
    }
  });

  uiController = new UIController(sceneManager);

  try {
    const plants = await loadPlantsData();
    uiController.setPlants(plants);
  } catch (error) {
    console.error('Failed to load plants:', error);
  }

  try {
    const garden = await getGarden();
    garden.forEach((plant) => {
      sceneManager.addPlant(plant);
    });
  } catch (error) {
    console.error('Failed to load garden:', error);
  }

  startZoomUpdateLoop();

  sceneManager.animate();
}

function startZoomUpdateLoop(): void {
  const updateZoom = () => {
    if (sceneManager) {
      const zoom = sceneManager.getZoomLevel();
      uiController.updateZoom(zoom);
    }
    zoomUpdateTimer = window.requestAnimationFrame(updateZoom);
  };
  updateZoom();
}

window.addEventListener('DOMContentLoaded', init);
