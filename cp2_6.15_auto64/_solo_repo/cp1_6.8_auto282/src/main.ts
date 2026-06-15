import * as THREE from 'three';
import { createCorridorState, updateCorridor } from './corridor';
import { ParticleSystem } from './particleSystem';
import { Controls } from './controls';
import { createUI } from './ui';

function createBackgroundTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 360);
  gradient.addColorStop(0, '#0a0e2a');
  gradient.addColorStop(0.5, '#060a1f');
  gradient.addColorStop(1, '#000005');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);
  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  return texture;
}

function main(): void {
  const scene = new THREE.Scene();
  scene.background = createBackgroundTexture();

  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    500
  );

  const renderer = new THREE.WebGLRenderer({
    antialias: false,
    powerPreference: 'high-performance',
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  document.body.appendChild(renderer.domElement);

  const corridorState = createCorridorState();
  const particleSystem = new ParticleSystem(scene, 0.6);
  const controls = new Controls(camera, renderer);

  controls.onShockwave((point: THREE.Vector3) => {
    particleSystem.addShockwave(point, 1.0);
  });

  createUI({
    onDensityChange: (value: number) => {
      particleSystem.setDensity(value);
    },
    onSpeedChange: (value: number) => {
      controls.setFlightSpeed(value);
    },
    onReset: () => {
      controls.resetView();
    },
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  let lastTime = performance.now();

  function animate(): void {
    requestAnimationFrame(animate);

    const now = performance.now();
    const deltaTime = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    controls.update(deltaTime);
    updateCorridor(corridorState, deltaTime, controls.getIdleTime());
    particleSystem.update(deltaTime, corridorState);

    renderer.render(scene, camera);
  }

  animate();
}

main();
