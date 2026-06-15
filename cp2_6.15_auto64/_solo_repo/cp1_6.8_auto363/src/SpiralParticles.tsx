import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  createParticleData,
  computePositions,
  generateColors,
  lerpColors,
  createExplosion,
  createShockwave,
  processEffects,
  ParticleData,
  Effect,
} from './utils/particlePhysics';

interface Props {
  particleCount: number;
  flowSpeed: number;
  colorTheme: string;
  resetTrigger: number;
}

const vertexShader = `
attribute float size;
attribute vec3 color;
attribute float alpha;

varying vec3 vColor;
varying float vAlpha;

void main() {
  vColor = color;
  vAlpha = alpha;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = size * (250.0 / -mvPosition.z);
  gl_PointSize = clamp(gl_PointSize, 1.0, 48.0);
  gl_Position = projectionMatrix * mvPosition;
}
`;

const fragmentShader = `
varying vec3 vColor;
varying float vAlpha;

void main() {
  vec2 uv = gl_PointCoord - vec2(0.5);
  float dist = length(uv);
  if (dist > 0.5) discard;

  float glow = 1.0 - smoothstep(0.0, 0.5, dist);
  float core = 1.0 - smoothstep(0.0, 0.1, dist);
  float halo = exp(-dist * 6.0) * 0.35;

  vec3 finalColor = vColor * glow + vec3(1.0, 0.97, 0.92) * core * 0.5 + vColor * halo;
  float finalAlpha = (glow * 0.6 + core * 0.4 + halo) * vAlpha;

  gl_FragColor = vec4(finalColor, finalAlpha);
}
`;

interface ThreeState {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  geometry: THREE.BufferGeometry;
  material: THREE.ShaderMaterial;
  points: THREE.Points;
  positions: Float32Array;
  velocities: Float32Array;
  colors: Float32Array;
  baseColors: Float32Array;
  targetColors: Float32Array;
  particleData: ParticleData;
  effects: Effect[];
  animationId: number;
  isTransitioningColors: boolean;
  invisibleSphere: THREE.Mesh;
}

function buildParticleSystem(
  count: number,
  theme: string,
  material: THREE.ShaderMaterial,
  scene: THREE.Scene,
  oldGeometry?: THREE.BufferGeometry,
  oldPoints?: THREE.Points,
): {
  geometry: THREE.BufferGeometry;
  points: THREE.Points;
  positions: Float32Array;
  velocities: Float32Array;
  colors: Float32Array;
  baseColors: Float32Array;
  targetColors: Float32Array;
  particleData: ParticleData;
} {
  if (oldGeometry) oldGeometry.dispose();
  if (oldPoints) scene.remove(oldPoints);

  const particleData = createParticleData(count);
  const positions = new Float32Array(count * 3);
  const velocities = new Float32Array(count * 3);
  const colors = generateColors(count, theme, particleData.baseTs);
  const baseColors = new Float32Array(colors);
  const targetColors = new Float32Array(colors);

  computePositions(positions, velocities, particleData, 0, 1.0);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(particleData.sizes, 1));
  geometry.setAttribute('alpha', new THREE.BufferAttribute(particleData.alphas, 1));

  const points = new THREE.Points(geometry, material);
  scene.add(points);

  return { geometry, points, positions, velocities, colors, baseColors, targetColors, particleData };
}

function createBackgroundTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 380);
  gradient.addColorStop(0, '#1a0040');
  gradient.addColorStop(0.35, '#0d0020');
  gradient.addColorStop(0.65, '#060010');
  gradient.addColorStop(1, '#000000');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);
  return new THREE.CanvasTexture(canvas);
}

