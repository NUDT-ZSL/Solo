import * as THREE from 'three';
import { SolarSystem, StarField } from './solarSystem';
import { InteractionManager, ControlPanel } from './interaction';

function init(): void {
  const container = document.getElementById('canvas-container')!;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000011);
  scene.fog = new THREE.FogExp2(0x000011, 0.002);

  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    500
  );
  camera.position.set(0, 60, 120);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  container.appendChild(renderer.domElement);

  const solarSystem = new SolarSystem(scene);

  const starField = new StarField(scene, 1000);

  const interactionManager = new InteractionManager(
    camera,
    renderer,
    solarSystem,
    container
  );

  const controlPanel = new ControlPanel();
  controlPanel.setInteractionManager(interactionManager);

  window.addEventListener('resize', () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  });

  const hintEl = document.getElementById('hint-text');
  if (hintEl) {
    setTimeout(() => {
      hintEl.style.opacity = '0';
    }, 6000);
  }

  const clock = new THREE.Clock();
  let animationId: number;

  function animate(): void {
    animationId = requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const clampedDelta = Math.min(delta, 0.1);

    const isPlaying = controlPanel.getIsPlaying();
    const speedMultiplier = controlPanel.getSpeedMultiplier();

    if (isPlaying) {
      solarSystem.update(clampedDelta, speedMultiplier);
    }

    starField.update(clampedDelta);
    interactionManager.update();

    renderer.render(scene, camera);
  }

  animate();
}

init();
