import * as THREE from 'three';

const STAR_RADIUS = 80;
const STAR_COUNT = 700;
const TWINKLE_PARTICLE_COUNT = 400;

interface ConstellationDef {
  name: string;
  stars: { lat: number; lon: number }[];
}

const CONSTELLATIONS: ConstellationDef[] = [
  {
    name: '北斗七星',
    stars: [
      { lat: 54, lon: 165 },
      { lat: 56, lon: 172 },
      { lat: 57, lon: 178 },
      { lat: 58, lon: 184 },
      { lat: 55, lon: 190 },
      { lat: 52, lon: 196 },
      { lat: 49, lon: 200 }
    ]
  },
  {
    name: '猎户座',
    stars: [
      { lat: 10, lon: 275 },
      { lat: 15, lon: 280 },
      { lat: 20, lon: 282 },
      { lat: 5, lon: 285 },
      { lat: 0, lon: 288 },
      { lat: -5, lon: 290 },
      { lat: -10, lon: 280 }
    ]
  },
  {
    name: '天狼星',
    stars: [
      { lat: -17, lon: 305 },
      { lat: -10, lon: 300 },
      { lat: -20, lon: 312 }
    ]
  },
  {
    name: '昴宿星团',
    stars: [
      { lat: 24, lon: 355 },
      { lat: 26, lon: 358 },
      { lat: 23, lon: 0 },
      { lat: 28, lon: 2 },
      { lat: 22, lon: 4 },
      { lat: 27, lon: 6 }
    ]
  },
  {
    name: '天蝎座',
    stars: [
      { lat: -26, lon: 95 },
      { lat: -30, lon: 100 },
      { lat: -34, lon: 105 },
      { lat: -38, lon: 110 },
      { lat: -42, lon: 115 },
      { lat: -45, lon: 120 }
    ]
  },
  {
    name: '织女星',
    stars: [
      { lat: 39, lon: 280 },
      { lat: 33, lon: 278 },
      { lat: 42, lon: 285 }
    ]
  }
];

export interface StarMapResult {
  group: THREE.Group;
  constellationLines: THREE.Line[];
  twinkleParticles: THREE.Points;
  starField: THREE.Points;
  update: (delta: number, time: number) => void;
}

function latLonToVector3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function lerpColor(color1: THREE.Color, color2: THREE.Color, t: number): THREE.Color {
  return new THREE.Color().lerpColors(color1, color2, t);
}

export function createStarMap(scene: THREE.Scene): StarMapResult {
  const group = new THREE.Group();

  const positions = new Float32Array(STAR_COUNT * 3);
  const colors = new Float32Array(STAR_COUNT * 3);
  const sizes = new Float32Array(STAR_COUNT);
  const baseSizes = new Float32Array(STAR_COUNT);

  const coldWhite = new THREE.Color(0xffffff);
  const warmYellow = new THREE.Color(0xffd700);

  for (let i = 0; i < STAR_COUNT; i++) {
    const lat = Math.random() * 180 - 90;
    const lon = Math.random() * 360 - 180;
    const pos = latLonToVector3(lat, lon, STAR_RADIUS);

    positions[i * 3] = pos.x;
    positions[i * 3 + 1] = pos.y;
    positions[i * 3 + 2] = pos.z;

    const colorT = Math.random();
    const color = lerpColor(coldWhite, warmYellow, colorT);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;

    const brightness = 0.5 + Math.random() * 0.5;
    sizes[i] = brightness * 1.5;
    baseSizes[i] = brightness * 1.5;
  }

  const starGeom = new THREE.BufferGeometry();
  starGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  starGeom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const starCanvas = document.createElement('canvas');
  starCanvas.width = 64;
  starCanvas.height = 64;
  const sctx = starCanvas.getContext('2d')!;
  const grad = sctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.2, 'rgba(255,255,255,0.9)');
  grad.addColorStop(0.4, 'rgba(255,255,220,0.5)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  sctx.fillStyle = grad;
  sctx.fillRect(0, 0, 64, 64);
  const starTexture = new THREE.CanvasTexture(starCanvas);

  const starMat = new THREE.PointsMaterial({
    size: 1.2,
    map: starTexture,
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true
  });

  const starField = new THREE.Points(starGeom, starMat);
  group.add(starField);

  const twinklePositions = new Float32Array(TWINKLE_PARTICLE_COUNT * 3);
  const twinkleSizes = new Float32Array(TWINKLE_PARTICLE_COUNT);
  const twinklePhases = new Float32Array(TWINKLE_PARTICLE_COUNT);

  for (let i = 0; i < TWINKLE_PARTICLE_COUNT; i++) {
    const lat = Math.random() * 180 - 90;
    const lon = Math.random() * 360 - 180;
    const r = STAR_RADIUS * 0.95 + Math.random() * 10;
    const pos = latLonToVector3(lat, lon, r);
    twinklePositions[i * 3] = pos.x;
    twinklePositions[i * 3 + 1] = pos.y;
    twinklePositions[i * 3 + 2] = pos.z;
    twinkleSizes[i] = 0.3 + Math.random() * 0.6;
    twinklePhases[i] = Math.random() * Math.PI * 2;
  }

  const twinkleGeom = new THREE.BufferGeometry();
  twinkleGeom.setAttribute('position', new THREE.BufferAttribute(twinklePositions, 3));
  twinkleGeom.setAttribute('size', new THREE.BufferAttribute(twinkleSizes, 1));

  const twinkleMat = new THREE.PointsMaterial({
    size: 0.5,
    color: 0x8899ff,
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true
  });

  const twinkleParticles = new THREE.Points(twinkleGeom, twinkleMat);
  group.add(twinkleParticles);

  const constellationLines: THREE.Line[] = [];

  CONSTELLATIONS.forEach((cons) => {
    const linePositions: number[] = [];
    cons.stars.forEach((s) => {
      const p = latLonToVector3(s.lat, s.lon, STAR_RADIUS * 0.98);
      linePositions.push(p.x, p.y, p.z);
    });

    const lineGeom = new THREE.BufferGeometry();
    lineGeom.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));

    const lineMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const line = new THREE.Line(lineGeom, lineMat);
    (line as any).userData = { pulsePhase: Math.random() * Math.PI * 2 };
    constellationLines.push(line);
    group.add(line);
  });

  scene.add(group);

  function update(delta: number, time: number): void {
    const sizeAttr = starGeom.attributes.size as THREE.BufferAttribute;
    if (sizeAttr) {
      for (let i = 0; i < STAR_COUNT; i++) {
        const twinkle = 0.85 + Math.sin(time * 1.5 + i * 0.37) * 0.15;
        sizeAttr.array[i] = baseSizes[i] * twinkle;
      }
      sizeAttr.needsUpdate = true;
    }

    twinkleMat.opacity = 0.35 + Math.sin(time * 2.2) * 0.2;

    constellationLines.forEach((line) => {
      const pulsePhase = (line as any).userData.pulsePhase;
      const mat = line.material as THREE.LineBasicMaterial;
      mat.opacity = 0.3 + (Math.sin(time * 1.8 + pulsePhase) * 0.5 + 0.5) * 0.35;
    });
  }

  return { group, constellationLines, twinkleParticles, starField, update };
}

export { CONSTELLATIONS };
