import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { X } from 'lucide-react';
import { useStarStore } from '@/store/useStarStore';
import { COMPARISON_STARS, STAR_PRESETS } from '@/data/starData';
import { ComparisonStar } from '@/core/types';

const STAR_PRESET_MASSES = STAR_PRESETS.map(p => p.mass);

interface DataCompareProps {
  onStarSelect: (mass: number) => void;
}

export const DataCompare: React.FC<DataCompareProps> = ({ onStarSelect }) => {
  const { showDataCompare, setShowDataCompare, currentMass } = useStarStore();
  const canvasRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animationIdRef = useRef<number>(0);
  const starMeshesRef = useRef<THREE.Mesh[]>([]);
  const [selectedStar, setSelectedStar] = useState<ComparisonStar | null>(null);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const lastTimeRef = useRef<number>(0);

  const handleClose = useCallback(() => {
    setShowDataCompare(false);
  }, [setShowDataCompare]);

  const handleSelectStar = useCallback((star: ComparisonStar) => {
    let targetMass = star.mass;
    if (!STAR_PRESET_MASSES.includes(targetMass)) {
      targetMass = STAR_PRESET_MASSES.reduce((prev, curr) =>
        Math.abs(curr - star.mass) < Math.abs(prev - star.mass) ? curr : prev
      );
    }
    onStarSelect(targetMass);
    setShowDataCompare(false);
  }, [onStarSelect, setShowDataCompare]);

  const handlePresetClick = useCallback((mass: number) => {
    onStarSelect(mass);
    setShowDataCompare(false);
  }, [onStarSelect, setShowDataCompare]);

  useEffect(() => {
    if (!showDataCompare || !canvasRef.current) return;

    const container = canvasRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0F0F23);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(10, 8, 14);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 5;
    controls.maxDistance = 30;
    controlsRef.current = controls;

    const axesGroup = new THREE.Group();
    
    const xAxisGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-5, -4, -4),
      new THREE.Vector3(5, -4, -4),
    ]);
    const xAxisMat = new THREE.LineBasicMaterial({ color: 0x6C63FF, transparent: true, opacity: 0.5 });
    const xAxis = new THREE.Line(xAxisGeom, xAxisMat);
    axesGroup.add(xAxis);

    const yAxisGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-5, -4, -4),
      new THREE.Vector3(-5, 4, -4),
    ]);
    const yAxisMat = new THREE.LineBasicMaterial({ color: 0x00D9FF, transparent: true, opacity: 0.5 });
    const yAxis = new THREE.Line(yAxisGeom, yAxisMat);
    axesGroup.add(yAxis);

    const zAxisGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-5, -4, -4),
      new THREE.Vector3(-5, -4, 4),
    ]);
    const zAxisMat = new THREE.LineBasicMaterial({ color: 0xFFA500, transparent: true, opacity: 0.5 });
    const zAxis = new THREE.Line(zAxisGeom, zAxisMat);
    axesGroup.add(zAxis);

    scene.add(axesGroup);

    const gridGeom = new THREE.PlaneGeometry(10, 8, 10, 8);
    const gridMat = new THREE.MeshBasicMaterial({
      color: 0x1A1A2E,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    });
    const gridFloor = new THREE.Mesh(gridGeom, gridMat);
    gridFloor.rotation.x = -Math.PI / 2;
    gridFloor.position.set(0, -4, 0);
    scene.add(gridFloor);

    const maxMass = Math.max(...COMPARISON_STARS.map(s => s.mass));
    const maxTemp = Math.max(...COMPARISON_STARS.map(s => s.temperature));
    const maxLum = Math.max(...COMPARISON_STARS.map(s => Math.log10(s.luminosity + 1)));

    const starMeshes: THREE.Mesh[] = [];

    COMPARISON_STARS.forEach((star, i) => {
      const x = (star.mass / maxMass) * 8 - 4;
      const y = (star.temperature / maxTemp) * 8 - 4;
      const z = (Math.log10(star.luminosity + 1) / maxLum) * 8 - 4;

      const starSize = 0.3 + (star.mass / maxMass) * 0.8;

      const glowGeometry = new THREE.SphereGeometry(starSize * 1.5, 24, 24);
      const glowMaterial = new THREE.ShaderMaterial({
        uniforms: {
          glowColor: { value: new THREE.Color(star.color) },
          intensity: { value: 0.6 },
        },
        vertexShader: `
          varying vec3 vNormal;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 glowColor;
          uniform float intensity;
          varying vec3 vNormal;
          void main() {
            float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
            gl_FragColor = vec4(glowColor, intensity * 0.6);
          }
        `,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
      });
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      glow.position.set(x, y, z);
      glow.userData.star = star;
      glow.userData.starIndex = i;
      scene.add(glow);
      starMeshes.push(glow);

      const coreGeometry = new THREE.SphereGeometry(starSize * 0.6, 16, 16);
      const coreMaterial = new THREE.MeshBasicMaterial({
        color: star.color,
      });
      const core = new THREE.Mesh(coreGeometry, coreMaterial);
      core.position.set(x, y, z);
      core.userData.star = star;
      core.userData.starIndex = i;
      scene.add(core);
      starMeshes.push(core);
    });

    starMeshesRef.current = starMeshes;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    const handleClick = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const intersects = raycasterRef.current.intersectObjects(starMeshes, false);
      
      if (intersects.length > 0) {
        const star = intersects[0].object.userData.star as ComparisonStar;
        setSelectedStar(star);
      }
    };

    renderer.domElement.addEventListener('click', handleClick);

    const handleDoubleClick = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const intersects = raycasterRef.current.intersectObjects(starMeshes, false);
      
      if (intersects.length > 0) {
        const star = intersects[0].object.userData.star as ComparisonStar;
        handleSelectStar(star);
      }
    };

    renderer.domElement.addEventListener('dblclick', handleDoubleClick);

    const animate = (time: number) => {
      const delta = Math.min(time - lastTimeRef.current, 50);
      lastTimeRef.current = time;

      animationIdRef.current = requestAnimationFrame(animate);
      controls.update();

      starMeshes.forEach((mesh, i) => {
        if (mesh.material instanceof THREE.ShaderMaterial && mesh.material.uniforms.intensity) {
          const pulse = Math.sin(time * 0.002 + i * 0.5) * 0.2 + 0.8;
          mesh.material.uniforms.intensity.value = pulse;
        }
      });

      renderer.render(scene, camera);
    };
    lastTimeRef.current = performance.now();
    animate(lastTimeRef.current);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('click', handleClick);
      renderer.domElement.removeEventListener('dblclick', handleDoubleClick);
      cancelAnimationFrame(animationIdRef.current);
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, [showDataCompare, handleSelectStar]);

  return (
    <div 
      className={`data-compare-overlay ${showDataCompare ? 'visible' : ''}`}
      style={{ 
        transform: showDataCompare ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <button className="close-btn" onClick={handleClose} aria-label="关闭">
        <X size={20} />
      </button>
      
      <div className="data-compare-content">
        <div className="scatter-container">
          <div ref={canvasRef} className="scatter-canvas" />
          <div className="axis-labels axis-x">质量 (M☉)</div>
          <div className="axis-labels axis-y">温度 (K)</div>
          <div className="axis-labels axis-z">光度 (L☉)</div>
          <div style={{ 
            position: 'absolute', 
            bottom: '50px', 
            left: '50%', 
            transform: 'translateX(-50%)',
            fontSize: '11px',
            color: 'var(--color-text-secondary)',
            fontFamily: 'Orbitron, sans-serif',
          }}>
            拖拽旋转 · 点击选中 · 双击切换
          </div>
        </div>

        <div className="data-details">
          <h2>恒星对比</h2>
          
          {selectedStar ? (
            <div className="star-detail-row">
              <div className="star-name">{selectedStar.name}</div>
              <div className="param-row">
                <span className="param-label">质量</span>
                <span className="param-value">{selectedStar.mass} M☉</span>
              </div>
              <div className="param-row">
                <span className="param-label">温度</span>
                <span className="param-value">{selectedStar.temperature.toLocaleString()} K</span>
              </div>
              <div className="param-row">
                <span className="param-label">光度</span>
                <span className="param-value">{selectedStar.luminosity.toExponential(2)} L☉</span>
              </div>
              <button 
                className="play-btn select-star-btn"
                onClick={() => handleSelectStar(selectedStar)}
              >
                选择此恒星
              </button>
              {!STAR_PRESET_MASSES.includes(selectedStar.mass) && (
                <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textAlign: 'center', marginTop: '8px' }}>
                  将自动匹配到最接近的可用质量
                </p>
              )}
            </div>
          ) : (
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', textAlign: 'center', padding: '20px 0' }}>
              点击散点图中的数据点查看详情
            </p>
          )}

          <div style={{ marginTop: 'auto' }}>
            <h3 style={{ 
              fontFamily: 'Orbitron, sans-serif', 
              fontSize: '14px', 
              color: 'var(--color-secondary)',
              marginBottom: '12px',
              letterSpacing: '1px',
            }}>
              可选恒星质量
            </h3>
            {STAR_PRESETS.map(preset => (
              <div 
                key={preset.mass}
                className={`preset-star-item ${currentMass === preset.mass ? 'active' : ''}`}
                onClick={() => handlePresetClick(preset.mass)}
              >
                <span className="preset-mass">{preset.mass} M☉</span>
                <span className="preset-name">{preset.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
