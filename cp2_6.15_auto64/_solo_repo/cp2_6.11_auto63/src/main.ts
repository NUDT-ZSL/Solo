import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { parseText, getEmotionColor, getEmotionName } from './emotionParser';
import type { EmotionType, SentenceResult } from './emotionParser';
import { buildStarScene, createHalo, removeHalo } from './starScene';
import type { StarObject, StarSceneBuildResult } from './starScene';
import { ParticleSystem } from './particleSystem';
import { audioEngine } from './audioEngine';

const app = document.getElementById('app') as HTMLDivElement;
const loader = document.getElementById('loader') as HTMLDivElement;
const textInput = document.getElementById('text-input') as HTMLTextAreaElement;
const countSpan = document.getElementById('count') as HTMLSpanElement;
const generateBtn = document.getElementById('generate-btn') as HTMLButtonElement;
const bubbleContainer = document.getElementById('bubble-container') as HTMLDivElement;

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let raycaster: THREE.Raycaster;
let pointer: THREE.Vector2;
let particleSystem: ParticleSystem;
let ambientLight: THREE.AmbientLight;

let starSceneGroup: THREE.Group | null = null;
let stars: StarObject[] = [];
let selectedStarIdx: number | null = null;
let hoveredStarIdx: number | null = null;
let lastScaleResetTimers: Map<number, ReturnType<typeof setTimeout>> = new Map();
let buildResult: StarSceneBuildResult | null = null;
let lastFrameTime = 0;
let frameCount = 0;
let fpsSmoothed = 60;
let lastPointerMove = 0;

function computeFovByWidth(): number {
  const w = window.innerWidth;
  if (w < 500) return 75;
  if (w < 800) return 65;
  if (w < 1200) return 55;
  return 48;
}

function initThree(): void {
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x050010, 0.018);

  const fov = computeFovByWidth();
  camera = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, 0.1, 200);
  const diag = Math.sqrt(window.innerWidth * window.innerWidth + window.innerHeight * window.innerHeight);
  const camDist = 36 + (diag < 900 ? 10 : 0);
  camera.position.set(camDist * 0.55, camDist * 0.75, camDist * 0.55);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.setClearColor(0x000000, 0);
  app.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = window.matchMedia('(pointer: coarse)').matches ? 0.12 : 0.08;
  controls.rotateSpeed = window.matchMedia('(pointer: coarse)').matches ? 0.7 : 1.0;
  controls.zoomSpeed = window.matchMedia('(pointer: coarse)').matches ? 0.7 : 1.0;
  controls.minDistance = 8;
  controls.maxDistance = 90;
  controls.enablePan = false;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.25;

  raycaster = new THREE.Raycaster();
  raycaster.params.Points = { threshold: 0.5 };
  pointer = new THREE.Vector2(-999, -999);

  ambientLight = new THREE.AmbientLight(0x3a2e5c, 0.55);
  scene.add(ambientLight);

  const hemi = new THREE.HemisphereLight(0x6a5acd, 0x0a0020, 0.35);
  scene.add(hemi);

  particleSystem = new ParticleSystem(500, 30);
  scene.add(particleSystem.points);

  const bgStars = createBgStars(1400);
  scene.add(bgStars);
}

function createBgStars(count: number): THREE.Points {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = 55 + Math.random() * 35;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
    const t = Math.random();
    const c1 = new THREE.Color(0x8a7cff);
    const c2 = new THREE.Color(0xffffff);
    const c3 = new THREE.Color(0xffd27a);
    let col: THREE.Color;
    if (t < 0.55) col = c2;
    else if (t < 0.8) col = c1;
    else col = c3;
    const dim = 0.5 + Math.random() * 0.5;
    colors[i * 3] = col.r * dim;
    colors[i * 3 + 1] = col.g * dim;
    colors[i * 3 + 2] = col.b * dim;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const m = new THREE.PointsMaterial({
    size: 0.12,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true
  });
  return new THREE.Points(g, m);
}

