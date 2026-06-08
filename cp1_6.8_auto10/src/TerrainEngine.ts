import * as THREE from 'three';
import { EcologyManager, TerrainType } from './EcologyManager';

const PLANET_RADIUS = 3;
const SEGMENTS = 64;

const TUNDRA_VERTEX = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const TUNDRA_FRAGMENT = `
  uniform float uTime;
  uniform float uVitality;
  uniform float uFlowSpeed;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;

  float pulse(float t) {
    return 0.5 + 0.5 * sin(t * 2.0);
  }

  void main() {
    float lat = asin(normalize(vPosition).y);
    float lon = atan(normalize(vPosition).z, normalize(vPosition).x);

    float mossPattern = sin(lon * 12.0 + uTime * uFlowSpeed * 0.4) *
                        cos(lat * 10.0 - uTime * uFlowSpeed * 0.3) * 0.5 + 0.5;
    float glowPulse = pulse(uTime * 0.6 + mossPattern * 3.14);

    vec3 baseColor = vec3(0.05, 0.25, 0.2);
    vec3 glowColor = vec3(0.1, 0.9, 0.7);
    vec3 mossColor = mix(baseColor, glowColor, mossPattern * uVitality);

    float rimLight = 1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0);
    rimLight = pow(rimLight, 2.0);

    vec3 finalColor = mossColor + glowColor * glowPulse * 0.3 * uVitality;
    finalColor += vec3(0.1, 0.4, 0.35) * rimLight * uVitality;

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

const CRYSTAL_VERTEX = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPosition = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const CRYSTAL_FRAGMENT = `
  uniform float uTime;
  uniform float uVitality;
  uniform float uFlowSpeed;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;
  varying vec3 vWorldPosition;

  void main() {
    float lat = asin(normalize(vPosition).y);
    float lon = atan(normalize(vPosition).z, normalize(vPosition).x);

    float crystalPattern = sin(lon * 8.0 + uTime * uFlowSpeed * 0.2) *
                           sin(lat * 6.0 - uTime * uFlowSpeed * 0.15);
    crystalPattern = abs(crystalPattern);

    vec3 sandColor = vec3(0.6, 0.5, 0.35);
    vec3 crystalColor1 = vec3(0.9, 0.3, 0.6);
    vec3 crystalColor2 = vec3(0.3, 0.6, 0.9);
    vec3 crystalColor3 = vec3(0.8, 0.8, 0.2);

    float t = fract(crystalPattern * 3.0 + uTime * uFlowSpeed * 0.1);
    vec3 crystalMix = mix(crystalColor1, crystalColor2, t);
    crystalMix = mix(crystalMix, crystalColor3, sin(t * 3.14));

    float viewDot = abs(dot(vNormal, normalize(cameraPosition - vWorldPosition)));
    float refraction = pow(1.0 - viewDot, 3.0) * uVitality;

    vec3 finalColor = mix(sandColor, crystalMix, crystalPattern * 0.6 * uVitality);
    finalColor += crystalMix * refraction * 0.5;

    gl_FragColor = vec4(finalColor, 0.9);
  }
`;

const LAVA_VERTEX = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const LAVA_FRAGMENT = `
  uniform float uTime;
  uniform float uVitality;
  uniform float uFlowSpeed;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  void main() {
    float lat = asin(normalize(vPosition).y);
    float lon = atan(normalize(vPosition).z, normalize(vPosition).x);
    vec2 uv = vec2(lon, lat);

    float flow = uTime * uFlowSpeed * 0.3;
    float n1 = noise(uv * 5.0 + vec2(flow, 0.0));
    float n2 = noise(uv * 8.0 - vec2(0.0, flow * 0.7));
    float lavaPattern = n1 * 0.6 + n2 * 0.4;

    float crack = smoothstep(0.4, 0.5, lavaPattern);
    float hotSpot = smoothstep(0.7, 0.9, lavaPattern) * uVitality;

    float heatWave = sin(uv.x * 20.0 + uTime * uFlowSpeed * 2.0) * 0.02 * uVitality;

    vec3 rockColor = vec3(0.15, 0.05, 0.02);
    vec3 lavaColor = vec3(0.9, 0.2, 0.0);
    vec3 hotColor = vec3(1.0, 0.7, 0.1);

    vec3 finalColor = mix(rockColor, lavaColor, crack * uVitality);
    finalColor += hotColor * hotSpot;
    finalColor += vec3(0.3, 0.05, 0.0) * heatWave;

    float rimGlow = pow(1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0), 2.5);
    finalColor += vec3(0.5, 0.1, 0.0) * rimGlow * uVitality * 0.5;

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

