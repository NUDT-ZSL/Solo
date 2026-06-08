import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { LightCanvas } from './components/LightCanvas';
import { ControlPanel } from './components/ControlPanel';
import { ControlParams } from './utils/rayUtils';
import './styles/main.css';

function init(): void {
  const app = document.getElementById('app');
  if (!app) throw new Error('#app element not found');

  const canvasContainer = document.createElement('div');
  canvasContainer.className = 'canvas-container';
  app.appendChild(canvasContainer);

  const lightCanvas = new LightCanvas(canvasContainer);

  const scene = lightCanvas.getScene();
  const camera = lightCanvas.getCamera();
  const renderer = lightCanvas.getRenderer();

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 5;
  controls.maxDistance = 80;
  controls.mouseButtons = {
    LEFT: null as unknown as THREE.MOUSE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.ROTATE,
  };
  controls.touches = {
    ONE: null as unknown as THREE.TOUCH,
    TWO: THREE.TOUCH.DOLLY_ROTATE,
  };

  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.5,
    0.4,
    0.1
  );
  composer.addPass(bloomPass);

  const originalAnimate = (lightCanvas as unknown as Record<string, () => void>).animate;
  delete (lightCanvas as unknown as Record<string, () => void>).animate;

  function animate(): void {
    requestAnimationFrame(animate);
    controls.update();
    composer.render();
  }

  animate();

  const initialParams: ControlParams = {
    lineWidth: 3,
    particleSpreadSpeed: 1.0,
  };

  const controlPanel = new ControlPanel(
    app,
    initialParams,
    (params: ControlParams) => {
      lightCanvas.updateParams(params);
    },
    () => {
      lightCanvas.reset();
    }
  );

  window.addEventListener('resize', () => {
    const w = canvasContainer.clientWidth;
    const h = canvasContainer.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
  });

  requestAnimationFrame(() => {
    document.body.classList.add('loaded');
  });
}

init();
