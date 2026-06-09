import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { OrbitSystem, OrbitParams } from './OrbitSystem';
import { LightCurve } from './LightCurve';

interface StarMeshes {
  starA: THREE.Mesh;
  starB: THREE.Mesh;
  glowA: THREE.Mesh;
  glowB: THREE.Mesh;
}

const STAR_COUNT = 300;

function createStarField(scene: THREE.Scene): THREE.Points {
  const positions = new Float32Array(STAR_COUNT * 3);
  const sizes = new Float32Array(STAR_COUNT);

  for (let i = 0; i < STAR_COUNT; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 400;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 400;
    positions[i * 3 + 2] = -50 - Math.random() * 150;
    sizes[i] = 1 + Math.random();
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 1.5,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.9,
  });

  const stars = new THREE.Points(geometry, material);
  scene.add(stars);
  return stars;
}

function createTwinklingParticles(scene: THREE.Scene): { mesh: THREE.Points; data: Float32Array } {
  const PARTICLE_COUNT = 150;
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const phaseData = new Float32Array(PARTICLE_COUNT);

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 300;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 300;
    positions[i * 3 + 2] = -30 - Math.random() * 100;
    phaseData[i] = Math.random() * Math.PI * 2;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0x88ccff,
    size: 0.8,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
  });

  const particles = new THREE.Points(geometry, material);
  scene.add(particles);
  return { mesh: particles, data: phaseData };
}

function createStars(scene: THREE.Scene, orbitSystem: OrbitSystem): StarMeshes {
  const radiusA = orbitSystem.getRadiusA();
  const radiusB = orbitSystem.getRadiusB();

  const materialA = new THREE.MeshPhongMaterial({
    color: 0xffdd33,
    emissive: 0xff8800,
    emissiveIntensity: 0.3,
    shininess: 80,
    specular: 0xffffff,
  });

  const materialB = new THREE.MeshPhongMaterial({
    color: 0x3388ff,
    emissive: 0x0044aa,
    emissiveIntensity: 0.4,
    shininess: 60,
    specular: 0xaaccff,
  });

  const geometryA = new THREE.SphereGeometry(radiusA, 48, 48);
  const geometryB = new THREE.SphereGeometry(radiusB, 48, 48);

  const starA = new THREE.Mesh(geometryA, materialA);
  const starB = new THREE.Mesh(geometryB, materialB);

  const edgesA = new THREE.EdgesGeometry(geometryA);
  const edgesB = new THREE.EdgesGeometry(geometryB);
  const lineMaterialA = new THREE.LineBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.3 });
  const lineMaterialB = new THREE.LineBasicMaterial({ color: 0x66aaff, transparent: true, opacity: 0.3 });
  const wireframeA = new THREE.LineSegments(edgesA, lineMaterialA);
  const wireframeB = new THREE.LineSegments(edgesB, lineMaterialB);
  starA.add(wireframeA);
  starB.add(wireframeB);

  const glowGeometryA = new THREE.SphereGeometry(radiusA * 1.3, 32, 32);
  const glowGeometryB = new THREE.SphereGeometry(radiusB * 1.4, 32, 32);
  const glowMaterialA = new THREE.MeshBasicMaterial({
    color: 0xffaa00,
    transparent: true,
    opacity: 0.15,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
  });
  const glowMaterialB = new THREE.MeshBasicMaterial({
    color: 0x4488ff,
    transparent: true,
    opacity: 0.2,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
  });
  const glowA = new THREE.Mesh(glowGeometryA, glowMaterialA);
  const glowB = new THREE.Mesh(glowGeometryB, glowMaterialB);

  scene.add(starA);
  scene.add(starB);
  scene.add(glowA);
  scene.add(glowB);

  return { starA, starB, glowA, glowB };
}

