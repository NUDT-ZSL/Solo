import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { ParticleSystem } from './scene/ParticleSystem';
import { CameraController } from './scene/CameraController';
import { ControlPanel } from './ui/ControlPanel';
import { PerformanceMonitor } from './ui/PerformanceMonitor';
import { useStore, defaultParticleConfig, defaultConnectionConfig, defaultBackgroundConfig } from './store/useStore';
import type { CameraConfig } from './types';
import { hexToRgb } from './utils/colorUtils';
import './App.css';

const cameraConfig: CameraConfig = {
  initialPosition: { x: 0, y: 10, z: 40 },
  target: { x: 0, y: 0, z: 0 },
  minZoom: 0.5,
  maxZoom: 3.0,
  rotateSpeed: 0.2,
};

function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const particleSystemRef = useRef<ParticleSystem | null>(null);
  const cameraControllerRef = useRef<CameraController | null>(null);
  const starsRef = useRef<THREE.Points | null>(null);
  const gradientMeshRef = useRef<THREE.Mesh | null>(null);
  const rafRef = useRef<number>(0);
  const connectionCountRef = useRef(0);
  const particleCountRef = useRef(0);

  const [connectionCount, setConnectionCount] = useState(0);
  const [particleCount, setParticleCount] = useState(0);
  const [isDegraded, setIsDegraded] = useState(false);

  const { particleConfig, connectionConfig, backgroundConfig, setConnectionConfig } = useStore();

  const createStars = useCallback((scene: THREE.Scene, count: number) => {
    if (starsRef.current) {
      scene.remove(starsRef.current);
      starsRef.current.geometry.dispose();
      (starsRef.current.material as THREE.Material).dispose();
      starsRef.current = null;
    }

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const opacities = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 200;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 200;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 100 - 50;
      sizes[i] = 1 + Math.random() * 2;
      opacities[i] = 0.3 + Math.random() * 0.5;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));

    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.5,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
    });

    const stars = new THREE.Points(geometry, material);
    scene.add(stars);
    starsRef.current = stars;
  }, []);

  const createGradientBackground = useCallback((scene: THREE.Scene, topColor: string, bottomColor: string) => {
    if (gradientMeshRef.current) {
      scene.remove(gradientMeshRef.current);
      gradientMeshRef.current.geometry.dispose();
      (gradientMeshRef.current.material as THREE.Material).dispose();
      gradientMeshRef.current = null;
    }

    const geometry = new THREE.PlaneGeometry(300, 300);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(topColor) },
        bottomColor: { value: new THREE.Color(bottomColor) },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        varying vec2 vUv;
        void main() {
          vec3 color = mix(bottomColor, topColor, vUv.y);
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.z = -80;
    scene.add(mesh);
    gradientMeshRef.current = mesh;
  }, []);

  const updateBackground = useCallback((scene: THREE.Scene) => {
    if (backgroundConfig.mode === 'solid') {
      if (starsRef.current) {
        scene.remove(starsRef.current);
        starsRef.current.geometry.dispose();
        (starsRef.current.material as THREE.Material).dispose();
        starsRef.current = null;
      }
      if (gradientMeshRef.current) {
        scene.remove(gradientMeshRef.current);
        gradientMeshRef.current.geometry.dispose();
        (gradientMeshRef.current.material as THREE.Material).dispose();
        gradientMeshRef.current = null;
      }
      scene.background = new THREE.Color(backgroundConfig.solidColor);
    } else if (backgroundConfig.mode === 'gradient') {
      if (starsRef.current) {
        scene.remove(starsRef.current);
        starsRef.current.geometry.dispose();
        (starsRef.current.material as THREE.Material).dispose();
        starsRef.current = null;
      }
      createGradientBackground(scene, backgroundConfig.gradientTop, backgroundConfig.gradientBottom);
      scene.background = null;
    } else if (backgroundConfig.mode === 'stars') {
      if (gradientMeshRef.current) {
        scene.remove(gradientMeshRef.current);
        gradientMeshRef.current.geometry.dispose();
        (gradientMeshRef.current.material as THREE.Material).dispose();
        gradientMeshRef.current = null;
      }
      scene.background = new THREE.Color('#0a0e1a');
      createStars(scene, backgroundConfig.starCount);
    }
  }, [backgroundConfig, createStars, createGradientBackground]);

  const handleReset = useCallback(() => {
    useStore.getState().resetAll();
    if (particleSystemRef.current) {
      particleSystemRef.current.reset();
    }
    if (cameraControllerRef.current) {
      cameraControllerRef.current.reset();
    }
    setIsDegraded(false);
    setConnectionConfig({ maxConnections: 4000 });
  }, [setConnectionConfig]);

  const handlePerformanceDegrade = useCallback((degraded: boolean) => {
    setIsDegraded(degraded);
    if (degraded) {
      setConnectionConfig({ maxConnections: 2000 });
    } else {
      setConnectionConfig({ maxConnections: 4000 });
    }
  }, [setConnectionConfig]);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(backgroundConfig.solidColor);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      60,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    scene.userData.renderer = renderer;

    const particleSystem = new ParticleSystem(
      scene,
      camera,
      particleConfig,
      connectionConfig
    );
    particleSystemRef.current = particleSystem;
    particleCountRef.current = particleSystem.getParticleCount();
    setParticleCount(particleSystem.getParticleCount());

    const cameraController = new CameraController(
      camera,
      renderer.domElement,
      cameraConfig
    );
    cameraControllerRef.current = cameraController;

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);

      if (particleSystemRef.current) {
        particleSystemRef.current.update();
        const newConnCount = particleSystemRef.current.getConnectionCount();
        const newPartCount = particleSystemRef.current.getParticleCount();
        if (newConnCount !== connectionCountRef.current) {
          connectionCountRef.current = newConnCount;
          setConnectionCount(newConnCount);
        }
        if (newPartCount !== particleCountRef.current) {
          particleCountRef.current = newPartCount;
          setParticleCount(newPartCount);
        }
      }

      if (starsRef.current && starsRef.current.geometry.attributes.opacity) {
        const opacities = starsRef.current.geometry.attributes.opacity.array as Float32Array;
        const time = Date.now() * 0.001;
        for (let i = 0; i < opacities.length; i++) {
          opacities[i] = 0.3 + Math.abs(Math.sin(time + i * 0.7)) * 0.5;
        }
        starsRef.current.geometry.attributes.opacity.needsUpdate = true;
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!containerRef.current || !camera || !renderer) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      if (cameraControllerRef.current) {
        cameraControllerRef.current.updateAspect(width, height);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', handleResize);

      if (particleSystemRef.current) {
        particleSystemRef.current.dispose();
      }
      if (cameraControllerRef.current) {
        cameraControllerRef.current.dispose();
      }
      if (starsRef.current) {
        scene.remove(starsRef.current);
        starsRef.current.geometry.dispose();
        (starsRef.current.material as THREE.Material).dispose();
      }
      if (gradientMeshRef.current) {
        scene.remove(gradientMeshRef.current);
        gradientMeshRef.current.geometry.dispose();
        (gradientMeshRef.current.material as THREE.Material).dispose();
      }
      if (renderer) {
        renderer.dispose();
        if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
          containerRef.current.removeChild(renderer.domElement);
        }
      }
    };
  }, []);

  useEffect(() => {
    if (particleSystemRef.current) {
      particleSystemRef.current.setParticleConfig(particleConfig);
      particleCountRef.current = particleSystemRef.current.getParticleCount();
      setParticleCount(particleSystemRef.current.getParticleCount());
    }
  }, [particleConfig]);

  useEffect(() => {
    if (particleSystemRef.current) {
      particleSystemRef.current.setConnectionConfig(connectionConfig);
    }
  }, [connectionConfig]);

  useEffect(() => {
    if (sceneRef.current) {
      updateBackground(sceneRef.current);
    }
  }, [backgroundConfig, updateBackground]);

  return (
    <div className="app-container">
      <div ref={containerRef} className="canvas-container" />
      <ControlPanel onReset={handleReset} />
      <PerformanceMonitor
        particleCount={particleCount}
        connectionCount={connectionCount}
        onPerformanceDegrade={handlePerformanceDegrade}
      />
    </div>
  );
}

export default App;
