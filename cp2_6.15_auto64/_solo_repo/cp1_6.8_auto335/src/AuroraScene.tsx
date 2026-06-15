import React, { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { ParticleSystem, ThemeKey } from './utils/particleSystem';
import { AudioAnalyzer, AudioData } from './AudioAnalyzer';

const PARTICLE_VERTEX = `
  attribute float aSize;
  attribute vec3 aColor;
  attribute float aAlpha;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vColor = aColor;
    vAlpha = aAlpha;
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (300.0 / -mvPos.z);
    gl_Position = projectionMatrix * mvPos;
  }
`;

const PARTICLE_FRAGMENT = `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    float glow = exp(-d * 4.0);
    float core = smoothstep(0.5, 0.0, d);
    vec3 col = vColor * (core + glow * 0.6);
    float alpha = vAlpha * (core * 0.9 + glow * 0.4);
    gl_FragColor = vec4(col, alpha);
  }
`;

const AURORA_VERTEX = `
  varying vec2 vUv;
  varying vec3 vWorldPos;
  void main() {
    vUv = uv;
    vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const AURORA_FRAGMENT = `
  uniform float uTime;
  uniform float uBass;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  varying vec2 vUv;
  varying vec3 vWorldPos;

  float noise(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float smoothNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = noise(i);
    float b = noise(i + vec2(1.0, 0.0));
    float c = noise(i + vec2(0.0, 1.0));
    float d = noise(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * smoothNoise(p);
      p *= 2.0;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 uv = vUv;
    float t = uTime * 0.15;

    float wave1 = sin(uv.x * 6.0 + t * 2.0 + fbm(uv * 3.0 + t) * 2.0) * 0.5 + 0.5;
    float wave2 = sin(uv.x * 4.0 - t * 1.5 + fbm(uv * 2.0 - t * 0.7) * 3.0) * 0.5 + 0.5;
    float wave3 = sin(uv.x * 8.0 + t * 3.0 + fbm(uv * 5.0 + t * 0.5) * 1.5) * 0.5 + 0.5;

    float band = smoothstep(0.3, 0.5, wave1) * smoothstep(0.7, 0.5, wave1);
    band += smoothstep(0.35, 0.5, wave2) * smoothstep(0.65, 0.5, wave2) * 0.7;
    band += smoothstep(0.4, 0.5, wave3) * smoothstep(0.6, 0.5, wave3) * 0.5;

    band *= (1.0 + uBass * 1.5);

    float vertFade = smoothstep(0.0, 0.15, uv.y) * smoothstep(1.0, 0.7, uv.y);
    band *= vertFade;

    float colorMix = wave1 * 0.6 + uv.x * 0.4;
    vec3 col = mix(uColorA, uColorB, colorMix);

    float edgeFade = smoothstep(0.0, 0.1, uv.x) * smoothstep(1.0, 0.9, uv.x);
    float alpha = band * 0.35 * edgeFade * vertFade;

    gl_FragColor = vec4(col, alpha);
  }
`;

interface AuroraSceneProps {
  theme: ThemeKey;
  density: number;
  audioAnalyzer: AudioAnalyzer | null;
  onRippleRequest: (origin: THREE.Vector3) => void;
}

const AuroraScene: React.FC<AuroraSceneProps> = ({ theme, density, audioAnalyzer, onRippleRequest }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const particleSystemRef = useRef<ParticleSystem | null>(null);
  const auroraMeshRef = useRef<THREE.Mesh | null>(null);
  const auroraUniformsRef = useRef<{
    uTime: { value: number };
    uBass: { value: number };
    uColorA: { value: THREE.Color };
    uColorB: { value: THREE.Color };
  } | null>(null);
  const clockRef = useRef<THREE.Clock | null>(null);
  const animIdRef = useRef<number>(0);
  const isDraggingRef = useRef(false);
  const prevMouseRef = useRef({ x: 0, y: 0 });
  const rotationRef = useRef({ x: 0.3, y: 0 });
  const targetRotationRef = useRef({ x: 0.3, y: 0 });
  const cameraDistanceRef = useRef(14);
  const targetDistanceRef = useRef(14);
  const particlePointsRef = useRef<THREE.Points | null>(null);
  const trailPointsRef = useRef<THREE.Points | null>(null);
  const autoRotateRef = useRef(true);
  const audioDataRef = useRef<AudioData | null>(null);
  const themeRef = useRef(theme);
  const densityRef = useRef(density);

  useEffect(() => {
    themeRef.current = theme;
    particleSystemRef.current?.setTheme(theme);
  }, [theme]);

  useEffect(() => {
    densityRef.current = density;
    particleSystemRef.current?.setDensity(density);
    rebuildParticleMeshes();
  }, [density]);

  const rebuildParticleMeshes = useCallback(() => {
    const ps = particleSystemRef.current;
    const scene = sceneRef.current;
    if (!ps || !scene) return;

    if (particlePointsRef.current) {
      scene.remove(particlePointsRef.current);
      particlePointsRef.current.geometry.dispose();
    }
    if (trailPointsRef.current) {
      scene.remove(trailPointsRef.current);
      trailPointsRef.current.geometry.dispose();
    }

    const pMat = new THREE.ShaderMaterial({
      vertexShader: PARTICLE_VERTEX,
      fragmentShader: PARTICLE_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const tMat = new THREE.ShaderMaterial({
      vertexShader: PARTICLE_VERTEX,
      fragmentShader: PARTICLE_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    particlePointsRef.current = new THREE.Points(ps.getGeometry(), pMat);
    trailPointsRef.current = new THREE.Points(ps.getTrailGeometry(), tMat);
    scene.add(particlePointsRef.current);
    scene.add(trailPointsRef.current);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x020818, 1);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const bgGeo = new THREE.SphereGeometry(40, 64, 64);
    const bgMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      vertexShader: `
        varying vec3 vPos;
        void main() {
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vPos;
        void main() {
          float y = normalize(vPos).y;
          vec3 top = vec3(0.01, 0.03, 0.1);
          vec3 bottom = vec3(0.0, 0.0, 0.0);
          vec3 col = mix(bottom, top, y * 0.5 + 0.5);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    const bgMesh = new THREE.Mesh(bgGeo, bgMat);
    scene.add(bgMesh);

    const auroraGeo = new THREE.SphereGeometry(18, 128, 64, 0, Math.PI * 2, 0, Math.PI * 0.6);
    const auroraUniforms = {
      uTime: { value: 0 },
      uBass: { value: 0 },
      uColorA: { value: new THREE.Color(0x00ff66) },
      uColorB: { value: new THREE.Color(0xaa55ff) },
    };
    auroraUniformsRef.current = auroraUniforms;

    const auroraMat = new THREE.ShaderMaterial({
      vertexShader: AURORA_VERTEX,
      fragmentShader: AURORA_FRAGMENT,
      uniforms: auroraUniforms,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const auroraMesh = new THREE.Mesh(auroraGeo, auroraMat);
    auroraMesh.position.y = 2;
    auroraMeshRef.current = auroraMesh;
    scene.add(auroraMesh);

    const ps = new ParticleSystem(densityRef.current);
    ps.setTheme(themeRef.current);
    particleSystemRef.current = ps;

    const pMat = new THREE.ShaderMaterial({
      vertexShader: PARTICLE_VERTEX,
      fragmentShader: PARTICLE_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const tMat = new THREE.ShaderMaterial({
      vertexShader: PARTICLE_VERTEX,
      fragmentShader: PARTICLE_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    particlePointsRef.current = new THREE.Points(ps.getGeometry(), pMat);
    trailPointsRef.current = new THREE.Points(ps.getTrailGeometry(), tMat);
    scene.add(particlePointsRef.current);
    scene.add(trailPointsRef.current);

    const clock = new THREE.Clock();
    clockRef.current = clock;

    const animate = () => {
      animIdRef.current = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.getElapsedTime();

      if (audioAnalyzer && audioAnalyzer.isActive) {
        audioDataRef.current = audioAnalyzer.getData();
      } else {
        audioDataRef.current = null;
      }

      ps.update(elapsed, delta, audioDataRef.current);

      if (auroraUniformsRef.current) {
        const auroraColors = ps.getAuroraColors();
        auroraUniformsRef.current.uTime.value = elapsed;
        auroraUniformsRef.current.uBass.value = audioDataRef.current?.bass ?? 0;
        auroraUniformsRef.current.uColorA.value.copy(auroraColors.a);
        auroraUniformsRef.current.uColorB.value.copy(auroraColors.b);
      }

      if (autoRotateRef.current) {
        targetRotationRef.current.y += delta * 0.08;
      }

      rotationRef.current.x += (targetRotationRef.current.x - rotationRef.current.x) * delta * 5;
      rotationRef.current.y += (targetRotationRef.current.y - rotationRef.current.y) * delta * 5;
      cameraDistanceRef.current += (targetDistanceRef.current - cameraDistanceRef.current) * delta * 5;

      camera.position.x = Math.sin(rotationRef.current.y) * Math.cos(rotationRef.current.x) * cameraDistanceRef.current;
      camera.position.y = Math.sin(rotationRef.current.x) * cameraDistanceRef.current;
      camera.position.z = Math.cos(rotationRef.current.y) * Math.cos(rotationRef.current.x) * cameraDistanceRef.current;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };

    animate();

    const onMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      autoRotateRef.current = false;
      prevMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - prevMouseRef.current.x;
      const dy = e.clientY - prevMouseRef.current.y;
      targetRotationRef.current.y += dx * 0.005;
      targetRotationRef.current.x += dy * 0.005;
      targetRotationRef.current.x = Math.max(-1.2, Math.min(1.2, targetRotationRef.current.x));
      prevMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
      setTimeout(() => {
        autoRotateRef.current = true;
      }, 2000);
    };

    const onWheel = (e: WheelEvent) => {
      targetDistanceRef.current += e.deltaY * 0.01;
      targetDistanceRef.current = Math.max(6, Math.min(30, targetDistanceRef.current));
    };

    const onClick = (e: MouseEvent) => {
      if (isDraggingRef.current) return;
      const mouse = new THREE.Vector2(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1
      );
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);
      const dir = raycaster.ray.direction.clone();
      const origin = raycaster.ray.origin.clone();
      const point = origin.add(dir.multiplyScalar(8));
      onRippleRequest(point);
      ps.addRipple(point);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isDraggingRef.current = true;
        autoRotateRef.current = false;
        prevMouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1 && isDraggingRef.current) {
        const dx = e.touches[0].clientX - prevMouseRef.current.x;
        const dy = e.touches[0].clientY - prevMouseRef.current.y;
        targetRotationRef.current.y += dx * 0.005;
        targetRotationRef.current.x += dy * 0.005;
        targetRotationRef.current.x = Math.max(-1.2, Math.min(1.2, targetRotationRef.current.x));
        prevMouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    const onTouchEnd = () => {
      isDraggingRef.current = false;
      setTimeout(() => {
        autoRotateRef.current = true;
      }, 2000);
    };

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    const canvas = renderer.domElement;
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('mouseleave', onMouseUp);
    canvas.addEventListener('wheel', onWheel, { passive: true });
    canvas.addEventListener('click', onClick);
    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    canvas.addEventListener('touchmove', onTouchMove, { passive: true });
    canvas.addEventListener('touchend', onTouchEnd);
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animIdRef.current);
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('mouseleave', onMouseUp);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('click', onClick);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'fixed', top: 0, left: 0 }} />;
};

export default AuroraScene;
