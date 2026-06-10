import * as THREE from 'three';
import { VeinParticles } from './VeinParticles';
import { InteractionHandler } from './InteractionHandler';

function main(): void {
  const container = document.getElementById('canvas-container');
  if (!container) {
    console.error('[main] Canvas container not found');
    return;
  }

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    200
  );

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  console.log('[main] 初始化场景...');

  const veinParticles = new VeinParticles();
  scene.add(veinParticles.points);

  console.log('[main] 粒子系统创建完成');

  const interactionHandler = new InteractionHandler(
    camera,
    scene,
    veinParticles,
    renderer
  );

  console.log('[main] 交互处理器创建完成');

  const clock = new THREE.Clock();
  let frameCount = 0;
  let lastFpsTime = 0;

  function animate(): void {
    requestAnimationFrame(animate);

    const delta = Math.min(clock.getDelta(), 0.05);
    const elapsed = clock.getElapsedTime();

    veinParticles.update(delta, elapsed);
    interactionHandler.update(delta, elapsed);

    renderer.render(scene, camera);

    frameCount++;
    if (elapsed - lastFpsTime > 2.0) {
      const fps = frameCount / (elapsed - lastFpsTime);
      console.debug(`[main] FPS: ${fps.toFixed(1)} 粒子: ${veinParticles.getParticleCount()}`);
      frameCount = 0;
      lastFpsTime = elapsed;
    }
  }

  animate();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  const speedSlider = document.getElementById('speed-slider') as HTMLInputElement | null;
  const speedVal = document.getElementById('speed-val') as HTMLSpanElement | null;
  const colorSlider = document.getElementById('color-slider') as HTMLInputElement | null;
  const colorVal = document.getElementById('color-val') as HTMLSpanElement | null;
  const densitySlider = document.getElementById('density-slider') as HTMLInputElement | null;
  const densityVal = document.getElementById('density-val') as HTMLSpanElement | null;

  if (speedSlider && speedVal) {
    speedSlider.addEventListener('input', () => {
      const v = parseFloat(speedSlider.value);
      speedVal.textContent = v.toFixed(1);
      veinParticles.setSpeedMultiplier(v);
    });
  }

  if (colorSlider && colorVal) {
    colorSlider.addEventListener('input', () => {
      const v = parseFloat(colorSlider.value);
      colorVal.textContent = v.toFixed(2);
      veinParticles.setColorGradientSpeed(v);
    });
  }

  if (densitySlider && densityVal) {
    densitySlider.addEventListener('input', () => {
      const v = parseFloat(densitySlider.value);
      densityVal.textContent = v.toFixed(1);
      veinParticles.setDensity(v);
    });
  }

  console.log('[main] 初始化完成，开始渲染');
}

main();