const SpiralParticles: React.FC<Props> = ({ particleCount, flowSpeed, colorTheme, resetTrigger }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const threeRef = useRef<ThreeState | null>(null);

  const flowSpeedRef = useRef(flowSpeed);
  const particleCountRef = useRef(particleCount);
  const colorThemeRef = useRef(colorTheme);

  flowSpeedRef.current = flowSpeed;
  particleCountRef.current = particleCount;
  colorThemeRef.current = colorTheme;

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = createBackgroundTexture();

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 6, 22);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 5;
    controls.maxDistance = 50;
    controls.target.set(0, 0, 0);

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const sys = buildParticleSystem(particleCountRef.current, colorThemeRef.current, material, scene);

    const invisibleSphere = new THREE.Mesh(
      new THREE.SphereGeometry(10, 32, 32),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    scene.add(invisibleSphere);

    const state: ThreeState = {
      scene, camera, renderer, controls,
      ...sys,
      material,
      effects: [],
      animationId: 0,
      isTransitioningColors: false,
      invisibleSphere,
    };
    threeRef.current = state;

    const raycaster = new THREE.Raycaster();
    let isDragging = false;
    let pointerDownPos = { x: 0, y: 0 };
    const canvas = renderer.domElement;
    canvas.style.cursor = 'grab';

    canvas.addEventListener('pointerdown', (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
      isDragging = false;
      canvas.style.cursor = 'grabbing';
    });

    canvas.addEventListener('pointermove', (e: PointerEvent) => {
      const dx = e.clientX - pointerDownPos.x;
      const dy = e.clientY - pointerDownPos.y;
      if (dx * dx + dy * dy > 25) {
        isDragging = true;
      }
    });

    canvas.addEventListener('pointerup', () => {
      canvas.style.cursor = 'grab';
    });

    const getWorldPoint = (clientX: number, clientY: number): THREE.Vector3 | null => {
      const mouse = new THREE.Vector2(
        (clientX / window.innerWidth) * 2 - 1,
        -(clientY / window.innerHeight) * 2 + 1,
      );
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObject(invisibleSphere);
      return intersects.length > 0 ? intersects[0].point.clone() : null;
    };

    canvas.addEventListener('click', (e: MouseEvent) => {
      if (isDragging || !threeRef.current) return;
      const point = getWorldPoint(e.clientX, e.clientY);
      if (point) {
        const time = performance.now() * 0.001;
        const effect = createExplosion(point.x, point.y, point.z, time, particleCountRef.current);
        threeRef.current.effects.push(effect);
      }
    });

    canvas.addEventListener('dblclick', (e: MouseEvent) => {
      if (isDragging || !threeRef.current) return;
      const point = getWorldPoint(e.clientX, e.clientY);
      if (point) {
        const time = performance.now() * 0.001;
        const effect = createShockwave(point.x, point.y, point.z, time);
        threeRef.current.effects.push(effect);
      }
    });

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    let lastTime = performance.now() * 0.001;

    const animate = () => {
      if (!threeRef.current) return;
      const s = threeRef.current;

      const now = performance.now() * 0.001;
      const delta = Math.min(now - lastTime, 0.05);
      lastTime = now;

      computePositions(s.positions, s.velocities, s.particleData, now, flowSpeedRef.current);

      s.effects = processEffects(
        s.positions, s.velocities, s.colors, s.baseColors,
        s.effects, now,
      );

      if (s.isTransitioningColors) {
        const done = lerpColors(s.colors, s.targetColors, Math.min(delta * 3.0, 1.0));
        if (done) {
          s.isTransitioningColors = false;
          s.baseColors.set(s.targetColors);
        }
      }

      (s.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      (s.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;

      s.controls.update();
      s.renderer.render(s.scene, s.camera);

      s.animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (threeRef.current) {
        cancelAnimationFrame(threeRef.current.animationId);
        threeRef.current.geometry.dispose();
        threeRef.current.material.dispose();
        threeRef.current.renderer.dispose();
        const dom = threeRef.current.renderer.domElement;
        if (containerRef.current && dom.parentNode === containerRef.current) {
          containerRef.current.removeChild(dom);
        }
      }
      threeRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!threeRef.current) return;
    const s = threeRef.current;
    const sys = buildParticleSystem(particleCount, colorTheme, s.material, s.scene, s.geometry, s.points);
    Object.assign(s, sys);
    s.effects = [];
    s.isTransitioningColors = false;
  }, [particleCount]);

  useEffect(() => {
    if (!threeRef.current) return;
    const s = threeRef.current;
    s.targetColors = generateColors(particleCountRef.current, colorTheme, s.particleData.baseTs);
    s.isTransitioningColors = true;
  }, [colorTheme]);

  useEffect(() => {
    if (!threeRef.current) return;
    const s = threeRef.current;
    s.camera.position.set(0, 6, 22);
    s.controls.target.set(0, 0, 0);
    s.controls.update();
  }, [resetTrigger]);

  return <div ref={containerRef} style={{ width: '100%', height: '100vh' }} />;
};

export default SpiralParticles;