function clearBubbles(): void {
  while (bubbleContainer.firstChild) {
    bubbleContainer.removeChild(bubbleContainer.firstChild);
  }
}

function clearSelectedStar(): void {
  if (selectedStarIdx === null) return;
  const s = stars[selectedStarIdx];
  if (s) {
    s.selected = false;
    s.targetScale = s.baseScale;
    s.scaleAnimating = true;
  }
  selectedStarIdx = null;
  clearBubbles();
}

function createBubble(star: StarObject, screenX: number, screenY: number): HTMLDivElement {
  const bub = document.createElement('div');
  bub.className = 'text-bubble';
  const col = getEmotionColor(star.data.emotion);
  const tag = document.createElement('span');
  tag.className = 'bubble-emotion-tag';
  tag.style.background = `${col}33`;
  tag.style.color = col;
  tag.style.border = `1px solid ${col}66`;
  tag.textContent = getEmotionName(star.data.emotion);
  const txt = document.createElement('div');
  txt.className = 'bubble-text';
  txt.textContent = star.data.sentence;
  const arrow = document.createElement('div');
  arrow.className = 'bubble-arrow';
  bub.appendChild(tag);
  bub.appendChild(txt);
  bub.appendChild(arrow);
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  const topOffset = screenY;
  bub.style.left = `${Math.max(180, Math.min(vw - 180, screenX))}px`;
  bub.style.top = `${Math.max(120, topOffset)}px`;
  if (topOffset < 180) {
    bub.style.transform = 'translate(-50%, 0) translateY(12px)';
    arrow.style.top = '-8px';
    arrow.style.bottom = 'auto';
    arrow.style.transform = 'translateX(-50%) rotate(225deg)';
  }
  bubbleContainer.appendChild(bub);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => bub.classList.add('visible'));
  });
  bub.addEventListener('click', (e) => { e.stopPropagation(); }, { passive: true });
  return bub;
}

function positionBubbles(): void {
  if (!bubbleContainer.firstChild || selectedStarIdx === null) return;
  const s = stars[selectedStarIdx];
  if (!s) return;
  const pos = s.mesh.position.clone();
  pos.project(camera);
  const x = (pos.x * 0.5 + 0.5) * window.innerWidth;
  const y = (-pos.y * 0.5 + 0.5) * window.innerHeight;
  const bub = bubbleContainer.firstChild as HTMLDivElement;
  const vw = window.innerWidth;
  bub.style.left = `${Math.max(180, Math.min(vw - 180, x))}px`;
  const topOffset = y;
  const vh = window.innerHeight;
  if (topOffset < 180) {
    bub.style.top = `${Math.min(vh - 80, topOffset + 20)}px`;
    bub.style.transform = 'translate(-50%, 0) translateY(8px)';
    const arrow = bub.querySelector('.bubble-arrow') as HTMLDivElement;
    if (arrow) {
      arrow.style.top = '-8px';
      arrow.style.bottom = 'auto';
      arrow.style.transform = 'translateX(-50%) rotate(225deg)';
    }
  } else {
    bub.style.top = `${Math.max(140, topOffset)}px`;
    bub.style.transform = 'translate(-50%, -100%) translateY(-8px)';
    const arrow = bub.querySelector('.bubble-arrow') as HTMLDivElement;
    if (arrow) {
      arrow.style.bottom = '-8px';
      arrow.style.top = 'auto';
      arrow.style.transform = 'translateX(-50%) rotate(45deg)';
    }
  }
}

