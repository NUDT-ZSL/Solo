import * as THREE from 'three';
import { CrystalNode } from './crystalGrowth';

export interface SceneContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  crystalGroup: THREE.Group;
  starField: THREE.Points;
  ambientGlow: THREE.Mesh;
  branchMeshes: Map<number, THREE.Mesh>;
  noiseMeshes: Map<number, THREE.Points>;
  container: HTMLElement;
  cameraDistance: number;
  cameraYaw: number;
  cameraPitch: number;
  targetCameraDistance: number;
  targetCameraYaw: number;
  targetCameraPitch: number;
  sceneTime: number;
}

const STAR_COUNT = 100;
const STAR_SIZE = 0.01;
const GLOW_RADIUS = 2.5;
const MIN_CAMERA_DISTANCE = 0.5;
const MAX_CAMERA_DISTANCE = 5.0;
const INITIAL_CAMERA_DISTANCE = 2.5;
const INITIAL_YAW = Math.PI * 0.25;
const INITIAL_PITCH = Math.PI * 0.15;

export function createScene(containerId: string): SceneContext {
  const container = document.getElementById(containerId);
  if (!container) {
    throw new Error(`Container ${containerId} not found`);
  }

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0B0B2B, 0.35);

  const camera = new THREE.PerspectiveCamera(
    60,
    container.clientWidth / container.clientHeight,
    0.1,
    100
  );

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setClearColor(0x000000, 0);
  renderer.sortObjects = true;
  container.appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const directionalLight1 = new THREE.DirectionalLight(0x4A90D9, 0.8);
  directionalLight1.position.set(2, 3, 2);
  scene.add(directionalLight1);

  const directionalLight2 = new THREE.DirectionalLight(0xE74C3C, 0.4);
  directionalLight2.position.set(-2, -1, -2);
  scene.add(directionalLight2);

  const pointLight = new THREE.PointLight(0x9B59B6, 1.2, 6);
  pointLight.position.set(0, 1.5, 0);
  scene.add(pointLight);

  const crystalGroup = new THREE.Group();
  scene.add(crystalGroup);

  const starField = createStarField();
  scene.add(starField);

  const ambientGlow = createAmbientGlow();
  scene.add(ambientGlow);

  const ctx: SceneContext = {
    scene,
    camera,
    renderer,
    crystalGroup,
    starField,
    ambientGlow,
    branchMeshes: new Map(),
    noiseMeshes: new Map(),
    container,
    cameraDistance: INITIAL_CAMERA_DISTANCE,
    cameraYaw: INITIAL_YAW,
    cameraPitch: INITIAL_PITCH,
    targetCameraDistance: INITIAL_CAMERA_DISTANCE,
    targetCameraYaw: INITIAL_YAW,
    targetCameraPitch: INITIAL_PITCH,
    sceneTime: 0
  };

  updateCameraPosition(ctx);

  window.addEventListener('resize', () => handleResize(ctx));

  return ctx;
}