function createTerrainMaterial(
  type: TerrainType,
  ecology: EcologyManager
): THREE.ShaderMaterial {
  const shaders: Record<TerrainType, { vertex: string; fragment: string }> = {
    tundra: { vertex: TUNDRA_VERTEX, fragment: TUNDRA_FRAGMENT },
    crystal: { vertex: CRYSTAL_VERTEX, fragment: CRYSTAL_FRAGMENT },
    lava: { vertex: LAVA_VERTEX, fragment: LAVA_FRAGMENT },
  };

  const shader = shaders[type];

  return new THREE.ShaderMaterial({
    vertexShader: shader.vertex,
    fragmentShader: shader.fragment,
    uniforms: {
      uTime: { value: 0 },
      uVitality: { value: ecology.getGlowIntensity() },
      uFlowSpeed: { value: ecology.getFlowSpeed() },
    },
    transparent: type === 'crystal',
    side: THREE.FrontSide,
  });
}

function getZoneAngles(type: TerrainType): { startLon: number; endLon: number; startLat: number; endLat: number } {
  switch (type) {
    case 'tundra':
      return { startLon: -Math.PI / 2, endLon: Math.PI / 2, startLat: -0.3, endLat: 1.2 };
    case 'crystal':
      return { startLon: Math.PI / 2, endLon: Math.PI, startLat: -1.0, endLat: 0.5 };
    case 'lava':
      return { startLon: -Math.PI, endLon: -Math.PI / 2, startLat: -0.8, endLat: 0.8 };
  }
}

function isVertexInZone(
  x: number, y: number, z: number,
  zone: { startLon: number; endLon: number; startLat: number; endLat: number }
): boolean {
  const lat = Math.asin(y / PLANET_RADIUS);
  const lon = Math.atan2(z, x);
  return lon >= zone.startLon && lon <= zone.endLon && lat >= zone.startLat && lat <= zone.endLat;
}

export function createPlanetGeometry(): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(PLANET_RADIUS, SEGMENTS, SEGMENTS);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const len = Math.sqrt(x * x + y * y + z * z);
    const nx = x / len;
    const ny = y / len;
    const nz = z / len;
    const noise = 1 + (Math.sin(nx * 5 + ny * 3) * Math.cos(nz * 4 + nx * 2)) * 0.04;
    pos.setXYZ(i, nx * PLANET_RADIUS * noise, ny * PLANET_RADIUS * noise, nz * PLANET_RADIUS * noise);
  }
  geo.computeVertexNormals();

  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    colors[i * 3] = 0.5;
    colors[i * 3 + 1] = 0.5;
    colors[i * 3 + 2] = 0.5;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  return geo;
}

export function createZoneMesh(
  type: TerrainType,
  ecology: EcologyManager
): THREE.Mesh {
  const zone = getZoneAngles(type);
  const geo = new THREE.SphereGeometry(PLANET_RADIUS * 1.002, 48, 48, 32, 16, 16, 16);

  const pos = geo.attributes.position;
  const indices = geo.index!;
  const toRemove = new Set<number>();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    if (!isVertexInZone(x, y, z, zone)) {
      toRemove.add(i);
    }
  }

  const material = createTerrainMaterial(type, ecology);
  const mesh = new THREE.Mesh(geo, material);
  mesh.userData.terrainType = type;
  return mesh;
}

export function createPlanet(ecology: EcologyManager): THREE.Group {
  const group = new THREE.Group();

  const baseGeo = createPlanetGeometry();
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a2e,
    roughness: 0.9,
    metalness: 0.1,
    flatShading: true,
  });
  const baseMesh = new THREE.Mesh(baseGeo, baseMat);
  group.add(baseMesh);

  const tundra = createZoneMesh('tundra', ecology);
  const crystal = createZoneMesh('crystal', ecology);
  const lava = createZoneMesh('lava', ecology);
  group.add(tundra);
  group.add(crystal);
  group.add(lava);

  return group;
}

export function updatePlanetMaterials(
  planet: THREE.Group,
  ecology: EcologyManager,
  time: number
): void {
  planet.children.forEach((child) => {
    if (child instanceof THREE.Mesh && child.material instanceof THREE.ShaderMaterial) {
      const u = child.material.uniforms;
      if (u.uTime) u.uTime.value = time;
      if (u.uVitality) u.uVitality.value = ecology.getGlowIntensity();
      if (u.uFlowSpeed) u.uFlowSpeed.value = ecology.getFlowSpeed();
    }
  });
}

export interface InteractivePoint {
  mesh: THREE.Mesh;
  type: TerrainType;
  label: string;
  baseScale: number;
  pulsePhase: number;
}

