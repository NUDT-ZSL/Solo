import { EventBus } from './eventBus';
import { VoxelEngine, getMaterialById } from './voxelEngine';
import { SceneManager } from './sceneManager';
import { UIPanel } from './uiPanel';

interface InteractDetail {
  x: number;
  y: number;
  z: number;
  hitExisting: boolean;
  shift: boolean;
}

function bootstrap(): void {
  const appRoot = document.getElementById('app');
  if (!appRoot) {
    console.error('[VoxelCraft] #app 容器不存在，初始化失败！');
    return;
  }

  const bus = new EventBus();
  const ui = new UIPanel(appRoot, bus);
  const sceneContainer = ui.getSceneContainer();
  const engine = new VoxelEngine(bus);
  const scene = new SceneManager(sceneContainer, bus);

  const interactEl = scene.getInteractionElement();
  interactEl.addEventListener(
    'voxelcraft:interact',
    ((e: CustomEvent<InteractDetail>) => {
      const { x, y, z, hitExisting, shift } = e.detail;
      if (!engine.inBounds(x, y, z)) return;
      if (shift) {
        if (hitExisting) {
          const prevMat = engine.getVoxel(x, y, z);
          if (prevMat !== -1) {
            scene.spawnDeleteAnimation(x, y, z, prevMat);
          }
          engine.removeVoxel(x, y, z);
        }
        return;
      }
      if (hitExisting) {
        engine.replaceVoxel(x, y, z);
      } else {
        engine.addVoxel(x, y, z);
      }
    }) as EventListener
  );

  (sceneContainer as any).__engine = engine;
  (sceneContainer as any).__scene = scene;

  requestAnimationFrame(() => {
    bus.emit('voxelsUpdated', {
      grid: engine.getGrid().map((p) => p.map((r) => r.slice())),
      count: engine.getVoxelCount(),
    });
    const initMat = getMaterialById(engine.getCurrentMaterialId());
    if (initMat) {
      bus.emit('materialChanged', { materialId: initMat.id });
    }
  });

  scene.animate();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
