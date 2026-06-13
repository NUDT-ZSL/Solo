import * as THREE from 'three';
import {
  generateNeurons,
  updateNeuronPositions,
  getNeighborsWithinRange,
  hexToRgb,
  Neuron,
  Dendrite,
  BezierSegment,
  Vec3,
  ControlParams
} from '../module-core/neuronSystem';

interface NeuronVisual {
  neuron: Neuron;
  neuronGroup: THREE.Group;
  somaMesh: THREE.Mesh;
  dendriteMeshes: THREE.Mesh[];
  baseSomaMaterial: THREE.MeshBasicMaterial;
  baseDendriteMaterials: THREE.MeshBasicMaterial[];
}

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  active: boolean;
}

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let container: HTMLElement;
let neuronVisuals: NeuronVisual[] = [];
let neurons: Neuron[] = [];
let raycaster: THREE.Raycaster;
let pointer: THREE.Vector2;
let hoveredNeuron: Neuron | null = null;
let isDragging: boolean = false;
let dragStartPos: { x: number; y: number } = { x: 0, y: 0 };
let lastDragFiredId: number = -1;
let lastFrameTime: number = 0;
let animationId: number = 0;
let cameraAngleTheta: number = 0.3;
let cameraAnglePhi: number = 1.1;
let cameraDistance: number = 360;
let cameraTargetTheta: number = 0.3;
let cameraTargetPhi: number = 1.1;
let cameraTargetDistance: number = 360;
let isCameraDragging: boolean = false;
let cameraDragStart: { x: number; y: number } | null = null;

let particlePool: Particle[] = [];
const MAX_PARTICLES = 2000;
const PARTICLE_LIFETIME = 1200;

let controlParams: ControlParams = {
  triggerRange: 50,
  propagationDelay: 200,
  particleCount: 20
};

const somaMeshesForRaycast: THREE.Mesh[] = [];

function createSomaMaterial(hexColor: string, opacity: number): THREE.MeshBasicMaterial {
  const rgb = hexToRgb(hexColor);
  return new THREE.MeshBasicMaterial({
    color: new THREE.Color(rgb.r, rgb.g, rgb.b),
    transparent: true,
    opacity,
    depthWrite: false
  });
}

function createDendriteMaterial(hexColor: string, opacity: number): THREE.MeshBasicMaterial {
  const rgb = hexToRgb(hexColor);
  return new THREE.MeshBasicMaterial({
    color: new THREE.Color(rgb.r, rgb.g, rgb.b),
    transparent: true,
    opacity,
    depthWrite: false
  });
}

function createDendriteTube(
  dendrite: Dendrite,
  baseMaterial: THREE.MeshBasicMaterial
): THREE.Mesh {
  const points: THREE.Vector3[] = [];
  const taperValues: number[] = [];
  const totalSegments = dendrite.segments.length;

  dendrite.segments.forEach((seg: BezierSegment, segIdx: number) => {
    const curve = new THREE.CubicBezierCurve3(
      new THREE.Vector3(seg.p0.x, seg.p0.y, seg.p0.z),
      new THREE.Vector3(seg.p1.x, seg.p1.y, seg.p1.z),
      new THREE.Vector3(seg.p2.x, seg.p2.y, seg.p2.z),
      new THREE.Vector3(seg.p3.x, seg.p3.y, seg.p3.z)
    );
    const segSamples = 12;
    for (let i = 0; i <= segSamples; i++) {
      if (segIdx < totalSegments - 1 || i < segSamples) {
        const t = i / segSamples;
        const overallT = (segIdx + t) / totalSegments;
        const p = curve.getPoint(t);
        points.push(p);
        const radius =
          dendrite.taperStart * (1 - overallT) + dendrite.taperEnd * overallT;
        taperValues.push(radius);
      }
    }
  });

  if (points.length < 2) {
    points.push(new THREE.Vector3(0, 0, 0));
    points.push(new THREE.Vector3(1, 0, 0));
    taperValues.push(dendrite.taperStart, dendrite.taperEnd);
  }

  let curveLength = 0;
  for (let i = 1; i < points.length; i++) {
    curveLength += points[i].distanceTo(points[i - 1]);
  }

  const curvePath = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.2);
  const avgRadius = taperValues.reduce((a, b) => a + b, 0) / taperValues.length;
  const segmentsPerUnit = 0.35;
  const tubularSegments = Math.max(6, Math.min(20, Math.round(curveLength * segmentsPerUnit)));

  const geometry = new THREE.TubeGeometry(curvePath, tubularSegments, avgRadius, 6, false);
  const material = baseMaterial.clone();
  return new THREE.Mesh(geometry, material);
}

