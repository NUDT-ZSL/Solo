import { Canvas, useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import type { LightFixture, LayoutData, LightingResult, TimePreset, GridPoint } from '../types';
import { getColorFromTemperature, getColorFromIlluminance, LIGHT_PRESETS } from '../types';
import { calculateLighting } from '../utils/DataLoader';

interface SceneManagerProps {
  layout: LayoutData;
  lights: LightFixture[];
  onLightsChange: (lights: LightFixture[]) => void;
  timePreset: TimePreset;
  onLightingResult: (result: LightingResult) => void;
  draggingLightType: string | null;
  onDraggingLightTypeChange: (type: string | null) => void;
}

function LightCone({ light }: { light: LightFixture }) {
  const color = getColorFromTemperature(light.color_temp);
  const directionRad = (light.direction * Math.PI / 180;

  let coneAngle = Math.PI / 3;
  let coneHeight = 3;
  if (light.type === 'spotlight') {
    coneAngle = Math.PI / 6;
    coneHeight = 4;
  } else if (light.type === 'striplight') {
    coneAngle = Math.PI / 2.5;
    coneHeight = 2.5;
  }

  const coneRadius = Math.tan(coneAngle) * coneHeight;

  return (
    <group position={[light.x, light.z, light.y}>
      <mesh rotation={[Math.PI / 2, 0, directionRad]}>
        <mesh position={[0, -coneHeight / 2, 0]}>
          <cylinderGeometry args={[0, coneRadius, coneHeight, 16, 1, true]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={light.is_on ? 0.15 : 0}
            side={THREE.DoubleSide}
            transparent
          />
        </mesh>
        <mesh position={[0, -coneHeight, 0]}>
          <circleGeometry args={[coneRadius, 16]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={light.is_on ? 0.1 : 0}
            side={THREE.DoubleSide}
          />
        </mesh>
      </mesh>
      {light.is_on && (
        <pointLight
          color={color}
          intensity={(light.brightness / 1000) * 2}
          distance={10}
          position={[0, 0, 0]}
        />
      )}
    </group>
  );
}

function LightFixtureModel({
  light,
  isSelected,
  onClick,
  onContextMenu,
  onWheel,
  onDragStart,
  onDrag,
  onDragEnd
}: {
  light: LightFixture;
  isSelected: boolean;
  onClick: (e: ThreeEvent<MouseEvent>) => void;
  onContextMenu: (e: ThreeEvent<MouseEvent>) => void;
  onWheel: (e: ThreeEvent<WheelEvent>) => void;
  onDragStart: (e: ThreeEvent<PointerEvent>) => void;
  onDrag: (e: ThreeEvent<PointerEvent>) => void;
  onDragEnd: (e: ThreeEvent<PointerEvent>) => void;
}) {
  const color = getColorFromTemperature(light.color_temp);
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.005;
    }
  });

  const renderFixture = () => {
    switch (light.type) {
      case 'pendant':
        return (
          <group>
            <mesh position={[0, 0.15, 0]}>
              <cylinderGeometry args={[0.02, 0.02, 0.3, 8]} />
              <meshStandardMaterial color="#888888" />
            </mesh>
            <mesh position={[0, -0.05, 0]}>
              <cylinderGeometry args={[0.15, 0.25, 0.2, 16]} />
              <meshStandardMaterial
                color={light.is_on ? color : '#555555'}
                emissive={light.is_on ? color : '#000000'}
                emissiveIntensity={light.is_on ? 0.5 : 0}
              />
            </mesh>
          </group>
        );
      case 'spotlight':
        return (
          <group rotation={[0, 0, Math.PI / 6]}>
            <mesh position={[0, 0.1, 0]}>
              <boxGeometry args={[0.1, 0.15, 0.1]} />
              <meshStandardMaterial color="#333333" />
            </mesh>
            <mesh position={[0, 0, 0.08]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.05, 0.12, 0.15, 12]} />
              <meshStandardMaterial
                color={light.is_on ? color : '#444444'}
                emissive={light.is_on ? color : '#000000'}
                emissiveIntensity={light.is_on ? 0.5 : 0}
              />
            </mesh>
          </group>
        );
      case 'floor':
        return (
          <group>
            <mesh position={[0, -0.6, 0]}>
              <cylinderGeometry args={[0.15, 0.18, 0.02, 16]} />
              <meshStandardMaterial color="#222222" />
            </mesh>
            <mesh position={[0, -0.1, 0]}>
              <cylinderGeometry args={[0.02, 0.02, 1, 8]} />
              <meshStandardMaterial color="#444444" />
            </mesh>
            <mesh position={[0, 0.15, 0]}>
              <sphereGeometry args={[0.15, 16, 16]} />
              <meshStandardMaterial
                color={light.is_on ? color : '#666666'}
                emissive={light.is_on ? color : '#000000'}
                emissiveIntensity={light.is_on ? 0.5 : 0}
              />
            </mesh>
          </group>
        );
      case 'striplight':
        return (
          <group>
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[0.8, 0.05, 0.08]} />
              <meshStandardMaterial color="#333333" />
            </mesh>
            <mesh position={[0, -0.03, 0]}>
              <boxGeometry args={[0.75, 0.02, 0.05]} />
              <meshStandardMaterial
                color={light.is_on ? color : '#555555'}
                emissive={light.is_on ? color : '#000000'}
                emissiveIntensity={light.is_on ? 0.8 : 0}
              />
            </mesh>
          </group>
        );
      default:
        return null;
    }
  };

  return (
    <group
      position={[light.x, light.z, light.y]}
      onClick={onClick}
      onContextMenu={onContextMenu}
      onWheel={onWheel}
      onPointerDown={onDragStart}
      onPointerMove={onDrag}
      onPointerUp={onDragEnd}
      onPointerLeave={onDragEnd}
    >
      <group ref={meshRef as any}>
        {renderFixture()}
      </group>
      {isSelected && (
        <mesh position={[0, -light.z + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.3, 0.35, 32]} />
          <meshBasicMaterial color="#FFD700" transparent opacity={0.8} />
        </mesh>
      )}
      {light.is_on && <LightCone light={light} />}
    </group>
  );
}

