import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { initScene, animateCamera, SceneCore } from './sceneSetup';
import { addRoots, RootSystem, RootNode, highlightRoot } from './rootSystem';
import { createWaterSystem, updateWater, setTimeScale, WaterSystem } from './waterSim';

interface TooltipData {
  visible: boolean;
  x: number;
  y: number;
  depth: number;
  capillaryCount: number;
  waterContent: number;
  plantType: string;
}

function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneCoreRef = useRef<SceneCore | null>(null);
  const rootSystemRef = useRef<RootSystem | null>(null);
  const waterSystemRef = useRef<WaterSystem | null>(null);
  const soilMaterialRef = useRef<THREE.MeshPhongMaterial | null>(null);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const hoveredNodeRef = useRef<RootNode | null>(null);

  const [wheatWater, setWheatWater] = useState(0);
  const [cornWater, setCornWater] = useState(0);
  const [wheatRate, setWheatRate] = useState(0);
  const [cornRate, setCornRate] = useState(0);
  const [timeScale, setTimeScaleState] = useState(1);
  const [soilDryness, setSoilDryness] = useState(0);
  const [tooltip, setTooltip] = useState<TooltipData>({
    visible: false,
    x: 0,
    y: 0,
    depth: 0,
    capillaryCount: 0,
    waterContent: 0,
    plantType: '',
  });

  const handleTimeScaleChange = useCallback((value: number) => {
    setTimeScaleState(value);
    if (waterSystemRef.current) {
      setTimeScale(waterSystemRef.current, value);
    }
  }, []);

  const handleReset = useCallback(() => {
    window.location.reload();
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const sceneCore = initScene(containerRef.current);
    sceneCoreRef.current = sceneCore;

    const soilMesh = sceneCore.soilContainer.children.find(
      (child) => child instanceof THREE.Mesh && (child as THREE.Mesh).isMesh
    ) as THREE.Mesh | undefined;
    
    if (soilMesh) {
      soilMaterialRef.current = soilMesh.material as THREE.MeshPhongMaterial;
    }

    const rootSystem = addRoots(sceneCore.scene);
    rootSystemRef.current = rootSystem;

    const waterSystem = createWaterSystem(sceneCore.scene);
    waterSystemRef.current = waterSystem;

    let statsUpdateTimer = 0;
    let lastWheatAbsorbed = 0;
    let lastCornAbsorbed = 0;
    let lastStatsTime = performance.now();

    sceneCore.animate((delta) => {
      if (waterSystemRef.current && rootSystemRef.current && soilMaterialRef.current) {
        updateWater(
          waterSystemRef.current,
          delta,
          rootSystemRef.current.nodes,
          soilMaterialRef.current
        );

        statsUpdateTimer += delta;
        if (statsUpdateTimer >= 0.2) {
          statsUpdateTimer = 0;
          const wheatNodes = rootSystemRef.current.nodes.filter(n => n.plantType === 'wheat');
          const cornNodes = rootSystemRef.current.nodes.filter(n => n.plantType === 'corn');
          const wheatTotal = wheatNodes.reduce((sum, n) => sum + n.waterContent, 0);
          const cornTotal = cornNodes.reduce((sum, n) => sum + n.waterContent, 0);
          
          const now = performance.now();
          const timeDiff = (now - lastStatsTime) / 1000;
          const wheatRate = (waterSystemRef.current.totalAbsorbedWheat - lastWheatAbsorbed) / timeDiff;
          const cornRate = (waterSystemRef.current.totalAbsorbedCorn - lastCornAbsorbed) / timeDiff;
          
          lastWheatAbsorbed = waterSystemRef.current.totalAbsorbedWheat;
          lastCornAbsorbed = waterSystemRef.current.totalAbsorbedCorn;
          lastStatsTime = now;
          
          setWheatWater(Math.round(wheatTotal));
          setCornWater(Math.round(cornTotal));
          setWheatRate(wheatRate);
          setCornRate(cornRate);
          setSoilDryness(waterSystemRef.current.soilDryness);
        }
      }
    });

    animateCamera(sceneCore.camera, 8, 2);

    const handleMouseMove = (event: MouseEvent) => {
      if (!containerRef.current || !sceneCoreRef.current || !rootSystemRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(
        mouseRef.current,
        sceneCoreRef.current.camera
      );

      const nodeMeshes = rootSystemRef.current.nodes.map((n) => n.mesh);
      const intersects = raycasterRef.current.intersectObjects(nodeMeshes);

      if (intersects.length > 0) {
        const node = (intersects[0].object as any).rootNode as RootNode;
        hoveredNodeRef.current = node;

        setTooltip({
          visible: true,
          x: event.clientX + 15,
          y: event.clientY + 15,
          depth: Math.abs(node.position.y),
          capillaryCount: node.capillaryCount,
          waterContent: node.waterContent,
          plantType: node.plantType === 'wheat' ? '小麦' : '玉米',
        });

        document.body.style.cursor = 'pointer';
      } else {
        hoveredNodeRef.current = null;
        setTooltip((prev) => ({ ...prev, visible: false }));
        document.body.style.cursor = 'default';
      }
    };

    const handleClick = () => {
      if (hoveredNodeRef.current && sceneCoreRef.current) {
        highlightRoot(hoveredNodeRef.current);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick);
      document.body.style.cursor = 'default';
    };
  }, []);

  const speedOptions = [1, 2, 5, 10];

  return (
    <div className="app-container">
      <div ref={containerRef} className="scene-container" />

      <div className="info-panel">
        <h3>植物水分状态</h3>
        
        <div className="plant-info">
          <div className="plant-name">
            <span className="plant-color-dot wheat" />
            <span>小麦（深根系）</span>
          </div>
          <div className="plant-stats">
            <div className="stat-item">
              <span className="stat-label">总含水量</span>
              <span className="stat-value">{wheatWater}%</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">吸水速率</span>
              <span className="stat-value">{wheatRate.toFixed(1)}/s</span>
            </div>
          </div>
        </div>

        <div className="plant-info">
          <div className="plant-name">
            <span className="plant-color-dot corn" />
            <span>玉米（浅根系）</span>
          </div>
          <div className="plant-stats">
            <div className="stat-item">
              <span className="stat-label">总含水量</span>
              <span className="stat-value">{cornWater}%</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">吸水速率</span>
              <span className="stat-value">{cornRate.toFixed(1)}/s</span>
            </div>
          </div>
        </div>

        <div className="soil-status">
          <label>土壤湿度</label>
          <div className="soil-bar">
            <div 
              className="soil-bar-fill" 
              style={{ width: `${(1 - soilDryness) * 100}%` }}
            />
          </div>
          <div className="soil-bar-label">
            <span>湿润</span>
            <span>干裂</span>
          </div>
        </div>
      </div>

      <div className="control-panel">
        <h3>控制面板</h3>
        
        <div className="time-control">
          <label>时间加速</label>
          <div className="slider-container">
            <input
              type="range"
              min="0"
              max={speedOptions.length - 1}
              step="1"
              value={speedOptions.indexOf(timeScale)}
              onChange={(e) => {
                const index = parseInt(e.target.value);
                handleTimeScaleChange(speedOptions[index]);
              }}
              className="slider"
            />
            <div className="speed-labels">
              {speedOptions.map((speed) => (
                <span key={speed}>{speed}x</span>
              ))}
            </div>
            <div className="current-speed">
              当前速度: {timeScale}x
            </div>
          </div>
        </div>

        <button className="btn" onClick={handleReset}>
          重置场景
        </button>
      </div>

      <div 
        className={`tooltip ${tooltip.visible ? 'visible' : ''}`}
        style={{ 
          left: tooltip.x, 
          top: tooltip.y 
        }}
      >
        <div className="tooltip-title">{tooltip.plantType}根节点</div>
        <div className="tooltip-stats">
          <div className="tooltip-stat">
            <span className="tooltip-stat-label">深度</span>
            <span className="tooltip-stat-value">{tooltip.depth.toFixed(2)} 单位</span>
          </div>
          <div className="tooltip-stat">
            <span className="tooltip-stat-label">毛细根数量</span>
            <span className="tooltip-stat-value">{tooltip.capillaryCount}</span>
          </div>
          <div className="tooltip-stat">
            <span className="tooltip-stat-label">含水量</span>
            <span className="tooltip-stat-value">{tooltip.waterContent.toFixed(1)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
