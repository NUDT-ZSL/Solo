import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SceneBuilder } from './SceneBuilder';
import { InteractionManager } from './InteractionManager';
import { UIPanel } from './ui/UIPanel';
import { loadPlanetData } from './DataLoader';

async function main() {
  const appEl = document.getElementById('app')!;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    2000
  );
  camera.position.set(0, 120, 250);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  appEl.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;
  controls.minDistance = 10;
  controls.maxDistance = 500;
  controls.enablePan = true;

  const sceneBuilder = new SceneBuilder();
  scene.add(sceneBuilder.scene);

  const planetsData = await loadPlanetData();
  sceneBuilder.build(planetsData);

  const interactionManager = new InteractionManager(camera, renderer, sceneBuilder);
  const uiPanel = new UIPanel();

  let timeMultiplier = 1;

  uiPanel.setTimeSpeedCallback((speed: number) => {
    timeMultiplier = speed;
  });

  uiPanel.setDisplayModeCallback((mode) => {
    sceneBuilder.toggleOrbits(mode.orbits);
    sceneBuilder.toggleLabels(mode.labels);
    sceneBuilder.toggleTexture(mode.texture);
  });

  uiPanel.setPlanetSelectCallback((name) => {
    if (name === null) {
      sceneBuilder.clearHighlight();
      uiPanel.hidePlanetInfo();
    }
  });

  interactionManager.setOnPlanetSelect((planetName) => {
    if (planetName) {
      uiPanel.showPlanetInfo(planetName);
    } else {
      uiPanel.hidePlanetInfo();
    }
  });

  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    sceneBuilder.update(delta, timeMultiplier);
    controls.update();
    renderer.render(scene, camera);
  }

  animate();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

main().catch(console.error);