function buildNeuronVisuals() {
  for (const nv of neuronVisuals) {
    scene.remove(nv.neuronGroup);
    nv.baseSomaMaterial.dispose();
    (nv.somaMesh.geometry as THREE.BufferGeometry).dispose();
    for (let i = 0; i < nv.dendriteMeshes.length; i++) {
      nv.baseDendriteMaterials[i].dispose();
      (nv.dendriteMeshes[i].geometry as THREE.BufferGeometry).dispose();
    }
  }
  neuronVisuals = [];
  somaMeshesForRaycast.length = 0;

  for (const neuron of neurons) {
    const rgb = hexToRgb(neuron.palette.hex);
    const neuronGroup = new THREE.Group();
    neuronGroup.position.set(neuron.position.x, neuron.position.y, neuron.position.z);
    scene.add(neuronGroup);

    const somaGeometry = new THREE.SphereGeometry(neuron.somaRadius, 24, 18);
    const somaMaterial = createSomaMaterial(neuron.palette.hex, 0.7);
    const somaMesh = new THREE.Mesh(somaGeometry, somaMaterial);
    somaMesh.userData.neuronId = neuron.id;
    somaMesh.userData.isSoma = true;
    neuronGroup.add(somaMesh);
    somaMeshesForRaycast.push(somaMesh);

    const dendriteMeshes: THREE.Mesh[] = [];
    const dendriteMaterials: THREE.MeshBasicMaterial[] = [];
    const dendriteBaseMat = createDendriteMaterial(neuron.palette.lightHex, 0.4);

    for (const dendrite of neuron.dendrites) {
      const mat = dendriteBaseMat.clone();
      dendriteMaterials.push(mat);
      const tube = createDendriteTube(dendrite, mat);
      tube.userData.neuronId = neuron.id;
      tube.userData.isDendrite = true;
      neuronGroup.add(tube);
      dendriteMeshes.push(tube);
    }
    dendriteBaseMat.dispose();

    neuronVisuals.push({
      neuron,
      neuronGroup,
      somaMesh,
      dendriteMeshes,
      baseSomaMaterial: somaMaterial,
      baseDendriteMaterials: dendriteMaterials
    });
  }
}

function initParticlePool() {
  for (const p of particlePool) {
    scene.remove(p.mesh);
    (p.mesh.geometry as THREE.BufferGeometry).dispose();
    (p.mesh.material as THREE.Material).dispose();
  }
  particlePool = [];

  for (let i = 0; i < MAX_PARTICLES; i++) {
    const geo = new THREE.SphereGeometry(1, 6, 4);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.visible = false;
    scene.add(mesh);
    particlePool.push({
      mesh,
      velocity: new THREE.Vector3(),
      life: 0,
      maxLife: PARTICLE_LIFETIME,
      active: false
    });
  }
}

function spawnParticles(neuron: Neuron, count: number) {
  const rgb = hexToRgb(neuron.palette.hex);
  let spawned = 0;

  for (let i = 0; i < particlePool.length && spawned < count; i++) {
    const p = particlePool[i];
    if (!p.active) {
      p.active = true;
      p.life = PARTICLE_LIFETIME;
      p.maxLife = PARTICLE_LIFETIME;

      const diameter = 5 + Math.random() * 5;
      (p.mesh.scale as THREE.Vector3).set(diameter, diameter, diameter);
      const spawnR = neuron.somaRadius + 1;
      const spawnDir = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5
      ).normalize();
      p.mesh.position.set(
        neuron.position.x + spawnDir.x * spawnR,
        neuron.position.y + spawnDir.y * spawnR,
        neuron.position.z + spawnDir.z * spawnR
      );
      (p.mesh.material as THREE.MeshBasicMaterial).color.setRGB(rgb.r, rgb.g, rgb.b);
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = 1;
      p.mesh.visible = true;

      const speed = 30 + Math.random() * 30;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      p.velocity.set(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.sin(phi) * Math.sin(theta) * speed,
        Math.cos(phi) * speed
      );
      spawned++;
    }
  }
}

function updateParticles(dt: number) {
  const dtSec = dt / 1000;
  for (const p of particlePool) {
    if (!p.active) continue;
    p.life -= dt;
    if (p.life <= 0) {
      p.active = false;
      p.mesh.visible = false;
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = 0;
      continue;
    }
    p.mesh.position.addScaledVector(p.velocity, dtSec);
    const t = p.life / p.maxLife;
    const fadeT = t > 0.5 ? 1 - (t - 0.5) * 2 : 1;
    (p.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, fadeT);
    (p.mesh.scale as THREE.Vector3).multiplyScalar(1 - dtSec * 0.12);
  }
}