function setupControls(orbitSystem: OrbitSystem): void {
  const controls: Array<keyof OrbitParams> = ['massRatio', 'inclination', 'eccentricity', 'period'];
  const decimals: Record<keyof OrbitParams, number> = {
    massRatio: 1,
    inclination: 0,
    eccentricity: 2,
    period: 0,
  };

  controls.forEach((key) => {
    const slider = document.getElementById(key) as HTMLInputElement;
    const valueDisplay = document.getElementById(`${key}-value`);

    if (!slider || !valueDisplay) return;

    const updateDisplay = (val: number) => {
      valueDisplay.textContent = val.toFixed(decimals[key]);
    };

    slider.addEventListener('input', () => {
      const value = parseFloat(slider.value);
      updateDisplay(value);
      orbitSystem.updateParams({ [key]: value } as Partial<OrbitParams>);
    });

    updateDisplay(parseFloat(slider.value));
  });
}

function main(): void {
  const container = document.getElementById('scene-container');
  const canvas = document.getElementById('scene-canvas') as HTMLCanvasElement;
  if (!container || !canvas) {
    console.error('Canvas or container not found');
    return;
  }

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    50,
    container.clientWidth / container.clientHeight,
    0.1,
    1000
  );
  camera.position.set(0, 8, 20);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 8;
  controls.maxDistance = 60;

  const ambientLight = new THREE.AmbientLight(0x404060, 0.5);
  scene.add(ambientLight);

  const pointLight1 = new THREE.PointLight(0xffddaa, 1.5, 100);
  pointLight1.position.set(10, 10, 10);
  scene.add(pointLight1);

  const pointLight2 = new THREE.PointLight(0xaaccff, 0.8, 100);
  pointLight2.position.set(-10, -5, -10);
  scene.add(pointLight2);

  const starField = createStarField(scene);
  const twinkling = createTwinklingParticles(scene);

  const initialParams: OrbitParams = {
    massRatio: 1.0,
    inclination: 75,
    eccentricity: 0.2,
    period: 5,
  };

  const orbitSystem = new OrbitSystem(scene, initialParams);
  const stars = createStars(scene, orbitSystem);

  const svgElement = document.getElementById('light-curve-svg') as unknown as SVGSVGElement;
  const lightCurve = new LightCurve(svgElement, 'brightness-value', 'cycle-value');
  lightCurve.setPeriod(initialParams.period);

  setupControls(orbitSystem);

  const clock = new THREE.Clock();
  let timeAccumulator = 0;
  const LIGHT_CURVE_INTERVAL = 1 / 30;

  const animate = () => {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const elapsed = clock.elapsedTime;

    const state = orbitSystem.update(delta * 2);

    stars.starA.position.copy(state.positionA);
    stars.starB.position.copy(state.positionB);
    stars.glowA.position.copy(state.positionA);
    stars.glowB.position.copy(state.positionB);

    stars.starA.rotation.y += delta * 0.3;
    stars.starB.rotation.y += delta * 0.5;

    const brightnessScale = state.eclipseFactor;
    (stars.starA.material as THREE.MeshPhongMaterial).emissiveIntensity = 0.3 * brightnessScale;
    (stars.glowA.material as THREE.MeshBasicMaterial).opacity = 0.15 * brightnessScale;

    const positions = starField.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < STAR_COUNT; i++) {
      const idx = i * 3 + 1;
      positions[idx] += Math.sin(elapsed * 0.5 + i) * 0.01;
    }
    starField.geometry.attributes.position.needsUpdate = true;

    const tpMaterial = twinkling.mesh.material as THREE.PointsMaterial;
    const avgTwinkle = twinkling.data.reduce((sum, phase) => {
      return sum + (Math.sin(elapsed * 2 + phase) + 1) / 2;
    }, 0) / twinkling.data.length;
    tpMaterial.opacity = 0.4 + avgTwinkle * 0.4;

    timeAccumulator += delta;
    if (timeAccumulator >= LIGHT_CURVE_INTERVAL) {
      timeAccumulator = 0;
      const currentParams = orbitSystem.getParams();
      lightCurve.setPeriod(currentParams.period);
      lightCurve.addPoint(
        orbitSystem.getTimeInDays(),
        state.eclipseFactor,
        orbitSystem.getCycleCount()
      );
    }

    controls.update();
    renderer.render(scene, camera);
  };

  animate();

  const handleResize = () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  };

  window.addEventListener('resize', handleResize);
}

main();
