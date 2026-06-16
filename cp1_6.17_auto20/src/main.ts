import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { buildRoom } from './sceneBuilder';
import { initLights, updateTransition, updateHelperPulse } from './lightController';
import { initInteraction } from './userInteraction';

const ROOM_WIDTH = 4;
const ROOM_HEIGHT = 3;

function main(): void {
  const container = document.getElementById('canvas-container');
  if (!container) {
    console.error('Canvas container not found');
    return;
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);
  scene.fog = new THREE.FogExp2(0x1a1a2e, 0.02);

  const camera = new THREE.PerspectiveCamera(
    55,
    container.clientWidth / container.clientHeight,
    0.1,
    100
  );
  camera.position.set(3, 3.5, 4);
  camera.lookAt(0, 1, 0);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
  });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(0, 1.2, 0);
  controls.minDistance = 1;
  controls.maxDistance = 12;
  controls.maxPolarAngle = Math.PI * 0.85;
  controls.update();

  buildRoom(scene);
  initLights(scene);
  initInteraction();

  let frameCount = 0;
  let lastFpsTime = performance.now();
  const fpsEl = document.getElementById('fpsCounter');

  const clock = new THREE.Clock();

  function animate(): void {
    requestAnimationFrame(animate);

    const elapsed = clock.getElapsedTime();

    updateTransition();
    updateHelperPulse(elapsed);

    controls.update();
    renderer.render(scene, camera);

    frameCount++;
    const now = performance.now();
    if (now - lastFpsTime >= 1000) {
      const fps = Math.round((frameCount * 1000) / (now - lastFpsTime));
      if (fpsEl) {
        fpsEl.textContent = `${fps} FPS`;
      }
      frameCount = 0;
      lastFpsTime = now;
    }
  }

  animate();

  window.addEventListener('resize', () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });
}

main();
