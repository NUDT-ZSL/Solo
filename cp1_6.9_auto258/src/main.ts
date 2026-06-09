import * as THREE from 'three';
import { Lighthouse } from './lighthouse';
import { CreatureSystem, Creature } from './creatures';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let lighthouse: Lighthouse;
let creatureSystem: CreatureSystem;
let stars: THREE.Points;
let clock: THREE.Clock;

let cameraAngleY = Math.PI / 4;
let cameraAngleX = Math.PI / 8;
let cameraDistance = 10;
const MIN_DISTANCE = 2;
const MAX_DISTANCE = 20;
const MIN_ANGLE_X = THREE.MathUtils.degToRad(-30);
const MAX_ANGLE_X = THREE.MathUtils.degToRad(45);

let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;
const raycaster = new THREE.Raycaster();
const mouseNDC = new THREE.Vector2();

let beamHitColor: THREE.Color | null = null;
let beamHitColorTimer = 0;

const ambientFog = new THREE.FogExp2(0x050a1a, 0.035);

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x040816);
  scene.fog = ambientFog;

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    200
  );
  updateCameraPosition();

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x040816, 1);
  document.body.appendChild(renderer.domElement);

  clock = new THREE.Clock();

  createStars();

  lighthouse = new Lighthouse(4);
  scene.add(lighthouse.group);

  creatureSystem = new CreatureSystem(100);
  scene.add(creatureSystem.group);

  const ambientLight = new THREE.AmbientLight(0x335577, 0.4);
  scene.add(ambientLight);

  addEventListeners();
}

function createStars() {
  const starCount = 800;
  const positions = new Float32Array(starCount * 3);
  const colors = new Float32Array(starCount * 3);

  for (let i = 0; i < starCount; i++) {
    const r = 25 + Math.random() * 40;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(THREE.MathUtils.lerp(-0.95, 0.8, Math.random()));

    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.cos(phi);
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

    const brightness = THREE.MathUtils.lerp(0.5, 1.0, Math.random());
    const tint = Math.random();
    colors[i * 3] = brightness * THREE.MathUtils.lerp(0.7, 1.0, tint);
    colors[i * 3 + 1] = brightness * THREE.MathUtils.lerp(0.8, 1.05, tint);
    colors[i * 3 + 2] = brightness * THREE.MathUtils.lerp(0.9, 1.15, tint);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({
    size: 0.35,
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  stars = new THREE.Points(geo, mat);
  (stars as any).userData = {
    phases: Array.from({ length: starCount }, () => Math.random() * Math.PI * 2),
    speeds: Array.from({ length: starCount }, () => THREE.MathUtils.lerp(1 / 3, 1, Math.random()))
  };
  scene.add(stars);
}

function updateStars(elapsed: number) {
  const ud = (stars as any).userData;
  const colorAttr = stars.geometry.getAttribute('color') as THREE.BufferAttribute;
  const colors = colorAttr.array as Float32Array;

  for (let i = 0; i < ud.phases.length; i++) {
    const phase = ud.phases[i] + elapsed * ud.speeds[i] * Math.PI * 2;
    const flicker = 0.5 + 0.5 * Math.sin(phase);
    const baseB = 0.5 + 0.5 * flicker;

    colors[i * 3] = baseB * THREE.MathUtils.lerp(0.7, 1.0, (i % 10) / 10);
    colors[i * 3 + 1] = baseB * THREE.MathUtils.lerp(0.8, 1.0, (i % 7) / 7);
    colors[i * 3 + 2] = baseB * 1.0;
  }
  colorAttr.needsUpdate = true;
}

function updateCameraPosition() {
  const x = cameraDistance * Math.sin(cameraAngleY) * Math.cos(cameraAngleX);
  const y = cameraDistance * Math.sin(cameraAngleX);
  const z = cameraDistance * Math.cos(cameraAngleY) * Math.cos(cameraAngleX);
  camera.position.set(x, y, z);
  camera.lookAt(0, 0, 0);
}

function addEventListeners() {
  const canvas = renderer.domElement;

  canvas.addEventListener('pointerdown', (e) => {
    isDragging = true;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    canvas.setPointerCapture(e.pointerId);

    mouseNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouseNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouseNDC, camera);

    const lighthouseObjects: THREE.Object3D[] = [];
    lighthouse.layers.forEach(l => lighthouseObjects.push(l.mesh));
    const hits = raycaster.intersectObjects(lighthouseObjects, false);
    if (hits.length > 0) {
      lighthouse.triggerFlash();
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    if (isDragging) {
      const dx = e.clientX - lastMouseX;
      const dy = e.clientY - lastMouseY;

      cameraAngleY -= dx * 0.005;
      cameraAngleX += dy * 0.005;
      cameraAngleX = THREE.MathUtils.clamp(cameraAngleX, MIN_ANGLE_X, MAX_ANGLE_X);

      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      updateCameraPosition();
    }
  });

  canvas.addEventListener('pointerup', (e) => {
    isDragging = false;
    try { canvas.releasePointerCapture(e.pointerId); } catch (_) { }
  });

  canvas.addEventListener('pointercancel', (e) => {
    isDragging = false;
    try { canvas.releasePointerCapture(e.pointerId); } catch (_) { }
  });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const factor = Math.exp(e.deltaY * 0.001);
    cameraDistance = THREE.MathUtils.clamp(cameraDistance * factor, MIN_DISTANCE, MAX_DISTANCE);
    updateCameraPosition();
  }, { passive: false });

  window.addEventListener('resize', onResize);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function updateBeamInteraction() {
  const beamOrigin = lighthouse.getTopWorldPosition();
  const beamDir = lighthouse.beamDirection.clone().normalize();
  const result = creatureSystem.getBeamHit(
    beamOrigin,
    beamDir,
    lighthouse.beamOpenAngle,
    12
  );

  if (result.hitCreatures.length > 0) {
    let cumulativeHue = 0;
    for (const c of result.hitCreatures) {
      creatureSystem.setBeamHitCreature(c, lighthouse.group.position);
      const hsl = { h: 0, s: 0, l: 0 };
      c.color.getHSL(hsl);
      cumulativeHue += hsl.h;
    }
    const avgHue = cumulativeHue / result.hitCreatures.length;
    beamHitColor = new THREE.Color().setHSL(avgHue, 0.9, 0.7);
    beamHitColorTimer = 0.3;

    lighthouse.lightBeamMaterial.color.copy(beamHitColor);
    lighthouse.lightBeamGlowMaterial.color.copy(beamHitColor);
  } else {
    if (beamHitColorTimer > 0) {
      beamHitColorTimer -= 0.016;
    } else {
      lighthouse.lightBeamMaterial.color.setHex(0xffffff);
      lighthouse.lightBeamGlowMaterial.color.setHex(0x88ccff);
    }
  }

  return result.inRangeCount;
}

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.elapsedTime;

  lighthouse.update(delta, elapsed);
  const inRangeCount = updateBeamInteraction();
  creatureSystem.update(delta, elapsed, inRangeCount);
  updateStars(elapsed);

  const bottomHaloScale = 1 + Math.sin(elapsed * 1.5) * 0.05;
  lighthouse.bottomHalo.scale.setScalar(bottomHaloScale);
  (lighthouse.bottomHalo.material as THREE.MeshBasicMaterial).opacity = 0.08 + 0.04 * (0.5 + 0.5 * Math.sin(elapsed * 2));

  renderer.render(scene, camera);
}

init();
animate();
