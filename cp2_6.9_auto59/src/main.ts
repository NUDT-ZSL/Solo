import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ModelLoader } from './ModelLoader';
import { AnnotationSystem } from './AnnotationSystem';
import { AnimationLoop } from './AnimationLoop';

export let renderer: THREE.WebGLRenderer;
export let scene: THREE.Scene;
export let camera: THREE.PerspectiveCamera;
export let controls: OrbitControls;

let loadedGroup: THREE.Group | null = null;
let annotationSystem: AnnotationSystem | null = null;
let animationLoop: AnimationLoop | null = null;
let modelLoader: ModelLoader | null = null;

const loadingProgressEl = document.getElementById('loading-progress');
const loadingTextEl = document.getElementById('loading-text');
const loadingContainerEl = document.getElementById('loading-container');

async function init(): Promise<void> {
  const container = document.getElementById('canvas-container');
  if (!container) {
    console.error('Canvas container not found');
    return;
  }

  scene = new THREE.Scene();
  scene.background = null;

  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(0, 1.5, 5);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;
  controls.enablePan = true;
  controls.enableZoom = true;
  controls.enableRotate = true;
  controls.minDistance = 2;
  controls.maxDistance = 8;
  controls.zoomSpeed = 0.8;
  controls.rotateSpeed = 0.6;
  controls.panSpeed = 0.5;
  controls.minPolarAngle = THREE.MathUtils.degToRad(30);
  controls.maxPolarAngle = THREE.MathUtils.degToRad(120);
  controls.target.set(0, 0, 0);
  controls.update();

  window.addEventListener('resize', onWindowResize);

  modelLoader = new ModelLoader();

  try {
    loadedGroup = await modelLoader.load('bronze-vessel', {
      onProgress: (stage: number, message: string) => {
        updateLoadingProgress(stage, message);
      }
    });

    if (loadedGroup) {
      scene.add(loadedGroup);
      await initializeSystems();
      hideLoading();
      setupControlPanel();
    }
  } catch (error) {
    console.error('加载模型失败:', error);
    if (loadingTextEl) {
      loadingTextEl.textContent = '加载失败，请刷新页面重试';
    }
  }
}

async function initializeSystems(): Promise<void> {
  if (!loadedGroup || !scene || !camera || !renderer) return;

  const vesselMesh = loadedGroup.children.find(
    child => child.name === 'BronzeVessel'
  ) as THREE.Mesh;

  if (!vesselMesh) {
    console.error('青铜觚模型未找到');
    return;
  }

  annotationSystem = new AnnotationSystem(
    scene,
    camera,
    renderer,
    vesselMesh
  );

  animationLoop = new AnimationLoop(
    renderer,
    scene,
    camera,
    controls,
    loadedGroup,
    annotationSystem
  );

  animationLoop.start();
}

function updateLoadingProgress(stage: number, message: string): void {
  if (!loadingProgressEl || !loadingTextEl) return;

  const progress = (stage / 3) * 100;
  loadingProgressEl.style.width = `${progress}%`;
  loadingTextEl.textContent = message;
}

function hideLoading(): void {
  if (loadingContainerEl) {
    setTimeout(() => {
      loadingContainerEl.style.transition = 'opacity 0.5s ease';
      loadingContainerEl.style.opacity = '0';
      setTimeout(() => {
        if (loadingContainerEl.parentNode) {
          loadingContainerEl.parentNode.removeChild(loadingContainerEl);
        }
      }, 500);
    }, 300);
  }
}

function setupControlPanel(): void {
  const ambientSlider = document.getElementById('ambient-slider') as HTMLInputElement;
  const ambientValue = document.getElementById('ambient-value');
  const rotationSlider = document.getElementById('rotation-slider') as HTMLInputElement;
  const rotationValue = document.getElementById('rotation-value');
  const textureSlider = document.getElementById('texture-slider') as HTMLInputElement;
  const textureValue = document.getElementById('texture-value');
  const rotationToggle = document.getElementById('rotation-toggle') as HTMLButtonElement;

  if (ambientSlider && ambientValue && loadedGroup) {
    ambientSlider.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      const value = parseFloat(target.value);
      ambientValue.textContent = value.toFixed(2);
      const ambientLight = loadedGroup?.children.find(
        child => child.name === 'AmbientLight'
      ) as THREE.AmbientLight;
      if (ambientLight) {
        ambientLight.intensity = value;
      }
    });
  }

  if (rotationSlider && rotationValue && animationLoop) {
    rotationSlider.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      const value = parseFloat(target.value);
      rotationValue.textContent = value.toFixed(4);
      animationLoop?.setRotationSpeed(value);
    });
  }

  if (textureSlider && textureValue && modelLoader) {
    textureSlider.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      const value = parseFloat(target.value);
      textureValue.textContent = value.toFixed(2);
      modelLoader?.setTextureIntensity(value);
    });
  }

  if (rotationToggle && animationLoop) {
    rotationToggle.addEventListener('click', () => {
      const enabled = !animationLoop?.isAutoRotateEnabled();
      animationLoop?.setAutoRotateEnabled(enabled);
      rotationToggle.textContent = `自转：${enabled ? '开启' : '关闭'}`;
      if (enabled) {
        rotationToggle.classList.add('active');
      } else {
        rotationToggle.classList.remove('active');
      }
    });
  }
}

function onWindowResize(): void {
  if (!camera || !renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

init().catch(console.error);