function FurnitureModel({ furniture }: { furniture: LayoutData['furniture'][0] }) {
  return (
    <mesh
      position={[
        furniture.x + furniture.width / 2,
        furniture.height / 2,
        furniture.y + furniture.depth / 2
      ]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[furniture.width, furniture.height, furniture.depth]} />
      <meshStandardMaterial color={furniture.color} roughness={0.7} metalness={0.1} />
    </mesh>
  );
}

function RoomWalls({ layout }: { layout: LayoutData }) {
  const wallHeight = layout.height;
  const wallThickness = 0.1;

  return (
    <group>
      <mesh
        position={[layout.width / 2, wallHeight / 2, -wallThickness / 2]}
        receiveShadow
      >
        <boxGeometry args={[layout.width, wallHeight, wallThickness]} />
        <meshStandardMaterial color="#E8E8E8" />
      </mesh>
      <mesh
        position={[layout.width / 2, wallHeight / 2, layout.depth + wallThickness / 2]}
        receiveShadow
      >
        <boxGeometry args={[layout.width, wallHeight, wallThickness]} />
        <meshStandardMaterial color="#E8E8E8" />
      </mesh>
      <mesh
        position={[-wallThickness / 2, wallHeight / 2, layout.depth / 2]}
        receiveShadow
      >
        <boxGeometry args={[wallThickness, wallHeight, layout.depth]} />
        <meshStandardMaterial color="#D8D8D8" />
      </mesh>
      <mesh
        position={[layout.width + wallThickness / 2, wallHeight / 2, layout.depth / 2]}
        receiveShadow
      >
        <boxGeometry args={[wallThickness, wallHeight, layout.depth]} />
        <meshStandardMaterial color="#D8D8D8" />
      </mesh>
    </group>
  );
}

