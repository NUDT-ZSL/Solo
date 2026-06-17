import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { X } from 'lucide-react';
import { useStarStore } from '@/store/useStarStore';
import { COMPARISON_STARS, STAR_PRESETS } from '@/data/starData';
import { ComparisonStar } from '@/core/types';

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
  const pointsRef = useRef<THREE.Points | null>(null);
  const [selectedStar, setSelectedStar] = useState<ComparisonStar | null>(null);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());

  useEffect(() => {
    if (!showDataCompare || !canvasRef.current) return;

    const container = canvasRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0F0F23);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(8, 8, 12);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;

    const axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);

    const gridHelper = new THREE.GridHelper(10, 10, 0x2A2A3E, 0x1A1A2E);
    gridHelper.position.y = -0.5;
    scene.add(gridHelper);

    const positions = new Float32Array(COMPARISON_STARS.length * 3);
    const colors = new Float32Array(COMPARISON_STARS.length * 3);
    const sizes = new Float32Array(COMPARISON_STARS.length);

    const maxMass = Math.max(...COMPARISON_STARS.map(s => s.mass));
    const maxTemp = Math.max(...COMPARISON_STARS.map(s => s.temperature));
    const maxLum = Math.max(...COMPARISON_STARS.map(s => Math.log10(s.luminosity + 1)));

    COMPARISON_STARS.forEach((star, i) => {
      positions[i * 3] = (star.mass / maxMass) * 8 - 4;
      positions[i * 3 + 1] = (star.temperature / maxTemp) * 8 - 4;
      positions[i * 3 + 2] = (Math.log10(star.luminosity + 1) / maxLum) * 8 - 4;

      const color = new THREE.Color(star.color);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = 0.5 + (star.mass / maxMass) * 1.5;
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);
    pointsRef.current = points;

    COMPARISON_STARS.forEach((star, i) => {
      const glowGeometry = new THREE.SphereGeometry(sizes[i] * 0.6, 16, 16);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: star.color,
        transparent: true,
        opacity: 0.3,
      });
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      glow.position.set(
        positions[i * 3],
        positions[i * 3 + 1],
        positions[i * 3 + 2]
      );
      glow.userData.starIndex = i;
      glow.userData.star = star;
      scene.add(glow);
    });

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const handleClick = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const intersects = raycasterRef.current.intersectObjects(scene.children, true);
      
      for (const intersect of intersects) {
        if (intersect.object.userData.star !== undefined) {
          const star = intersect.object.userData.star as ComparisonStar;
          setSelectedStar(star);
          break;
        }
      }
    };

    renderer.domElement.addEventListener('click', handleClick);

    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

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
      cancelAnimationFrame(animationIdRef.current);
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [showDataCompare]);

  const handleClose = () => {
    setShowDataCompare(false);
  };

  const handleSelectStar = () => {
    if (selectedStar) {
      onStarSelect(selectedStar.mass);
      setShowDataCompare(false);
    }
  };

  return (
    <div className={`data-compare-overlay ${showDataCompare ? 'visible' : ''}`}>
      <button className="close-btn" onClick={handleClose}>
        <X size={20} />
      </button>
      
      <div className="data-compare-content">
        <div className="scatter-container">
          <div ref={canvasRef} className="scatter-canvas" />
          <div className="axis-labels axis-x">质量 (M☉)</div>
          <div className="axis-labels axis-y">温度 (K)</div>
          <div className="axis-labels axis-z">光度 (L☉)</div>
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
                className="play-btn"
                onClick={handleSelectStar}
                disabled={!STAR_PRESET_MASSES.some(m => m === selectedStar.mass)}
              >
                选择此恒星
              </button>
              {!STAR_PRESET_MASSES.some(m => m === selectedStar.mass) && (
                <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textAlign: 'center' }}>
                  该恒星质量不可用，可选质量：0.5, 1, 4, 10, 25 M☉
                </p>
              )}
            </div>
          ) : (
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', textAlign: 'center' }}>
              点击散点图中的数据点查看详情
            </p>
          )}

          <div style={{ marginTop: 'auto' }}>
            <h3 style={{ 
              fontFamily: 'Orbitron, sans-serif', 
              fontSize: '14px', 
              color: 'var(--color-secondary)',
              marginBottom: '12px',
              letterSpacing: '1px'
            }}>
              可选恒星质量
            </h3>
            {STAR_PRESETS.map(preset => (
              <div 
                key={preset.mass}
                style={{
                  padding: '10px 12px',
                  marginBottom: '8px',
                  background: currentMass === preset.mass ? 'rgba(108, 99, 255, 0.3)' : 'rgba(108, 99, 255, 0.1)',
                  borderRadius: '8px',
                  border: `1px solid ${currentMass === preset.mass ? 'var(--color-primary)' : 'var(--border-color)'}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onClick={() => {
                  onStarSelect(preset.mass);
                  setShowDataCompare(false);
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(108, 99, 255, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = currentMass === preset.mass 
                    ? 'rgba(108, 99, 255, 0.3)' 
                    : 'rgba(108, 99, 255, 0.1)';
                }}
              >
                <span style={{ fontFamily: 'Orbitron, sans-serif' }}>
                  {preset.mass} M☉
                </span>
                <span style={{ marginLeft: '12px', color: 'var(--color-text-secondary)', fontSize: '12px' }}>
                  {preset.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const STAR_PRESET_MASSES = STAR_PRESETS.map(p => p.mass);
