import * as THREE from 'three';
import { VeinParticles } from './VeinParticles';
import { InteractionHandler } from './InteractionHandler';

function main(): void {
  const container = document.getElementById('canvas-container');
  if (!container) {
    console.error('Canvas container not found');
    return;
  }

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    200
  );
  camera.position.set(0, 8, 20);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  const veinParticles = new VeinParticles();
  scene.add(veinParticles.points);

  console.log(`粒子总数: ${veinParticles.getParticleCount()}`);

  const interactionHandler = new InteractionHandler(
    camera,
    scene,
    veinParticles,
    renderer
  );

  const clock = new THREE.Clock();

  function animate(): void {
    requestAnimationFrame(animate);

    const deltaTime = Math.min(clock.getDelta(), 0.05);
    const elapsedTime = clock.getElapsedTime();

    veinParticles.update(deltaTime, elapsedTime);
    interactionHandler.update(deltaTime, elapsedTime);

    renderer.render(scene, camera);
  }

  animate();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  const speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
  const speedVal = document.getElementById('speed-val') as HTMLSpanElement;
  const colorSlider = document.getElementById('color-slider') as HTMLInputElement;
  const colorVal = document.getElementById('color-val') as HTMLSpanElement;
  const densitySlider = document.getElementById('density-slider') as HTMLInputElement;
  const densityVal = document.getElementById('density-val') as HTMLSpanElement;

  if (speedSlider) {
    speedSlider.addEventListener('input', () => {
      const v = parseFloat(speedSlider.value);
      speedVal.textContent = v.toFixed(1);
      veinParticles.setSpeedMultiplier(v);
    });
  }

  if (colorSlider) {
    colorSlider.addEventListener('input', () => {
      const v = parseFloat(colorSlider.value);
      colorVal.textContent = v.toFixed(2);
      veinParticles.setColorGradientSpeed(v);
    });
  }

  if (densitySlider) {
    densitySlider.addEventListener('input', () => {
      const v = parseFloat(densitySlider.value);
      densityVal.textContent = v.toFixed(1);
      veinParticles.setDensity(v);
    });
  }
}

main();