function findStarAt(x: number, y: number): number {
  pointer.x = (x / window.innerWidth) * 2 - 1;
  pointer.y = -(y / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  if (stars.length === 0) return -1;
  const meshes = stars.map(s => s.mesh);
  const hits = raycaster.intersectObjects(meshes, false);
  if (hits.length === 0) return -1;
  const obj = hits[0].object;
  for (let i = 0; i < stars.length; i++) {
    if (stars[i].mesh === obj) return i;
  }
  return -1;
}

function onPointerMove(e: PointerEvent): void {
  lastPointerMove = performance.now();
  if (controls.getState?.() !== undefined) {
    controls.autoRotate = false;
  }
  const idx = findStarAt(e.clientX, e.clientY);
  if (idx !== hoveredStarIdx) {
    if (hoveredStarIdx !== null) {
      const prev = stars[hoveredStarIdx];
      if (prev) {
        prev.hovered = false;
        if (!prev.selected) {
          removeHalo(prev, scene);
        }
      }
    }
    hoveredStarIdx = idx >= 0 ? idx : null;
    if (hoveredStarIdx !== null) {
      const curr = stars[hoveredStarIdx];
      if (curr) {
        curr.hovered = true;
        if (!curr.selected) {
          createHalo(curr, scene);
        }
        renderer.domElement.style.cursor = 'pointer';
      }
    } else {
      renderer.domElement.style.cursor = 'grab';
    }
  }
}

function onClick(e: MouseEvent): void {
  const target = e.target as HTMLElement;
  if (target.closest('#ui-panel') || target.closest('#legend') || target.closest('#hint')) {
    return;
  }
  audioEngine.ensureInit();
  const idx = findStarAt(e.clientX, e.clientY);
  if (idx >= 0) {
    const clicked = stars[idx];
    if (!clicked) return;
    if (selectedStarIdx === idx) {
      clearSelectedStar();
      return;
    }
    if (selectedStarIdx !== null) {
      const prev = stars[selectedStarIdx];
      if (prev) {
        prev.selected = false;
        prev.targetScale = prev.baseScale;
        prev.scaleAnimating = true;
        if (!prev.hovered) removeHalo(prev, scene);
      }
    }
    clearBubbles();
    for (const t of lastScaleResetTimers.values()) clearTimeout(t);
    lastScaleResetTimers.clear();
    clicked.selected = true;
    clicked.targetScale = clicked.baseScale * 1.5;
    clicked.scaleAnimating = true;
    if (!clicked.haloMesh) createHalo(clicked, scene);
    const pos = clicked.mesh.position.clone();
    pos.project(camera);
    const sx = (pos.x * 0.5 + 0.5) * window.innerWidth;
    const sy = (-pos.y * 0.5 + 0.5) * window.innerHeight;
    createBubble(clicked, sx, sy);
    selectedStarIdx = idx;
    audioEngine.playTone(clicked.data.mixedEmotions);
    return;
  }
  clearSelectedStar();
}

function onWindowResize(): void {
  const fov = computeFovByWidth();
  camera.fov = fov;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  positionBubbles();
}

function updateStarsAnim(dt: number): void {
  for (let i = 0; i < stars.length; i++) {
    const s = stars[i];
    if (s.scaleAnimating) {
      const diff = s.targetScale - s.currentScale;
      if (Math.abs(diff) < 0.003) {
        s.currentScale = s.targetScale;
        s.scaleAnimating = false;
      } else {
        s.currentScale += diff * Math.min(1, dt * 9);
      }
      s.mesh.scale.setScalar(s.currentScale);
      if (s.glowMesh) {
        s.glowMesh.scale.setScalar(s.currentScale * 1.9);
      }
    }
    s.haloPhase += dt * 2.2;
    if (s.haloMesh) {
      const haloMat = s.haloMesh.material as THREE.MeshBasicMaterial;
      const base = s.selected ? 0.38 : 0.22;
      const amp = s.selected ? 0.22 : 0.14;
      haloMat.opacity = base + Math.sin(s.haloPhase) * amp;
      const hScale = 1 + Math.sin(s.haloPhase * 0.9) * 0.05;
      s.haloMesh.scale.setScalar(hScale);
      s.haloMesh.position.copy(s.mesh.position);
      s.haloMesh.lookAt(camera.position);
    }
    if (s.hovered && !s.selected) {
    }
    const pulse = 1 + Math.sin(performance.now() * 0.0012 + i * 0.7) * 0.03;
    if (!s.scaleAnimating) {
      s.mesh.scale.setScalar(s.baseScale * pulse);
      if (s.glowMesh) s.glowMesh.scale.setScalar(s.baseScale * pulse * 1.9);
    }
    if (s.selected) {
      s.light.intensity = (0.9 + s.data.intensity * 1.0) * (1.2 + Math.sin(performance.now() * 0.004) * 0.2);
    }
  }
}

function animate(t: number): void {
  requestAnimationFrame(animate);
  const now = t * 0.001;
  const dt = lastFrameTime === 0 ? 0.016 : Math.min(0.05, now - lastFrameTime);
  lastFrameTime = now;

  frameCount++;
  fpsSmoothed = fpsSmoothed * 0.95 + (1 / Math.max(dt, 0.001)) * 0.05;

  controls.update();

  particleSystem.update(now);

  updateStarsAnim(dt);

  if (starSceneGroup) {
    starSceneGroup.rotation.y += dt * 0.01;
  }

  positionBubbles();

  renderer.render(scene, camera);
}

function generateFromText(): void {
  const text = textInput.value.trim();
  if (text.length < 3) {
    textInput.style.borderColor = 'rgba(220, 20, 60, 0.6)';
    setTimeout(() => { textInput.style.borderColor = ''; }, 1200);
    return;
  }
  if (starSceneGroup) {
    scene.remove(starSceneGroup);
    starSceneGroup = null;
  }
  for (const s of stars) {
    if (s.haloMesh) removeHalo(s, scene);
  }
  stars = [];
  selectedStarIdx = null;
  hoveredStarIdx = null;
  clearBubbles();

  generateBtn.disabled = true;
  generateBtn.textContent = '生 成 中...';

  setTimeout(() => {
    try {
      const results: SentenceResult[] = parseText(text);
      if (results.length === 0) {
        generateBtn.disabled = false;
        generateBtn.textContent = '生 成 星 图';
        return;
      }
      buildResult = buildStarScene(results);
      starSceneGroup = buildResult.group;
      stars = buildResult.stars;
      scene.add(starSceneGroup);
      particleSystem.setAverageEmotion(buildResult.dominantEmotion, buildResult.emotionDistribution);
    } catch (e) {
      console.error(e);
    } finally {
      generateBtn.disabled = false;
      generateBtn.textContent = '生 成 星 图';
    }
  }, 80);
}

function setupUi(): void {
  textInput.addEventListener('input', () => {
    let v = textInput.value;
    if (v.length > 500) {
      v = v.substring(0, 500);
      textInput.value = v;
    }
    countSpan.textContent = `${v.length}`;
  });
  textInput.addEventListener('click', () => {
    audioEngine.ensureInit();
  }, { once: true });
  generateBtn.addEventListener('click', generateFromText);
  textInput.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      generateFromText();
    }
  });
  renderer.domElement.addEventListener('pointermove', onPointerMove, { passive: true });
  renderer.domElement.addEventListener('click', onClick);
  window.addEventListener('resize', onWindowResize);

  const DEFAULT_TEXT = '今天阳光很好，我在公园散步时忍不住笑出了声，心里特别开心。可是一想到下周的重要考试，我又有点焦虑不安，怎么都平静不下来。深夜独自坐在窗前，看着温柔的月亮洒下银色的光辉，心中却异常平静安详。我笑不出来，只觉得莫名的悲伤和孤独，眼泪不受控制地流下来。';
  textInput.value = DEFAULT_TEXT;
  countSpan.textContent = `${DEFAULT_TEXT.length}`;
}

function boot(): void {
  initThree();
  setupUi();
  audioEngine.ensureInit();

  generateBtn.disabled = true;
  generateBtn.textContent = '加 载 中...';
  setTimeout(() => {
    generateFromText();
    loader.classList.add('hidden');
    setTimeout(() => {
      if (loader.parentElement) loader.parentElement.removeChild(loader);
    }, 900);
  }, 650);

  lastFrameTime = 0;
  requestAnimationFrame(animate);

  setInterval(() => {
    controls.autoRotate = performance.now() - lastPointerMove > 6000;
  }, 1500);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

void ambientLight;
void buildResult;
void fpsSmoothed;
void frameCount;
