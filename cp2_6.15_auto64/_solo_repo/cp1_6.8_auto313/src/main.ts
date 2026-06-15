import * as THREE from 'three';
import { Crystal } from './Crystal';
import { TimeSystem, TimeMode } from './TimeSystem';
import { InteractionManager } from './InteractionManager';
import { ControlPanel } from './ControlPanel';

const container = document.getElementById('app')!;
const clock = new THREE.Clock();

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 4, 9);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
container.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffeedd, 0.3);
dirLight.position.set(5, 10, 5);
scene.add(dirLight);

const timeSystem = new TimeSystem();
const crystal = new Crystal(scene);
const interaction = new InteractionManager(camera, crystal, renderer.domElement);

const controlPanel = new ControlPanel({
  onTimeChange: (progress: number) => {
    if (timeSystem.getMode() === 'manual') {
      timeSystem.setProgress(progress);
    }
  },
  onModeToggle: () => {
    const current = timeSystem.getMode();
    const next: TimeMode = current === 'auto' ? 'manual' : 'auto';
    timeSystem.setMode(next);
    interaction.setAutoRotate(next === 'auto');
    controlPanel.setModeDisplay(next === 'auto');
  },
  onResetView: () => {
    interaction.resetView();
  },
});
controlPanel.setModeDisplay(true);

const bgCanvas = document.createElement('canvas');
bgCanvas.width = 2;
bgCanvas.height = 512;
const bgCtx = bgCanvas.getContext('2d')!;
const bgTexture = new THREE.CanvasTexture(bgCanvas);
bgTexture.minFilter = THREE.LinearFilter;

function updateBackground(colors: { background: THREE.Color }): void {
  const topColor = colors.background.clone().offsetHSL(0, 0, -0.015);
  const bottomColor = colors.background.clone();
  const gradient = bgCtx.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, '#' + topColor.getHexString());
  gradient.addColorStop(0.5, '#' + bottomColor.getHexString());
  gradient.addColorStop(1, '#' + bottomColor.clone().offsetHSL(0, 0, -0.03).getHexString());
  bgCtx.fillStyle = gradient;
  bgCtx.fillRect(0, 0, 2, 512);
  bgTexture.needsUpdate = true;
  scene.background = bgTexture;
}

function onResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);

function animate(): void {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.1);

  timeSystem.update(delta);
  const colors = timeSystem.getColors();

  crystal.update(colors, delta);
  interaction.update(delta);
  controlPanel.updateTimeProgress(timeSystem.getProgress());

  updateBackground(colors);

  ambientLight.color.copy(colors.base).multiplyScalar(0.3).add(new THREE.Color(0.2, 0.2, 0.3));
  dirLight.color.copy(colors.base).multiplyScalar(0.5).add(new THREE.Color(0.3, 0.3, 0.4));

  renderer.render(scene, camera);
}

animate();