function Windows({ layout }: { layout: LayoutData }) {
  return (
    <group>
      {layout.windows.map((window, idx) => (
        <mesh
          key={idx}
          position={[
            window.x,
            window.z + window.height / 2,
            window.y
          ]}
        >
          <boxGeometry args={[window.width, window.height, 0.05]} />
          <meshStandardMaterial
            color="#87CEEB"
            transparent
            opacity={0.5}
            emissive="#FFFFFF"
            emissiveIntensity={0.2}
          />
        </mesh>
      ))}
    </group>
  );
}

function HeatmapOverlay({
  gridData,
  darkAreas,
  glareAreas,
  layoutWidth,
  layoutDepth
}: {
  gridData: GridPoint[];
  darkAreas: GridPoint[];
  glareAreas: GridPoint[];
  layoutWidth: number;
  layoutDepth: number;
}) {
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setOpacity(0.6), 50);
    return () => clearTimeout(timer);
  }, [gridData]);

  const gridSize = 0.5;

  return (
    <group>
      {gridData.map((point, idx) => {
      const color = getColorFromIlluminance(point.illuminance);
      return (
        <mesh
          key={idx}
          position={[point.x, 0.02, point.y]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[gridSize * 0.95, gridSize * 0.95]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={opacity}
          />
        </mesh>
      );
    })}
      {darkAreas.map((point, idx) => (
        <mesh
          key={`dark-${idx}`}
          position={[point.x, 0.05, point.y]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[0.2, 0.25, 16]} />
          <meshBasicMaterial color="#0000FF" transparent opacity={0.8} />
        </mesh>
      ))}
      {glareAreas.map((point, idx) => (
        <mesh
          key={`glare-${idx}`}
          position={[point.x, 0.05, point.y]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[0.2, 0.25, 16]} />
          <meshBasicMaterial color="#FF0000" transparent opacity={0.8} />
        </mesh>
      ))}
    </group>
  );
}