function triggerFire(neuron: Neuron, now: number, range: number, delay: number, particleCount: number) {
  const scheduleFire = (n: Neuron, startOffset: number, pCount: number) => {
    if (n.isFiring && n.fireStartTime <= now + startOffset) return;
    n.isFiring = true;
    n.fireStartTime = now + startOffset;
    n.fireDuration = 400;
    n.fireParticleCount = pCount;
    n.hasSpawnedParticles = false;
  };

  scheduleFire(neuron, 0, particleCount);

  const neighbors = getNeighborsWithinRange(neurons, neuron, range);
  for (let i = 0; i < neighbors.length; i++) {
    const step = i + 1;
    const stepDelay = step * delay;
    const n = neighbors[i];
    const neighborParticleCount = Math.max(5, Math.floor(particleCount * 0.7));
    scheduleFire(n, stepDelay, neighborParticleCount);
  }
}

function updateFiringNeurons(now: number) {
  let firingCount = 0;
  for (const nv of neuronVisuals) {
    const n = nv.neuron;
    if (!n.isFiring) continue;
    firingCount++;

    const t = now - n.fireStartTime;
    if (t < 0) continue;

    if (!n.hasSpawnedParticles) {
      n.hasSpawnedParticles = true;
      spawnParticles(n, n.fireParticleCount);
    }

    const rgb = hexToRgb(n.palette.hex);
    const lightRgb = hexToRgb(n.palette.lightHex);

    if (t >= n.fireDuration) {
      nv.baseSomaMaterial.opacity = 0.7;
      nv.baseSomaMaterial.color.setRGB(rgb.r, rgb.g, rgb.b);
      for (let i = 0; i < nv.baseDendriteMaterials.length; i++) {
        nv.baseDendriteMaterials[i].opacity = 0.4;
        nv.baseDendriteMaterials[i].color.setRGB(lightRgb.r, lightRgb.g, lightRgb.b);
      }
      n.isFiring = false;
      n.hasSpawnedParticles = false;
      n.fireParticleCount = 0;
      continue;
    }

    const progress = t / n.fireDuration;
    let multiplier: number;
    if (progress < 0.25) {
      multiplier = 1 + progress / 0.25 * 0.5;
    } else if (progress < 0.6) {
      multiplier = 1.5;
    } else {
      multiplier = 1.5 - ((progress - 0.6) / 0.4) * 0.5;
    }
    const somaOpacity = 0.7 + (0.9 - 0.7) * (multiplier - 1) / 0.5;
    nv.baseSomaMaterial.opacity = somaOpacity;
    nv.baseSomaMaterial.color.setRGB(
      Math.min(1, rgb.r * multiplier),
      Math.min(1, rgb.g * multiplier),
      Math.min(1, rgb.b * multiplier)
    );
    const dendOpacity = 0.4 + (0.85 - 0.4) * (multiplier - 1) / 0.5;
    for (let i = 0; i < nv.baseDendriteMaterials.length; i++) {
      nv.baseDendriteMaterials[i].opacity = dendOpacity;
      nv.baseDendriteMaterials[i].color.setRGB(
        Math.min(1, lightRgb.r * multiplier),
        Math.min(1, lightRgb.g * multiplier),
        Math.min(1, lightRgb.b * multiplier)
      );
    }
  }
}

function countActiveParticles(): number {
  let c = 0;
  for (const p of particlePool) if (p.active) c++;
  return c;
}

function updateNeuronVisualPositions() {
  for (const nv of neuronVisuals) {
    const n = nv.neuron;
    nv.neuronGroup.position.set(n.position.x, n.position.y, n.position.z);
  }
}

function updateCamera() {
  cameraAngleTheta += (cameraTargetTheta - cameraAngleTheta) * 0.1;
  cameraAnglePhi += (cameraTargetPhi - cameraAnglePhi) * 0.1;
  cameraDistance += (cameraTargetDistance - cameraDistance) * 0.1;

  const x = cameraDistance * Math.sin(cameraAnglePhi) * Math.cos(cameraAngleTheta);
  const y = cameraDistance * Math.cos(cameraAnglePhi);
  const z = cameraDistance * Math.sin(cameraAnglePhi) * Math.sin(cameraAngleTheta);

  camera.position.set(x, y, z);
  camera.lookAt(0, 0, 0);
}