const POINT_LABELS: Record<TerrainType, string[]> = {
  tundra: ['发光蘑菇', '荧光孢子丛', '脉冲苔藓核', '幽光菌丝网'],
  crystal: ['紫晶棱柱', '折射晶簇', '虹光石核', '碎晶棱镜'],
  lava: ['岩浆泡', '熔岩涌口', '炽热裂隙', '焰心石'],
};

export function createInteractivePoints(ecology: EcologyManager): InteractivePoint[] {
  const points: InteractivePoint[] = [];
  const zones: Record<TerrainType, ReturnType<typeof getZoneAngles>> = {
    tundra: getZoneAngles('tundra'),
    crystal: getZoneAngles('crystal'),
    lava: getZoneAngles('lava'),
  };

  const types: TerrainType[] = ['tundra', 'crystal', 'lava'];

  types.forEach((type) => {
    const zone = zones[type];
    const labels = POINT_LABELS[type];

    for (let i = 0; i < labels.length; i++) {
      const lon = zone.startLon + (zone.endLon - zone.startLon) * (0.2 + 0.6 * (i / (labels.length - 1)));
      const lat = zone.startLat + (zone.endLat - zone.startLat) * (0.3 + 0.4 * Math.sin(i * 1.7));

      const r = PLANET_RADIUS * 1.02;
      const x = r * Math.cos(lat) * Math.cos(lon);
      const y = r * Math.sin(lat);
      const z = r * Math.cos(lat) * Math.sin(lon);

      let pointGeo: THREE.BufferGeometry;
      let pointMat: THREE.Material;

      if (type === 'tundra') {
        pointGeo = new THREE.SphereGeometry(0.12, 8, 8);
        pointMat = new THREE.MeshStandardMaterial({
          color: 0x00ff88,
          emissive: 0x00ff88,
          emissiveIntensity: 0.8,
          transparent: true,
          opacity: 0.85,
        });
      } else if (type === 'crystal') {
        pointGeo = new THREE.OctahedronGeometry(0.15, 0);
        pointMat = new THREE.MeshStandardMaterial({
          color: 0xff66cc,
          emissive: 0xcc44aa,
          emissiveIntensity: 0.5,
          transparent: true,
          opacity: 0.8,
        });
      } else {
        pointGeo = new THREE.SphereGeometry(0.13, 8, 8);
        pointMat = new THREE.MeshStandardMaterial({
          color: 0xff4400,
          emissive: 0xff2200,
          emissiveIntensity: 1.0,
          transparent: true,
          opacity: 0.9,
        });
      }

      const mesh = new THREE.Mesh(pointGeo, pointMat);
      mesh.position.set(x, y, z);
      mesh.lookAt(0, 0, 0);

      points.push({
        mesh,
        type,
        label: labels[i],
        baseScale: 1.0,
        pulsePhase: Math.random() * Math.PI * 2,
      });
    }
  });

  return points;
}

export function updateInteractivePoints(
  points: InteractivePoint[],
  time: number,
  vitality: number
): void {
  points.forEach((p) => {
    const pulse = 1 + Math.sin(time * 2 + p.pulsePhase) * 0.15 * vitality;
    p.mesh.scale.setScalar(p.baseScale * pulse);

    if (p.mesh.material instanceof THREE.MeshStandardMaterial) {
      p.mesh.material.emissiveIntensity = 0.3 + vitality * 0.7 * (0.5 + 0.5 * Math.sin(time * 1.5 + p.pulsePhase));
    }
  });
}

export function createAtmosphere(): THREE.Mesh {
  const geo = new THREE.SphereGeometry(PLANET_RADIUS * 1.15, 32, 32);
  const mat = new THREE.ShaderMaterial({
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vPosition;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      varying vec3 vPosition;
      void main() {
        float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
        vec3 atmosphereColor = vec3(0.3, 0.1, 0.5);
        gl_FragColor = vec4(atmosphereColor, intensity * 0.4);
      }
    `,
    transparent: true,
    side: THREE.BackSide,
    depthWrite: false,
  });
  return new THREE.Mesh(geo, mat);
}

export function createStarfield(): THREE.Points {
  const count = 2000;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 50 + Math.random() * 50;
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
    const brightness = 0.5 + Math.random() * 0.5;
    colors[i * 3] = brightness;
    colors[i * 3 + 1] = brightness * (0.8 + Math.random() * 0.2);
    colors[i * 3 + 2] = brightness;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.PointsMaterial({
    size: 0.15,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    sizeAttenuation: true,
  });
  return new THREE.Points(geo, mat);
}
