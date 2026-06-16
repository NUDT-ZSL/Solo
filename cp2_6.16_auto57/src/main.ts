import { SceneManager } from './sceneManager';
import { UI } from './ui';

let sceneManager: SceneManager;
let ui: UI;
let animationId: number;

function init(): void {
  sceneManager = new SceneManager('app');
  ui = new UI(sceneManager);

  animate();
}

function animate(): void {
  animationId = requestAnimationFrame(animate);
  sceneManager.animate();
  ui.update();
}

function dispose(): void {
  cancelAnimationFrame(animationId);
  sceneManager.dispose();
  ui.dispose();
}

window.addEventListener('load', init);
window.addEventListener('beforeunload', dispose);