function pickNeuron(clientX: number, clientY: number): Neuron | null {
  if (!container) return null;
  const rect = container.getBoundingClientRect();
  pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(somaMeshesForRaycast, false);
  if (hits.length > 0) {
    const id = (hits[0].object as THREE.Mesh).userData.neuronId;
    return neurons.find(n => n.id === id) ?? null;
  }
  return null;
}

function updateHoverInfo(n: Neuron | null) {
  const fn = (window as any).__updateNeuronInfo;
  if (typeof fn === 'function') {
    if (!n) {
      fn(null);
    } else {
      fn({
        id: n.id,
        color: n.palette.hex,
        colorName: n.palette.name,
        x: n.position.x,
        y: n.position.y,
        z: n.position.z
      });
    }
  }
}

export function initScene(containerEl: HTMLElement) {
  container = containerEl;
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a14);

  const rect = container.getBoundingClientRect();
  camera = new THREE.PerspectiveCamera(
    55,
    rect.width / rect.height,
    0.1,
    3000
  );

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(rect.width, rect.height);
  renderer.setClearColor(0x0a0a14, 1);
  container.appendChild(renderer.domElement);
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.cursor = 'default';

  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2();

  addSceneDecorations();

  neurons = generateNeurons(25);
  buildNeuronVisuals();
  initParticlePool();

  updateCamera();

  window.addEventListener('resize', onResize);
}

function addSceneDecorations() {
  const bgParticles = 300;
  const positions = new Float32Array(bgParticles * 3);
  for (let i = 0; i < bgParticles; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 500;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 500;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 500;
  }
  const bgGeo = new THREE.BufferGeometry();
  bgGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const bgMat = new THREE.PointsMaterial({
    size: 0.6,
    color: 0x6366f1,
    transparent: true,
    opacity: 0.25,
    depthWrite: false
  });
  const bgPoints = new THREE.Points(bgGeo, bgMat);
  bgPoints.userData.isBG = true;
  scene.add(bgPoints);

  const edgeGeo = new THREE.BoxGeometry(200, 200, 200);
  const edges = new THREE.EdgesGeometry(edgeGeo);
  const edgeMat = new THREE.LineBasicMaterial({
    color: 0x4338ca,
    transparent: true,
    opacity: 0.08,
    depthWrite: false
  });
  const lineSegments = new THREE.LineSegments(edges, edgeMat);
  lineSegments.userData.isBG = true;
  scene.add(lineSegments);
}

function onResize() {
  if (!container || !renderer || !camera) return;
  const rect = container.getBoundingClientRect();
  camera.aspect = rect.width / rect.height;
  camera.updateProjectionMatrix();
  renderer.setSize(rect.width, rect.height);
}

export function animate() {
  animationId = requestAnimationFrame(animate);
  const now = performance.now();
  const dt = Math.min(48, now - lastFrameTime);
  lastFrameTime = now;

  updateNeuronPositions(neurons, dt);
  updateNeuronVisualPositions();
  updateFiringNeurons(now);

  for (const nv of neuronVisuals) {
    const isHovered = hoveredNeuron && nv.neuron.id === hoveredNeuron.id;
    const targetScale = isHovered ? 1.12 : 1.0;
    const currentScale = nv.somaMesh.scale.x;
    const newScale = currentScale + (targetScale - currentScale) * 0.15;
    nv.somaMesh.scale.set(newScale, newScale, newScale);
  }

  if (renderer && renderer.domElement) {
    if (isCameraDragging || isDragging) {
      renderer.domElement.style.cursor = isDragging ? 'crosshair' : 'grabbing';
    } else {
      renderer.domElement.style.cursor = hoveredNeuron ? 'pointer' : 'grab';
    }
  }

  updateParticles(dt);
  updateCamera();

  const rot = now * 0.00005;
  scene.traverse((obj) => {
    if (obj.userData && obj.userData.isBG && (obj as THREE.Points).isPoints) {
      (obj as THREE.Points).rotation.y = rot;
      (obj as THREE.Points).rotation.x = rot * 0.5;
    }
  });

  renderer.render(scene, camera);
}

