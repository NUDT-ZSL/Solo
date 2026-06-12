import * as THREE from 'three';
import { generateLSystem, parseBranches, LSystemParams } from './lsystem';
import {
  buildTree,
  dissolveAnimation,
  growInAnimation,
  playbackGrowthAnimation,
  createParticleBurst,
  dissolveParticles,
  gatherParticles,
  TreeBuildResult,
} from './treeBuilder';
import { createPanel, PanelParams } from './panel';
import { getPreset, getAllPresets } from './presets';

declare global {
  interface Window {
    THREE: typeof THREE;
    OrbitControls: any;
  }
}

const app = document.getElementById('app');
if (!app) {
  throw new Error('Container #app not found');
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);
scene.fog = new THREE.Fog(0x1a1a2e, 50, 200);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 30, 60);
camera.lookAt(0, 20, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.pixelRatio = Math.min(window.devicePixelRatio, 2);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
app.appendChild(renderer.domElement);

const controls = new (window as any).OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.9;
controls.maxPolarAngle = Math.PI / 2;
controls.target.set(0, 20, 0);

const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x2d4a3e, 0.6);
scene.add(hemisphereLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(50, 100, 50);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 500;
directionalLight.shadow.camera.left = -100;
directionalLight.shadow.camera.right = 100;
directionalLight.shadow.camera.top = 100;
directionalLight.shadow.camera.bottom = -100;
scene.add(directionalLight);

const groundGeometry = new THREE.PlaneGeometry(200, 200);
const groundMaterial = new THREE.MeshStandardMaterial({
  color: 0x1a2f1a,
  roughness: 0.9,
  metalness: 0.1,
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const gridHelper = new THREE.GridHelper(200, 50, 0x00ff88, 0x0a2f1a);
gridHelper.position.y = 0.01;
gridHelper.material.opacity = 0.3;
gridHelper.material.transparent = true;
scene.add(gridHelper);

let currentParams: LSystemParams = {
  iterations: 5,
  trunkLength: 20,
  branchAngle: 30,
  lengthDecay: 0.75,
  leafDensity: 0.5,
};

let currentTree: TreeBuildResult | null = null;
let isAnimating: boolean = false;
let isGrowingPlayback: boolean = false;
let isPaused: boolean = false;
const fpsHistory: number[] = [];
let qualityLevel: 0 | 1 | 2 = 0;

let statusBarElement: HTMLElement | null = null;
let fpsDisplayElement: HTMLElement | null = null;
let iterationsDisplayElement: HTMLElement | null = null;
let branchCountDisplayElement: HTMLElement | null = null;
let leafCountDisplayElement: HTMLElement | null = null;

function createStatusBar(): void {
  statusBarElement = document.createElement('div');
  statusBarElement.style.cssText = `
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 40px;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    padding: 0 24px;
    box-sizing: border-box;
    gap: 32px;
    z-index: 999;
    border-top: 1px solid rgba(0, 255, 136, 0.2);
  `;

  fpsDisplayElement = document.createElement('div');
  fpsDisplayElement.style.cssText = `
    font-family: monospace;
    font-size: 12px;
    color: #00ff88;
    text-shadow: 0 0 6px rgba(0, 255, 136, 0.6);
  `;
  fpsDisplayElement.textContent = 'FPS: --';

  iterationsDisplayElement = document.createElement('div');
  iterationsDisplayElement.style.cssText = `
    font-family: monospace;
    font-size: 12px;
    color: #00ff88;
    text-shadow: 0 0 6px rgba(0, 255, 136, 0.6);
  `;
  iterationsDisplayElement.textContent = '迭代: --';

  branchCountDisplayElement = document.createElement('div');
  branchCountDisplayElement.style.cssText = `
    font-family: monospace;
    font-size: 12px;
    color: #00ff88;
    text-shadow: 0 0 6px rgba(0, 255, 136, 0.6);
  `;
  branchCountDisplayElement.textContent = '分支: --';

  leafCountDisplayElement = document.createElement('div');
  leafCountDisplayElement.style.cssText = `
    font-family: monospace;
    font-size: 12px;
    color: #00ff88;
    text-shadow: 0 0 6px rgba(0, 255, 136, 0.6);
  `;
  leafCountDisplayElement.textContent = '叶子: --';

  statusBarElement.appendChild(fpsDisplayElement);
  statusBarElement.appendChild(iterationsDisplayElement);
  statusBarElement.appendChild(branchCountDisplayElement);
  statusBarElement.appendChild(leafCountDisplayElement);

  document.body.appendChild(statusBarElement);
}

function updateStatusBar(
  fps: number,
  iterations: number,
  branchCount: number,
  leafCount: number
): void {
  if (fpsDisplayElement) {
    fpsDisplayElement.textContent = `FPS: ${fps.toFixed(0)}`;
  }
  if (iterationsDisplayElement) {
    iterationsDisplayElement.textContent = `迭代: ${iterations}`;
  }
  if (branchCountDisplayElement) {
    branchCountDisplayElement.textContent = `分支: ${branchCount}`;
  }
  if (leafCountDisplayElement) {
    leafCountDisplayElement.textContent = `叶子: ${leafCount}`;
  }
}

function panelParamsToLSystemParams(panelParams: PanelParams): LSystemParams {
  return {
    iterations: panelParams.iterations,
    trunkLength: panelParams.trunkLength,
    branchAngle: panelParams.branchAngle,
    lengthDecay: panelParams.decayFactor,
    leafDensity: panelParams.leafDensity,
  };
}

let particles: THREE.Points | null = null;

async function rebuildTree(
  newParams: LSystemParams,
  isPresetSwitch: boolean = false
): Promise<void> {
  if (isAnimating) {
    return;
  }

  isAnimating = true;
  currentParams = { ...newParams };

  if (isPresetSwitch && currentTree) {
    particles = createParticleBurst(new THREE.Vector3(0, 20, 0), 100);
    scene.add(particles);

    await dissolveParticles(particles, 1);
    await gatherParticles(particles, new THREE.Vector3(0, 20, 0), 1.2);

    scene.remove(particles);
    particles.geometry.dispose();
    (particles.material as THREE.Material).dispose();
    particles = null;
  } else if (currentTree) {
    await dissolveAnimation(currentTree, 0.5);
  }

  if (currentTree) {
    scene.remove(currentTree.group);
    currentTree.branchMeshes.flat().forEach(m => {
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    });
    currentTree.leafMeshes.flat().forEach(m => {
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    });
  }

  const adjustedParams = { ...currentParams };
  if (qualityLevel === 1) {
    adjustedParams.leafDensity = Math.max(0.1, currentParams.leafDensity * 0.6);
  } else if (qualityLevel === 2) {
    adjustedParams.leafDensity = Math.max(0.05, currentParams.leafDensity * 0.3);
    adjustedParams.iterations = Math.max(3, currentParams.iterations - 1);
  }

  const lSystemString = generateLSystem(adjustedParams);
  const branches = parseBranches(adjustedParams, lSystemString);
  currentTree = buildTree(branches, adjustedParams);

  scene.add(currentTree.group);

  await growInAnimation(currentTree, 2);

  updateStatusBar(
    60,
    adjustedParams.iterations,
    currentTree.branchCount,
    currentTree.leafCount
  );

  isAnimating = false;
}

async function startGrowthPlayback(): Promise<void> {
  if (!currentTree || isAnimating) {
    return;
  }

  isAnimating = true;
  isGrowingPlayback = true;
  isPaused = false;

  const { branchMeshes, leafMeshes, maxDepth } = currentTree;
  for (let d = 0; d <= maxDepth; d++) {
    [...branchMeshes[d], ...leafMeshes[d]].forEach(m => {
      m.visible = false;
    });
  }

  panel.updateState(true);

  await playbackGrowthAnimation(
    currentTree,
    0.3,
    (currentLayer, totalLayers) => {
      if (currentTree) {
        updateStatusBar(
          60,
          currentParams.iterations,
          currentTree.branchCount,
          currentTree.leafCount
        );
      }
    },
    () => {
      isGrowingPlayback = false;
      isAnimating = false;
      panel.updateState(false);
    }
  );
}

function pauseGrowthPlayback(): void {
  isPaused = true;
}

function takeSnapshot(): void {
  renderer.render(scene, camera);
  const dataURL = renderer.domElement.toDataURL('image/png');
  
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  const filename = `fractal_tree_${year}${month}${day}_${hours}${minutes}${seconds}.png`;
  
  const link = document.createElement('a');
  link.href = dataURL;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function handleWindowResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', handleWindowResize);

let frameCount = 0;
let lastFpsUpdateTime = performance.now();
let currentFps = 60;
let lowFpsFrameCount = 0;
let highFpsFrameCount = 0;

function animate(): void {
  requestAnimationFrame(animate);

  const now = performance.now();
  frameCount++;

  if (frameCount % 10 === 0) {
    const deltaTime = (now - lastFpsUpdateTime) / 1000;
    currentFps = 10 / deltaTime;
    lastFpsUpdateTime = now;

    fpsHistory.push(currentFps);
    if (fpsHistory.length > 60) {
      fpsHistory.shift();
    }

    const avgFps = fpsHistory.reduce((a, b) => a + b, 0) / fpsHistory.length;

    if (currentTree) {
      updateStatusBar(
        currentFps,
        currentParams.iterations,
        currentTree.branchCount,
        currentTree.leafCount
      );
    }

    if (qualityLevel < 2) {
      if (avgFps < 30) {
        lowFpsFrameCount++;
        if (lowFpsFrameCount >= 5) {
          qualityLevel = (qualityLevel + 1) as 0 | 1 | 2;
          renderer.pixelRatio = qualityLevel === 2 ? 1 : Math.min(window.devicePixelRatio, 1.5);
          lowFpsFrameCount = 0;
          rebuildTree(currentParams, false);
        }
      } else {
        lowFpsFrameCount = 0;
      }
    }

    if (qualityLevel > 0) {
      if (avgFps > 45) {
        highFpsFrameCount++;
        if (highFpsFrameCount >= 30) {
          qualityLevel = (qualityLevel - 1) as 0 | 1 | 2;
          renderer.pixelRatio = qualityLevel === 0 ? Math.min(window.devicePixelRatio, 2) : Math.min(window.devicePixelRatio, 1.5);
          highFpsFrameCount = 0;
          rebuildTree(currentParams, false);
        }
      } else {
        highFpsFrameCount = 0;
      }
    }
  }

  if (currentTree && !isAnimating) {
    const time = now / 1000;
    const swayAngle = Math.sin(time * Math.PI / 2) * (5 * Math.PI / 180);
    currentTree.group.rotation.z = swayAngle;
  }

  controls.update();
  renderer.render(scene, camera);
}

const panel = createPanel(app, {
  onParamChange: (panelParams: PanelParams) => {
    const lSystemParams = panelParamsToLSystemParams(panelParams);
    rebuildTree(lSystemParams, false);
  },
  onGrow: () => {
    startGrowthPlayback();
  },
  onPause: () => {
    pauseGrowthPlayback();
  },
  onSnapshot: () => {
    takeSnapshot();
  },
  onPresetChange: (presetName: string) => {
    const preset = getPreset(presetName);
    if (preset) {
      rebuildTree(preset.params, true);
    }
  },
});

createStatusBar();

async function initialize(): Promise<void> {
  const lSystemString = generateLSystem(currentParams);
  const branches = parseBranches(currentParams, lSystemString);
  currentTree = buildTree(branches, currentParams);
  scene.add(currentTree.group);

  await growInAnimation(currentTree, 2);

  updateStatusBar(
    60,
    currentParams.iterations,
    currentTree.branchCount,
    currentTree.leafCount
  );

  animate();
}

initialize();
