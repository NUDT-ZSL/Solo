import * as THREE from 'three';
import { createRoot } from 'react-dom/client';
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { SilkEngine, SilkInfo } from './SilkEngine';
import { ParticleBackground } from './ParticleBackground';
import { ControlPanel } from './ControlPanel';
import { InfoCard } from './InfoCard';

const INITIAL_CAM_POS = new THREE.Vector3(0, 0, 8);
const INITIAL_CAM_TARGET = new THREE.Vector3(0, 0, 0);

class AppCore {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  silkEngine: SilkEngine;
  particleBg: ParticleBackground;
  isDragging = false;
  prevMouse = { x: 0, y: 0 };
  spherical = new THREE.Spherical().setFromVector3(INITIAL_CAM_POS);
  target = INITIAL_CAM_TARGET.clone();
  clock = new THREE.Clock();

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.camera.position.copy(INITIAL_CAM_POS);
    this.camera.lookAt(this.target);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x0a0618, 1);
    container.appendChild(this.renderer.domElement);

    this.silkEngine = new SilkEngine(this.scene);
    this.particleBg = new ParticleBackground(this.scene);

    this.setupEvents();
    this.animate();
  }

  setupEvents() {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', (e) => {
      this.isDragging = false;
      this.prevMouse = { x: e.clientX, y: e.clientY };
    });

    canvas.addEventListener('mousemove', (e) => {
      const dx = e.clientX - this.prevMouse.x;
      const dy = e.clientY - this.prevMouse.y;

      if (e.buttons === 1) {
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
          this.isDragging = true;
        }
        this.spherical.theta -= dx * 0.005;
        this.spherical.phi -= dy * 0.005;
        this.spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.spherical.phi));
        this.updateCameraFromSpherical();
      }

      this.prevMouse = { x: e.clientX, y: e.clientY };
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.spherical.radius += e.deltaY * 0.005;
      this.spherical.radius = Math.max(3, Math.min(20, this.spherical.radius));
      this.updateCameraFromSpherical();
    }, { passive: false });

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  updateCameraFromSpherical() {
    const pos = new THREE.Vector3().setFromSpherical(this.spherical);
    this.camera.position.copy(pos.add(this.target));
    this.camera.lookAt(this.target);
  }

  resetCamera() {
    this.spherical.setFromVector3(INITIAL_CAM_POS);
    this.target.copy(INITIAL_CAM_TARGET);
    this.updateCameraFromSpherical();
  }

  screenToNDC(x: number, y: number): THREE.Vector2 {
    return new THREE.Vector2(
      (x / window.innerWidth) * 2 - 1,
      -(y / window.innerHeight) * 2 + 1
    );
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const dt = Math.min(this.clock.getDelta(), 0.05);

    this.silkEngine.update(dt);
    this.particleBg.update(dt);

    this.renderer.render(this.scene, this.camera);
  }
}

const App: React.FC = () => {
  const coreRef = useRef<AppCore | null>(null);
  const [windSpeed, setWindSpeed] = useState(1.0);
  const [density, setDensity] = useState(20);
  const [glowIntensity, setGlowIntensity] = useState(1.0);
  const [silkInfo, setSilkInfo] = useState<SilkInfo | null>(null);

  useEffect(() => {
    const container = document.getElementById('canvas-container');
    if (!container) return;
    const core = new AppCore(container);
    coreRef.current = core;

    const canvas = core.renderer.domElement;

    const onClick = (e: MouseEvent) => {
      if (core.isDragging) return;
      const ndc = core.screenToNDC(e.clientX, e.clientY);
      const hit = core.silkEngine.performHitTest(ndc, core.camera);
      if (hit) {
        core.silkEngine.triggerExplosion(hit.worldPos, hit.nodeIndex);
        const info = core.silkEngine.getSilkInfo(hit.nodeIndex);
        info.screenPos = { x: e.clientX, y: e.clientY };
        setSilkInfo(info);
      } else {
        setSilkInfo(null);
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (e.buttons !== 0) return;
      const ndc = core.screenToNDC(e.clientX, e.clientY);
      core.silkEngine.performHoverTest(ndc, core.camera);
    };

    canvas.addEventListener('click', onClick);
    canvas.addEventListener('mousemove', onMouseMove);

    return () => {
      canvas.removeEventListener('click', onClick);
      canvas.removeEventListener('mousemove', onMouseMove);
      core.silkEngine.dispose();
      core.particleBg.dispose();
    };
  }, []);

  const handleWindSpeed = useCallback((v: number) => {
    setWindSpeed(v);
    coreRef.current?.silkEngine.setWindSpeed(v);
  }, []);

  const handleDensity = useCallback((v: number) => {
    setDensity(v);
    coreRef.current?.silkEngine.setDensity(v);
  }, []);

  const handleGlow = useCallback((v: number) => {
    setGlowIntensity(v);
    coreRef.current?.silkEngine.setGlowIntensity(v);
  }, []);

  const handleReset = useCallback(() => {
    coreRef.current?.resetCamera();
  }, []);

  const handleCloseInfo = useCallback(() => {
    setSilkInfo(null);
  }, []);

  return (
    <>
      <ControlPanel
        windSpeed={windSpeed}
        density={density}
        glowIntensity={glowIntensity}
        onWindSpeedChange={handleWindSpeed}
        onDensityChange={handleDensity}
        onGlowIntensityChange={handleGlow}
        onResetCamera={handleReset}
      />
      <InfoCard info={silkInfo} onClose={handleCloseInfo} />
    </>
  );
};

const uiRoot = document.getElementById('ui-root');
if (uiRoot) {
  const root = createRoot(uiRoot);
  root.render(<App />);
}