function SceneContent({
  layout,
  lights,
  onLightsChange,
  timePreset,
  onLightingResult,
  draggingLightType,
  onDraggingLightTypeChange
}: SceneManagerProps) {
  const { scene } = useThree();
  const [selectedLightId, setSelectedLightId] = useState<string | null>(null);
  const [draggingLight, setDraggingLight] = useState<string | null>(null);
  const [isDraggingNew, setIsDraggingNew] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    lightId: string | null;
    x: number;
    y: number;
  }>({ visible: false, lightId: null, x: 0, y: 0 });
  const [lightingResult, setLightingResult] = useState<LightingResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const planeRef = useRef<THREE.Mesh>(null);
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());

  const calculate = useCallback(async () => {
    if (isCalculating) return;
    setIsCalculating(true);
    try {
      const result = await calculateLighting(lights, layout.id, timePreset);
      setLightingResult(result);
      onLightingResult(result);
    } catch (error) {
      console.error('Lighting calculation failed:', error);
    } finally {
      setIsCalculating(false);
    }
  }, [lights, layout.id, timePreset, onLightingResult, isCalculating]);

  useEffect(() => {
    calculate();
    const interval = setInterval(calculate, 2000);
    return () => clearInterval(interval);
  }, [calculate]);

  const handlePointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (draggingLightType && !isDraggingNew) {
      setIsDraggingNew(true);
    }
    if ((draggingLight || isDraggingNew) && planeRef.current) {
      raycaster.current.setFromCamera(e.pointer, e.camera);
      const intersects = raycaster.current.intersectObject(planeRef.current);
      if (intersects.length > 0) {
        const point = intersects[0].point;
        const newX = Math.max(0.5, Math.min(layout.width - 0.5, Math.round(point.x * 2) / 2);
        const newY = Math.max(0.5, Math.min(layout.depth - 0.5, Math.round(point.z * 2) / 2);

        if (isDraggingNew && draggingLightType) {
          const preset = LIGHT_PRESETS.find(p => p.type === draggingLightType);
          if (preset) {
            const newLight: LightFixture = {
              id: `light_${Date.now()}`,
              type: preset.type,
              name: preset.name,
              x: newX,
              y: newY,
              z: preset.defaultZ,
              direction: 0,
              brightness: preset.defaultBrightness,
              color_temp: preset.defaultColorTemp,
              is_on: true
            };
            onLightsChange([...lights, newLight]);
            setDraggingLight(newLight.id);
            setSelectedLightId(newLight.id);
            setIsDraggingNew(false);
            onDraggingLightTypeChange(null);
          }
        } else if (draggingLight) {
            onLightsChange(
              lights.map(l =>
            l.id === draggingLight
              ? { ...l, x: newX, y: newY }
              : l
            )
          );
        }
      }
    }
  }, [draggingLight, isDraggingNew, draggingLightType, lights, layout.width, layout.depth, onLightsChange, onDraggingLightTypeChange]);

  const handleLightClick = useCallback((lightId: string) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    setSelectedLightId(lightId);
    setContextMenu({ visible: false, lightId: null, x: 0, y: 0 });
  }, []);

  const handleLightContextMenu = useCallback((lightId: string) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    setSelectedLightId(lightId);
    setContextMenu({
      visible: true,
      lightId,
      x: e.clientX,
      y: e.clientY
    });
  }, []);

  const handleLightWheel = useCallback((lightId: string) => (e: ThreeEvent<WheelEvent>) => {
    e.stopPropagation();
    const delta = e.deltaY > 0 ? 15 : -15;
    onLightsChange(
      lights.map(l =>
        l.id === lightId
          ? { ...l, direction: (l.direction + delta + 360) % 360 }
          : l
      )
    );
  }, [lights, onLightsChange]);

  const handleLightDragStart = useCallback((lightId: string) => (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setDraggingLight(lightId);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, []);

  const handleLightDrag = useCallback((lightId: string) => (e: ThreeEvent<PointerEvent>) => {
    if (draggingLight === lightId) {
      handlePointerMove(e);
    }
  }, [draggingLight, handlePointerMove]);

  const handleLightDragEnd = useCallback(() => {
    setDraggingLight(null);
    setIsDraggingNew(false);
  }, []);

  const handleSceneClick = useCallback(() => {
    setSelectedLightId(null);
    setContextMenu({ visible: false, lightId: null, x: 0, y: 0 });
  }, []);

  const handleDeleteLight = useCallback(() => {
    if (contextMenu.lightId) {
      onLightsChange(lights.filter(l => l.id !== contextMenu.lightId));
      setContextMenu({ visible: false, lightId: null, x: 0, y: 0 });
      setSelectedLightId(null);
    }
  }, [contextMenu.lightId, lights, onLightsChange]);

  const handleDuplicateLight = useCallback(() => {
    if (contextMenu.lightId) {
      const light = lights.find(l => l.id === contextMenu.lightId);
      if (light) {
        const newLight: LightFixture = {
          ...light,
          id: `light_${Date.now()}`,
          x: light.x + 0.5,
          y: light.y + 0.5
        };
        onLightsChange([...lights, newLight]);
      }
      setContextMenu({ visible: false, lightId: null, x: 0, y: 0 });
    }
  }, [contextMenu.lightId, lights, onLightsChange]);

  const handleToggleLight = useCallback(() => {
    if (contextMenu.lightId) {
      onLightsChange(
        lights.map(l =>
          l.id === contextMenu.lightId
            ? { ...l, is_on: !l.is_on }
            : l
        )
      );
    }
  }, [contextMenu.lightId, lights, onLightsChange]);

  const handleBrightnessChange = useCallback((value: number) => {
    if (contextMenu.lightId) {
      onLightsChange(
        lights.map(l =>
          l.id === contextMenu.lightId
            ? { ...l, brightness: value }
            : l
        )
      );
    }
  }, [contextMenu.lightId, lights, onLightsChange]);

  const handleColorTempChange = useCallback((value: number) => {
    if (contextMenu.lightId) {
      onLightsChange(
        lights.map(l =>
          l.id === contextMenu.lightId
            ? { ...l, color_temp: value }
            : l
        )
      );
    }
  }, [contextMenu.lightId, lights, onLightsChange]);

  const selectedLight = lights.find(l => l.id === contextMenu.lightId);

  const naturalLight = lightingResult?.natural_light || {
    ambient_color: '#FFFFFF',
    ambient_intensity: 0.5,
    sun_intensity: 500,
    sun_direction: [0, -1, 0.5]
  };

  return (
    <>
      <color attach="background" args={[naturalLight.ambient_color]} />
      <ambientLight intensity={naturalLight.ambient_intensity} />
      <directionalLight
        position={[
          naturalLight.sun_direction[0] * 10,
          naturalLight.sun_direction[2] * 10,
          naturalLight.sun_direction[1] * 10
        ]}
        intensity={naturalLight.sun_intensity / 1000}
        castShadow
      />

      <mesh
        ref={planeRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[layout.width / 2, 0, layout.depth / 2]}
        onClick={handleSceneClick}
        onPointerMove={handlePointerMove}
        onPointerUp={handleLightDragEnd}
        receiveShadow
      >
        <planeGeometry args={[layout.width, layout.depth]} />
        <meshStandardMaterial color="#F5F5DC" />
      </mesh>

      <gridHelper args={[Math.max(layout.width, layout.depth), Math.max(layout.width, layout.depth) * 2, '#444444', '#333333']} position={[layout.width / 2, 0.001, layout.depth / 2]} />

      <RoomWalls layout={layout} />
      <Windows layout={layout} />

      {layout.furniture.map(furniture => (
        <FurnitureModel key={furniture.id} furniture={furniture} />
      ))}

      {lights.map(light => (
        <LightFixtureModel
          key={light.id}
          light={light}
          isSelected={selectedLightId === light.id}
          onClick={handleLightClick(light.id)}
          onContextMenu={handleLightContextMenu(light.id)}
          onWheel={handleLightWheel(light.id)}
          onDragStart={handleLightDragStart(light.id)}
          onDrag={handleLightDrag(light.id)}
          onDragEnd={handleLightDragEnd}
        />
      ))}

      {lightingResult && (
        <HeatmapOverlay
          gridData={lightingResult.grid_data}
          darkAreas={lightingResult.dark_areas}
          glareAreas={lightingResult.glare_areas}
          layoutWidth={layout.width}
          layoutDepth={layout.depth}
        />
      )}

      {contextMenu.visible && selectedLight && (
        <Html position={[selectedLight.x, selectedLight.z + 1, selectedLight.y]}>
          <div className="light-context-menu">
            <div className="context-menu-header">
              <span>{selectedLight.name}</span>
              <button
                className="close-btn"
                onClick={() => setContextMenu({ visible: false, lightId: null, x: 0, y: 0 })}
              >
                ×
              </button>
            </div>
            <div className="context-menu-item">
              <button onClick={handleToggleLight}>
                {selectedLight.is_on ? '🔴 关闭' : '🟢 开启'}
              </button>
            </div>
            <div className="context-menu-item">
              <label>亮度: {selectedLight.brightness}</label>
              <input
                type="range"
                min="100"
                max="2000"
                value={selectedLight.brightness}
                onChange={(e) => handleBrightnessChange(Number(e.target.value))}
              />
            </div>
            <div className="context-menu-item">
              <label>色温: {selectedLight.color_temp}K</label>
              <input
                type="range"
                min="2700"
                max="6500"
                step="100"
                value={selectedLight.color_temp}
                onChange={(e) => handleColorTempChange(Number(e.target.value))}
              />
            </div>
            <div className="context-menu-actions">
              <button onClick={handleDuplicateLight}>📋 复制</button>
              <button className="danger" onClick={handleDeleteLight}>🗑️ 删除</button>
            </div>
          </div>
        </Html>
      )}

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.05}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2}
        minDistance={2}
        maxDistance={15}
        target={[layout.width / 2, 0, layout.depth / 2]}
      />
    </>
  );
}

export default function SceneManager(props: SceneManagerProps) {
  const { layout } = props;
  const centerX = layout.width / 2;
  const centerZ = layout.depth / 2;

  return (
    <div className="scene-container">
      <Canvas
        shadows
        camera={{
          position: [centerX + 8, 8, centerZ + 8],
          fov: 50,
          near: 0.1,
          far: 100
        }}
        gl={{ antialias: true, alpha: false }}
        onCreated={({ gl }) => {
          gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        }}
      >
        <SceneContent {...props} />
      </Canvas>
    </div>
  );
}
