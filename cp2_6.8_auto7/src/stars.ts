import * as THREE from 'three';

const STAR_COUNT = 2500;
const SPHERE_RADIUS = 50;

const STAR_COLORS = [
  new THREE.Color(0xa0c4ff),
  new THREE.Color(0xffffff),
  new THREE.Color(0xfff4e0),
  new THREE.Color(0xff8a65)
];

const COLOR_WEIGHTS = [0.25, 0.4, 0.25, 0.1];

function pickColor(): THREE.Color {
  const r = Math.random();
  let cumulative = 0;
  for (let i = 0; i < COLOR_WEIGHTS.length; i++) {
    cumulative += COLOR_WEIGHTS[i];
    if (r < cumulative) return STAR_COLORS[i];
  }
  return STAR_COLORS[1];
}

let points: THREE.Points | null = null;
let twinklePhases: Float32Array | null = null;

const starVertexShader = `
  attribute float size;
  attribute vec3 customColor;
  attribute float phase;
  varying vec3 vColor;
  varying float vTwinkle;
  uniform float uTime;
  void main() {
    vColor = customColor;
    vTwinkle = 0.75 + 0.25 * sin(uTime * 2.0 + phase);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const starFragmentShader = `
  varying vec3 vColor;
  varying float vTwinkle;
  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);
    if (dist > 0.5) discard;
    float alpha = smoothstep(0.5, 0.0, dist);
    float glow = smoothstep(0.5, 0.15, dist) * 0.5;
    vec3 finalColor = vColor * vTwinkle;
    gl_FragColor = vec4(finalColor, (alpha + glow) * vTwinkle);
  }
`;

export function createStars(scene: THREE.Scene): void {
  const positions = new Float32Array(STAR_COUNT * 3);
  const sizes = new Float32Array(STAR_COUNT);
  const colors = new Float32Array(STAR_COUNT * 3);
  twinklePhases = new Float32Array(STAR_COUNT);

  for (let i = 0; i < STAR_COUNT; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = SPHERE_RADIUS * (0.85 + Math.random() * 0.15);

    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);

    sizes[i] = 0.3 + Math.random() * 1.2;

    const color = pickColor();
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;

    twinklePhases[i] = Math.random() * Math.PI * 2;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('customColor', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('phase', new THREE.BufferAttribute(twinklePhases, 1));

  const material = new THREE.ShaderMaterial({
    vertexShader: starVertexShader,
    fragmentShader: starFragmentShader,
    uniforms: {
      uTime: { value: 0 }
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  points = new THREE.Points(geometry, material);
  scene.add(points);
}

export function updateStars(time: number): void {
  if (points && (points.material as THREE.ShaderMaterial).uniforms) {
    (points.material as THREE.ShaderMaterial).uniforms.uTime.value = time;
  }
}
