import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import ControlPanel, { DEFAULT_PARAMS } from './ControlPanel';
import { VegetationSystem, updateVegetation, VegetationParams } from './VegetationSystem';

const App: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    vegetation: VegetationSystem;
    rafId: number;
    startTime: number;
  } | null>(null);

  const [params, setParams] = useState<VegetationParams>({ ...DEFAULT_PARAMS });
  const paramsRef = useRef<VegetationParams>({ ...DEFAULT_PARAMS });
  const [fps, setFps] = useState(60);
  const lastFpsTimeRef = useRef(performance.now());
  const frameCountRef = useRef(0);

  useEffect(() => {
    paramsRef.current = params;
    if (sceneRef.current) {
      sceneRef.current.vegetation.updateParams(params);
    }
  }, [params]);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0b0e14, 0.015);

    const camera = new THREE.PerspectiveCamera(
      55,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      500
    );
    camera.position.set(22, 18, 28);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    containerRef.current.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xaab4c8, 0.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfff5e6, 1.2);
    dirLight.position.set(30, 40, 25);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(1024, 1024);
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 150;
    dirLight.shadow.camera.left = -50;
    dirLight.shadow.camera.right = 50;
    dirLight.shadow.camera.top = 50;
    dirLight.shadow.camera.bottom = -50;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);

    const backLight = new THREE.DirectionalLight(0xffb380, 0.3);
    backLight.position.set(-25, 15, -30);
    scene.add(backLight);

    const fillLight = new THREE.HemisphereLight(0x4fc3f7, 0x1a2332, 0.25);
    scene.add(fillLight);

    const groundGeo = new THREE.CircleGeometry(35, 64);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x1a2332,
      roughness: 0.95,
      metalness: 0.05
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const vegetation = new VegetationSystem(scene, paramsRef.current);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.minDistance = 5;
    controls.maxDistance = 80;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.target.set(0, 2, 0);
    controls.keyPanSpeed = 40;
    controls.update();

    const skyGeo = new THREE.SphereGeometry(200, 32, 32);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        topColor: { value: new THREE.Color(0x0b0e14) },
        bottomColor: { value: new THREE.Color(0x1a1f2c) },
        offset: { value: 30 },
        exponent: { value: 0.7 }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + offset).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
      `
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    scene.add(sky);

    const startTime = performance.now();

    const animate = () => {
      const t = (performance.now() - startTime) / 1000;

      frameCountRef.current++;
      const now = performance.now();
      if (now - lastFpsTimeRef.current >= 500) {
        const currentFps = (frameCountRef.current * 1000) / (now - lastFpsTimeRef.current);
        setFps(Math.round(currentFps));
        frameCountRef.current = 0;
        lastFpsTimeRef.current = now;
      }

      updateVegetation(vegetation, t);
      controls.update();
      renderer.render(scene, camera);
      rafId = requestAnimationFrame(animate);
    };

    let rafId = requestAnimationFrame(animate);

    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    sceneRef.current = {
      scene, camera, renderer, controls, vegetation, rafId, startTime
    };

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
      vegetation.dispose(scene);
      renderer.dispose();
      groundGeo.dispose();
      groundMat.dispose();
      skyGeo.dispose();
      skyMat.dispose();
      controls.dispose();
      if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      <div style={{
        position: 'fixed',
        top: '20px',
        left: '20px',
        color: '#e0e8f5',
        zIndex: 10,
        userSelect: 'none'
      }}>
        <h1 style={{
          fontSize: '20px',
          fontWeight: 700,
          marginBottom: '4px',
          letterSpacing: '1px',
          textShadow: '0 2px 8px rgba(0,0,0,0.6)'
        }}>浮光叠翠 · 立体植被群</h1>
        <p style={{
          fontSize: '12px',
          color: '#a0aabf',
          letterSpacing: '0.5px'
        }}>算法生成 · 参数驱动 · 光影漫游</p>
      </div>

      <div style={{
        position: 'fixed',
        right: '20px',
        bottom: '20px',
        zIndex: 10,
        padding: '10px 14px',
        background: 'rgba(15, 20, 30, 0.6)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderRadius: '10px',
        border: '1px solid rgba(79, 195, 247, 0.15)',
        userSelect: 'none'
      }}>
        <div style={{
          fontFamily: 'Consolas, Monaco, monospace',
          color: '#4caf50',
          fontSize: '15px',
          fontWeight: 700,
          letterSpacing: '1px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: fps >= 55 ? '#4caf50' : fps >= 30 ? '#ff9800' : '#f44336',
            boxShadow: `0 0 8px ${fps >= 55 ? '#4caf50' : fps >= 30 ? '#ff9800' : '#f44336'}`,
            animation: 'pulse 1.5s infinite'
          }} />
          {fps} FPS
        </div>
        <div style={{
          fontSize: '11px',
          color: '#78909c',
          marginTop: '3px'
        }}>
          密度: {params.density.toFixed(0)} 株
        </div>
      </div>

      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 10,
        padding: '10px 14px',
        background: 'rgba(15, 20, 30, 0.55)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderRadius: '10px',
        border: '1px solid rgba(79, 195, 247, 0.12)',
        fontSize: '12px',
        color: '#a0aabf',
        lineHeight: '1.8',
        userSelect: 'none'
      }}>
        <div style={{ color: '#4fc3f7', fontWeight: 600, marginBottom: '4px' }}>交互提示</div>
        <div>🖱️ 左键拖拽 · 旋转视角</div>
        <div>🔍 滚轮 · 缩放</div>
        <div>⇧ Shift + 拖拽 · 平移</div>
      </div>

      <ControlPanel params={params} onChange={setParams} />

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default App;