function createStarField(): THREE.Points {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(STAR_COUNT * 3);
  const colors = new Float32Array(STAR_COUNT * 3);
  const phases = new Float32Array(STAR_COUNT);

  for (let i = 0; i < STAR_COUNT; i++) {
    const i3 = i * 3;
    const radius = 3 + Math.random() * 2;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    
    positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i3 + 2] = radius * Math.cos(phi);

    const color = new THREE.Color();
    color.setHSL(0.6 + Math.random() * 0.2, 0.5 + Math.random() * 0.3, 0.7 + Math.random() * 0.3);
    colors[i3] = color.r;
    colors[i3 + 1] = color.g;
    colors[i3 + 2] = color.b;

    phases[i] = Math.random() * Math.PI * 2;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));

  const material = new THREE.PointsMaterial({
    size: STAR_SIZE,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  return new THREE.Points(geometry, material);
}

function createAmbientGlow(): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(GLOW_RADIUS, 32, 32);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      glowColor1: { value: new THREE.Color(0xFF8C42) },
      glowColor2: { value: new THREE.Color(0x4A90D9) }
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vPosition;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform vec3 glowColor1;
      uniform vec3 glowColor2;
      varying vec3 vNormal;
      varying vec3 vPosition;
      void main() {
        float intensity = pow(0.6 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
        float t = (sin(time * 0.3) + 1.0) * 0.5;
        vec3 color = mix(glowColor1, glowColor2, t);
        float dist = length(vPosition) / 2.5;
        float falloff = 1.0 - smoothstep(0.3, 1.0, dist);
        gl_FragColor = vec4(color, intensity * falloff * 0.35);
      }
    `,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false
  });

  return new THREE.Mesh(geometry, material);
}

function createBranchMaterial(color: THREE.Color, opacity: number): THREE.MeshPhongMaterial {
  return new THREE.MeshPhongMaterial({
    color: color.clone(),
    transparent: true,
    opacity: opacity,
    shininess: 80,
    specular: new THREE.Color(0xffffff),
    emissive: color.clone().multiplyScalar(0.15),
    side: THREE.DoubleSide,
    depthWrite: true
  });
}

function createBranchMesh(node: CrystalNode): THREE.Mesh {
  const direction = new THREE.Vector3().subVectors(node.end, node.start);
  let length = direction.length();
  
  if (length < 0.001) {
    length = 0.01;
  }

  const geometry = new THREE.CylinderGeometry(
    node.thickness * 0.6,
    node.thickness,
    length,
    8,
    1
  );

  const material = createBranchMaterial(node.color, node.opacity);

  const mesh = new THREE.Mesh(geometry, material);

  const midPoint = new THREE.Vector3().addVectors(node.start, node.end).multiplyScalar(0.5);
  mesh.position.copy(midPoint);

  const upVector = new THREE.Vector3(0, 1, 0);
  direction.normalize();
  const quaternion = new THREE.Quaternion().setFromUnitVectors(upVector, direction);
  mesh.quaternion.copy(quaternion);

  mesh.userData = { nodeId: node.id, type: 'branch' };

  return mesh;
}

function createNoisePoints(node: CrystalNode): THREE.Points {
  if (node.noisePoints.length === 0) {
    return new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial());
  }

  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(node.noisePoints.length * 3);

  for (let i = 0; i < node.noisePoints.length; i++) {
    const i3 = i * 3;
    positions[i3] = node.noisePoints[i].x;
    positions[i3 + 1] = node.noisePoints[i].y;
    positions[i3 + 2] = node.noisePoints[i].z;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: node.color.clone().multiplyScalar(1.2),
    size: 0.008,
    transparent: true,
    opacity: node.opacity * 0.6,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const points = new THREE.Points(geometry, material);
  points.userData = { nodeId: node.id, type: 'noise' };
  return points;
}

export function updateCrystalBranches(ctx: SceneContext, nodes: CrystalNode[]): void {
  const activeIds = new Set<number>();

  for (const node of nodes) {
    activeIds.add(node.id);

    let mesh = ctx.branchMeshes.get(node.id);
    if (!mesh) {
      mesh = createBranchMesh(node);
      ctx.branchMeshes.set(node.id, mesh);
      ctx.crystalGroup.add(mesh);
    }

    const material = mesh.material as THREE.MeshPhongMaterial;
    if (node.isBlinking) {
      material.opacity = node.blinkPhase;
    } else {
      material.opacity = node.opacity;
    }
    material.color.copy(node.color);
    material.emissive.copy(node.color).multiplyScalar(0.15);
    material.needsUpdate = true;

    let noiseMesh = ctx.noiseMeshes.get(node.id);
    if (!noiseMesh && node.noisePoints.length > 0) {
      noiseMesh = createNoisePoints(node);
      ctx.noiseMeshes.set(node.id, noiseMesh);
      ctx.crystalGroup.add(noiseMesh);
    }
  }

  const idsToRemove: number[] = [];
  for (const [id, mesh] of ctx.branchMeshes) {
    if (!activeIds.has(id)) {
      ctx.crystalGroup.remove(mesh);
      mesh.geometry.dispose();
      if (mesh.material instanceof THREE.Material) {
        mesh.material.dispose();
      }
      idsToRemove.push(id);
    }
  }
  for (const id of idsToRemove) {
    ctx.branchMeshes.delete(id);
  }

  const noiseIdsToRemove: number[] = [];
  for (const [id, noiseMesh] of ctx.noiseMeshes) {
    if (!activeIds.has(id)) {
      ctx.crystalGroup.remove(noiseMesh);
      noiseMesh.geometry.dispose();
      if (noiseMesh.material instanceof THREE.Material) {
        noiseMesh.material.dispose();
      }
      noiseIdsToRemove.push(id);
    }
  }
  for (const id of noiseIdsToRemove) {
    ctx.noiseMeshes.delete(id);
  }
}

export function removeBranchMeshes(ctx: SceneContext, nodeIds: number[]): void {
  for (const id of nodeIds) {
    const mesh = ctx.branchMeshes.get(id);
    if (mesh) {
      ctx.crystalGroup.remove(mesh);
      mesh.geometry.dispose();
      if (mesh.material instanceof THREE.Material) {
        mesh.material.dispose();
      }
      ctx.branchMeshes.delete(id);
    }

    const noiseMesh = ctx.noiseMeshes.get(id);
    if (noiseMesh) {
      ctx.crystalGroup.remove(noiseMesh);
      noiseMesh.geometry.dispose();
      if (noiseMesh.material instanceof THREE.Material) {
        noiseMesh.material.dispose();
      }
      ctx.noiseMeshes.delete(id);
    }
  }
}

function updateCameraPosition(ctx: SceneContext): void {
  const yaw = ctx.cameraYaw;
  const pitch = ctx.cameraPitch;
  const distance = ctx.cameraDistance;

  const x = distance * Math.cos(pitch) * Math.sin(yaw);
  const y = distance * Math.sin(pitch);
  const z = distance * Math.cos(pitch) * Math.cos(yaw);

  ctx.camera.position.set(x, y, z);
  ctx.camera.lookAt(0, 0.3, 0);
}

export function updateCameraSmooth(ctx: SceneContext, deltaTime: number): void {
  const smoothFactor = 1 - Math.pow(0.001, deltaTime);
  
  ctx.cameraYaw += (ctx.targetCameraYaw - ctx.cameraYaw) * smoothFactor;
  ctx.cameraPitch += (ctx.targetCameraPitch - ctx.cameraPitch) * smoothFactor;
  ctx.cameraDistance += (ctx.targetCameraDistance - ctx.cameraDistance) * smoothFactor;

  ctx.cameraPitch = Math.max(-Math.PI * 0.45, Math.min(Math.PI * 0.45, ctx.cameraPitch));
  ctx.cameraDistance = Math.max(MIN_CAMERA_DISTANCE, Math.min(MAX_CAMERA_DISTANCE, ctx.cameraDistance));

  updateCameraPosition(ctx);
}

export function updateSceneAnimation(ctx: SceneContext, deltaTime: number): void {
  ctx.sceneTime += deltaTime;

  const phases = ctx.starField.geometry.getAttribute('phase') as THREE.BufferAttribute;
  const colors = ctx.starField.geometry.getAttribute('color') as THREE.BufferAttribute;
  const originalColors = (ctx.starField.geometry as any)._originalColors;
  
  if (!originalColors) {
    (ctx.starField.geometry as any)._originalColors = new Float32Array(colors.array);
    return;
  }
  
  for (let i = 0; i < STAR_COUNT; i++) {
    const i3 = i * 3;
    const phase = (phases.array as Float32Array)[i];
    const cycleTime = 3 + (phase / (Math.PI * 2)) * 2;
    const t = (ctx.sceneTime % cycleTime) / cycleTime;
    const brightness = 0.4 + Math.sin(t * Math.PI * 2) * 0.4;
    
    (colors.array as Float32Array)[i3] = originalColors[i3] * brightness;
    (colors.array as Float32Array)[i3 + 1] = originalColors[i3 + 1] * brightness;
    (colors.array as Float32Array)[i3 + 2] = originalColors[i3 + 2] * brightness;
  }
  colors.needsUpdate = true;

  const glowMaterial = ctx.ambientGlow.material as THREE.ShaderMaterial;
  glowMaterial.uniforms.time.value = ctx.sceneTime;

  ctx.ambientGlow.rotation.y += deltaTime * 0.05;
}

function handleResize(ctx: SceneContext): void {
  const width = ctx.container.clientWidth;
  const height = ctx.container.clientHeight;

  ctx.camera.aspect = width / height;
  ctx.camera.updateProjectionMatrix();

  ctx.renderer.setSize(width, height);
}

export function render(ctx: SceneContext): void {
  ctx.renderer.render(ctx.scene, ctx.camera);
}

export function disposeScene(ctx: SceneContext): void {
  for (const mesh of ctx.branchMeshes.values()) {
    mesh.geometry.dispose();
    if (mesh.material instanceof THREE.Material) {
      mesh.material.dispose();
    }
  }
  ctx.branchMeshes.clear();

  for (const points of ctx.noiseMeshes.values()) {
    points.geometry.dispose();
    if (points.material instanceof THREE.Material) {
      points.material.dispose();
    }
  }
  ctx.noiseMeshes.clear();

  ctx.starField.geometry.dispose();
  if (ctx.starField.material instanceof THREE.Material) {
    ctx.starField.material.dispose();
  }

  ctx.ambientGlow.geometry.dispose();
  if (ctx.ambientGlow.material instanceof THREE.Material) {
    ctx.ambientGlow.material.dispose();
  }

  ctx.renderer.dispose();
}