export function handlePointerDown(e: PointerEvent) {
  if (e.button === 0) {
    dragStartPos.x = e.clientX;
    dragStartPos.y = e.clientY;
    isDragging = true;
    lastDragFiredId = -1;

    const n = pickNeuron(e.clientX, e.clientY);
    if (n) {
      triggerFire(n, performance.now(), controlParams.triggerRange, controlParams.propagationDelay, controlParams.particleCount);
      lastDragFiredId = n.id;
      return;
    }
    isCameraDragging = true;
    cameraDragStart = { x: e.clientX, y: e.clientY };
  } else if (e.button === 2) {
    isCameraDragging = true;
    cameraDragStart = { x: e.clientX, y: e.clientY };
  }
}

export function handlePointerMove(e: PointerEvent) {
  const n = pickNeuron(e.clientX, e.clientY);
  if (n !== hoveredNeuron) {
    hoveredNeuron = n;
    updateHoverInfo(n);
  }

  if (isCameraDragging && cameraDragStart) {
    const dx = e.clientX - cameraDragStart.x;
    const dy = e.clientY - cameraDragStart.y;
    cameraTargetTheta -= dx * 0.005;
    cameraTargetPhi = Math.max(0.15, Math.min(Math.PI - 0.15, cameraTargetPhi - dy * 0.005));
    cameraDragStart.x = e.clientX;
    cameraDragStart.y = e.clientY;
    return;
  }

  if (isDragging) {
    const dx = e.clientX - dragStartPos.x;
    const dy = e.clientY - dragStartPos.y;
    if (dx * dx + dy * dy < 25) return;

    if (n && n.id !== lastDragFiredId) {
      triggerFire(n, performance.now(), controlParams.triggerRange, controlParams.propagationDelay, controlParams.particleCount);
      lastDragFiredId = n.id;
    }
  }
}

export function handlePointerUp(e: PointerEvent) {
  isDragging = false;
  isCameraDragging = false;
  cameraDragStart = null;
}

export function handleClick(neuronId?: number) {
  if (neuronId !== undefined) {
    const n = neurons.find(x => x.id === neuronId);
    if (n) {
      triggerFire(n, performance.now(), controlParams.triggerRange, controlParams.propagationDelay, controlParams.particleCount);
    }
  }
}

export function handleDrag() {}

export function setControlParams(params: Partial<ControlParams>) {
  controlParams = { ...controlParams, ...params };
}

export function resetScene() {
  neurons = generateNeurons(25);
  buildNeuronVisuals();
  cameraTargetTheta = 0.3;
  cameraTargetPhi = 1.1;
  cameraTargetDistance = 360;
  updateHoverInfo(null);
  hoveredNeuron = null;
}

if (typeof window !== 'undefined') {
  (window as any).__debug = {
    fireNeuron: (id: number) => handleClick(id),
    fireRandom: () => {
      if (neurons.length > 0) {
        const id = Math.floor(Math.random() * neurons.length);
        handleClick(id);
        return id;
      }
      return -1;
    },
    getNeurons: () => neurons.map(n => ({ id: n.id, x: n.position.x, y: n.position.y, z: n.position.z })),
    activeParticles: () => countActiveParticles(),
    spawnAt: (id: number, count: number = 20) => {
      const n = neurons.find(x => x.id === id);
      if (n) spawnParticles(n, count);
      return !!n;
    },
    poolSize: () => particlePool.length,
    triggerFireInternal: (id: number) => {
      const n = neurons.find(x => x.id === id);
      if (!n) return 'not found';
      const visual = neuronVisuals.find(v => v.neuron.id === n.id);
      return {
        exists: !!n,
        hasVisual: !!visual,
        isFiring: n.isFiring,
        fireStartTime: n.fireStartTime,
        fireParticleCount: n.fireParticleCount,
        hasSpawnedParticles: n.hasSpawnedParticles,
        now: performance.now()
      };
    },
    pickNeuronAt: (clientX: number, clientY: number) => {
      const n = pickNeuron(clientX, clientY);
      if (n) {
        updateHoverInfo(n);
        return { id: n.id, colorName: n.palette.name, color: n.palette.hex, x: n.position.x, y: n.position.y, z: n.position.z };
      }
      updateHoverInfo(null);
      return null;
    },
    getHovered: () => hoveredNeuron ? { id: hoveredNeuron.id } : null,
    debugCheck: () => {
      const firstVisual = neuronVisuals[0];
      const firstNeuron = neurons[0];
      return {
        visualCount: neuronVisuals.length,
        neuronCount: neurons.length,
        sameRef: firstVisual && firstNeuron ? firstVisual.neuron === firstNeuron : false,
        firstVisualFiring: firstVisual ? firstVisual.neuron.isFiring : null,
        firstNeuronFiring: firstNeuron ? firstNeuron.isFiring : null
      };
    }
  };
}
