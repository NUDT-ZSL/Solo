import React, { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid';
import { useScene, Building } from '../App';
import { calculateSunLight, degToRad } from '../utils/sunCalculation';

const GRID_SIZE = 40;
const GRID_SPACING = 2;
const GRID_DIVISIONS = GRID_SIZE / GRID_SPACING;

function GridFloor({ onPlaceClick, isAddingMode }: { onPlaceClick: (pos: THREE.Vector3) => void; isAddingMode: boolean }) {
  const [hoverCell, setHoverCell] = useState<{ x: number; z: number } | null>(null);

  const gridLines = useMemo(() => {
    const points: THREE.Vector3[][] = [];
    const half = GRID_SIZE / 2;
    for (let i = 0; i <= GRID_DIVISIONS; i++) {
      const offset = -half + i * GRID_SPACING;
      points.push([new THREE.Vector3(-half, 0.01, offset), new THREE.Vector3(half, 0.01, offset)]);
      points.push([new THREE.Vector3(offset, 0.01, -half), new THREE.Vector3(offset, 0.01, half)]);
    }
    return points;
  }, []);

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!isAddingMode) return;
    e.stopPropagation();
    const half = GRID_SIZE / 2;
    let x = Math.round(e.point.x / GRID_SPACING) * GRID_SPACING;
    let z = Math.round(e.point.z / GRID_SPACING) * GRID_SPACING;
    x = Math.max(-half + GRID_SPACING, Math.min(half - GRID_SPACING, x));
    z = Math.max(-half + GRID_SPACING, Math.min(half - GRID_SPACING, z));
    setHoverCell({ x, z });
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (!isAddingMode) return;
    e.stopPropagation();
    const half = GRID_SIZE / 2;
    let x = Math.round(e.point.x / GRID_SPACING) * GRID_SPACING;
    let z = Math.round(e.point.z / GRID_SPACING) * GRID_SPACING;
    x = Math.max(-half + GRID_SPACING, Math.min(half - GRID_SPACING, x));
    z = Math.max(-half + GRID_SPACING, Math.min(half - GRID_SPACING, z));
    onPlaceClick(new THREE.Vector3(x, 0, z));
    setHoverCell(null);
  };

  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoverCell(null)}
        onClick={handleClick}
      >
        <planeGeometry args={[GRID_SIZE, GRID_SIZE]} />
        <meshStandardMaterial color="#1e293b" roughness={0.95} metalness={0.05} />
      </mesh>

      {gridLines.map((line, i) => (
        <Line key={i} points={line} color="#cbd5e1" lineWidth={1} transparent opacity={0.6} />
      ))}

      {hoverCell && isAddingMode && (
        <mesh position={[hoverCell.x, 0.02, hoverCell.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[GRID_SPACING, GRID_SPACING]} />
          <meshBasicMaterial color="#0ea5e9" transparent opacity={0.3} />
        </mesh>
      )}
    </group>
  );
}

function BuildingMesh({
  building,
  isSelected,
  isCutaway,
  isOtherInCutaway,
  onClick,
  onDoubleClick,
  onContextMenu,
}: {
  building: Building;
  isSelected: boolean;
  isCutaway: boolean;
  isOtherInCutaway: boolean;
  onClick: (e: ThreeEvent<MouseEvent>) => void;
  onDoubleClick: (e: ThreeEvent<MouseEvent>) => void;
  onContextMenu: (e: ThreeEvent<MouseEvent>) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [animated, setAnimated] = useState(false);
  const startTime = useRef(building.createdAt);
  const [hovered, setHovered] = useState(false);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const elapsed = Date.now() - startTime.current;
    const duration = 500;
    if (elapsed < duration) {
      const t = elapsed / duration;
      const eased = 1 - Math.pow(1 - t, 3);
      meshRef.current.scale.y = eased;
      meshRef.current.position.y = (building.height / 2) * eased;
      if (meshRef.current.material instanceof THREE.MeshStandardMaterial) {
        meshRef.current.material.emissiveIntensity = (1 - t) * 0.8;
      }
    } else if (!animated) {
      meshRef.current.scale.y = 1;
      meshRef.current.position.y = building.height / 2;
      if (meshRef.current.material instanceof THREE.MeshStandardMaterial) {
        meshRef.current.material.emissiveIntensity = 0;
      }
      setAnimated(true);
    }
  });

  const displayOpacity = isOtherInCutaway ? 0.25 : isCutaway ? 0.15 : 1;
  const transparent = isOtherInCutaway || isCutaway;

  return (
    <group position={[building.position.x, 0, building.position.z]}>
      <mesh
        ref={meshRef}
        castShadow
        receiveShadow
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        onContextMenu={onContextMenu}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'default';
        }}
      >
        <boxGeometry args={[building.width, building.height, building.depth]} />
        <meshStandardMaterial
          color={building.color}
          roughness={0.7}
          metalness={0.1}
          emissive={hovered ? '#0ea5e9' : '#000000'}
          emissiveIntensity={hovered ? 0.15 : 0}
          transparent={transparent}
          opacity={displayOpacity}
        />
      </mesh>

      {isSelected && (
        <lineSegments position={[0, building.height / 2, 0]}>
          <edgesGeometry args={[new THREE.BoxGeometry(building.width + 0.1, building.height + 0.1, building.depth + 0.1)]} />
          <lineBasicMaterial color="#facc15" linewidth={3} transparent opacity={0.85} />
        </lineSegments>
      )}

      {isSelected && <ScaleHandles building={building} />}
    </group>
  );
}

function ScaleHandles({ building }: { building: Building }) {
  const { updateBuilding } = useScene();
  const [dragging, setDragging] = useState<string | null>(null);
  const dragStart = useRef<{ y: number; height: number; corner?: { x: number; z: number; w: number; d: number } } | null>(null);
  const { camera, gl } = useThree();

  const handlePointerDown = (type: string, data?: any) => (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setDragging(type);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    if (type === 'top') {
      dragStart.current = { y: e.point.y, height: building.height };
    } else if (type.startsWith('corner')) {
      dragStart.current = {
        y: 0,
        height: building.height,
        corner: { x: building.position.x, z: building.position.z, w: building.width, d: building.depth },
      };
    }
  };

  useFrame(() => {
    if (!dragging || !dragStart.current) return;
  });

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!dragging || !dragStart.current) return;
      const raycaster = new THREE.Raycaster();
      const ndc = new THREE.Vector2(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1
      );
      raycaster.setFromCamera(ndc, camera);
      if (dragging === 'top') {
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.1);
        const intersect = new THREE.Vector3();
        raycaster.ray.intersectPlane(plane, intersect);
        if (intersect) {
          const newHeight = Math.max(1, Math.min(30, intersect.y));
          updateBuilding(building.id, { height: Math.round(newHeight * 10) / 10 });
        }
      } else if (dragging.startsWith('corner')) {
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const intersect = new THREE.Vector3();
        raycaster.ray.intersectPlane(plane, intersect);
        if (intersect && dragStart.current.corner) {
          const c = dragStart.current.corner;
          const parts = dragging.split('_');
          const sx = parts[1] === 'p' ? 1 : -1;
          const sz = parts[2] === 'p' ? 1 : -1;
          let newW = c.w;
          let newD = c.d;
          let newX = c.x;
          let newZ = c.z;
          const diffX = (intersect.x - c.x) * sx;
          const diffZ = (intersect.z - c.z) * sz;
          newW = Math.max(2, c.w + diffX * 2);
          newD = Math.max(2, c.d + diffZ * 2);
          newX = c.x + (sx * (newW - c.w)) / 2;
          newZ = c.z + (sz * (newD - c.d)) / 2;
          const half = GRID_SIZE / 2;
          const clampedX = Math.max(-half + newW / 2, Math.min(half - newW / 2, newX));
          const clampedZ = Math.max(-half + newD / 2, Math.min(half - newD / 2, newZ));
          updateBuilding(building.id, {
            width: Math.round(newW),
            depth: Math.round(newD),
            position: { x: Math.round(clampedX), z: Math.round(clampedZ) },
          });
        }
      }
    };

    const handleUp = () => {
      setDragging(null);
      dragStart.current = null;
    };

    if (dragging) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [dragging, camera, building.id, updateBuilding]);

  const hw = building.width / 2;
  const hd = building.depth / 2;
  const handleSize = 0.4;
  const corners = [
    { key: 'corner_n_n', x: -hw, z: -hd, sx: -1, sz: -1 },
    { key: 'corner_n_p', x: -hw, z: hd, sx: -1, sz: 1 },
    { key: 'corner_p_n', x: hw, z: -hd, sx: 1, sz: -1 },
    { key: 'corner_p_p', x: hw, z: hd, sx: 1, sz: 1 },
  ];

  return (
    <group>
      <mesh
        position={[0, building.height + 0.1, 0]}
        onPointerDown={handlePointerDown('top')}
      >
        <cylinderGeometry args={[0.3, 0.3, 0.3, 16]} />
        <meshStandardMaterial color="#0ea5e9" emissive="#0ea5e9" emissiveIntensity={0.3} />
      </mesh>
      {corners.map(c => (
        <mesh
          key={c.key}
          position={[c.x, 0.05, c.z]}
          rotation={[-Math.PI / 2, 0, 0]}
          onPointerDown={handlePointerDown(c.key)}
          onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
          onPointerOut={() => { document.body.style.cursor = 'default'; }}
        >
          <planeGeometry args={[handleSize, handleSize]} />
          <meshBasicMaterial color="#facc15" transparent opacity={0.8} />
        </mesh>
      ))}
    </group>
  );
}

function ShadowOverlay({ sunAltitude, sunAzimuth }: { sunAltitude: number; sunAzimuth: number }) {
  const { buildings } = useScene();

  const shadowCells = useMemo(() => {
    if (sunAltitude <= 0) return [];
    const cells: Array<{ x: number; z: number; weight: number }> = [];
    const half = GRID_SIZE / 2;
    const altRad = degToRad(sunAltitude);
    const aziRad = degToRad(sunAzimuth);
    const dirX = -Math.sin(aziRad);
    const dirZ = -Math.cos(aziRad);
    const tanAlt = Math.tan(altRad);

    const cellShadow: Map<string, number> = new Map();

    for (const b of buildings) {
      const bHalfW = b.width / 2;
      const bHalfD = b.depth / 2;
      const bx0 = b.position.x - bHalfW;
      const bx1 = b.position.x + bHalfW;
      const bz0 = b.position.z - bHalfD;
      const bz1 = b.position.z + bHalfD;

      const shadowLen = b.height / tanAlt;
      const projX0 = bx0 + Math.min(0, dirX * shadowLen);
      const projX1 = bx1 + Math.max(0, dirX * shadowLen);
      const projZ0 = bz0 + Math.min(0, dirZ * shadowLen);
      const projZ1 = bz1 + Math.max(0, dirZ * shadowLen);

      const cx0 = Math.ceil((projX0 + half) / GRID_SPACING);
      const cx1 = Math.floor((projX1 + half) / GRID_SPACING);
      const cz0 = Math.ceil((projZ0 + half) / GRID_SPACING);
      const cz1 = Math.floor((projZ1 + half) / GRID_SPACING);

      for (let cx = cx0; cx <= cx1; cx++) {
        for (let cz = cz0; cz <= cz1; cz++) {
          const cellX = -half + cx * GRID_SPACING - GRID_SPACING / 2;
          const cellZ = -half + cz * GRID_SPACING - GRID_SPACING / 2;
          const inBuilding = cellX >= bx0 && cellX <= bx1 && cellZ >= bz0 && cellZ <= bz1;
          if (inBuilding) continue;

          const testPoints = [
            [cellX - 0.5, cellZ - 0.5],
            [cellX + 0.5, cellZ - 0.5],
            [cellX - 0.5, cellZ + 0.5],
            [cellX + 0.5, cellZ + 0.5],
            [cellX, cellZ],
          ];

          let covered = 0;
          for (const [px, pz] of testPoints) {
            let inShadow = false;
            for (const bb of buildings) {
              const bbHalfW = bb.width / 2;
              const bbHalfD = bb.depth / 2;
              const bbx0 = bb.position.x - bbHalfW;
              const bbx1 = bb.position.x + bbHalfW;
              const bbz0 = bb.position.z - bbHalfD;
              const bbz1 = bb.position.z + bbHalfD;

              if (px >= bbx0 && px <= bbx1 && pz >= bbz0 && pz <= bbz1) {
                covered++;
                inShadow = true;
                break;
              }

              const tMax = shadowLen + 20;
              let t = 0.1;
              let step = 0.3;
              while (t < tMax) {
                const sx = px - dirX * t;
                const sz = pz - dirZ * t;
                const requiredHeight = t * tanAlt;
                if (sx >= bbx0 && sx <= bbx1 && sz >= bbz0 && sz <= bbz1) {
                  if (requiredHeight <= bb.height) {
                    covered++;
                    inShadow = true;
                    break;
                  }
                }
                t += step;
              }
              if (inShadow) break;
            }
          }

          const coverage = covered / testPoints.length;
          if (coverage >= 0.5) {
            const key = `${cx}_${cz}`;
            cellShadow.set(key, Math.max(cellShadow.get(key) || 0, coverage));
          }
        }
      }
    }

    cellShadow.forEach((weight, key) => {
      const [cx, cz] = key.split('_').map(Number);
      const cellX = -half + cx * GRID_SPACING - GRID_SPACING / 2;
      const cellZ = -half + cz * GRID_SPACING - GRID_SPACING / 2;
      cells.push({ x: cellX, z: cellZ, weight });
    });

    return cells;
  }, [buildings, sunAltitude, sunAzimuth]);

  return (
    <group>
      {shadowCells.map((c, i) => (
        <mesh
          key={`${c.x}_${c.z}_${i}`}
          position={[c.x, 0.015, c.z]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[GRID_SPACING - 0.05, GRID_SPACING - 0.05]} />
          <meshBasicMaterial color="#ef4444" transparent opacity={0.3} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function CameraController({ isCutaway, cutawayBuildingId, buildings }: {
  isCutaway: boolean;
  cutawayBuildingId: string | null;
  buildings: Building[];
}) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const lastCutaway = useRef(false);

  useFrame(() => {
    if (isCutaway && cutawayBuildingId && !lastCutaway.current) {
      const b = buildings.find(x => x.id === cutawayBuildingId);
      if (b && controlsRef.current) {
        const targetPos = new THREE.Vector3(b.position.x, b.height / 2, b.position.z);
        camera.position.set(b.position.x - 0.5, b.height / 2, b.position.z + b.depth / 2 + 1);
        controlsRef.current.target.copy(targetPos);
        controlsRef.current.update();
      }
    }
    lastCutaway.current = isCutaway;
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={isCutaway ? 0.5 : 5}
      maxDistance={isCutaway ? 15 : 100}
      maxPolarAngle={isCutaway ? Math.PI * 0.85 : Math.PI / 2 - 0.05}
      mouseButtons={{
        LEFT: isCutaway ? undefined : THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN,
      }}
      touches={{
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.DOLLY_PAN,
      }}
    />
  );
}

function SceneContent() {
  const {
    buildings,
    addBuilding,
    selectedBuildingId,
    setSelectedBuildingId,
    sunAltitude,
    sunAzimuth,
    isAddingMode,
    setIsAddingMode,
    setModalBuildingId,
    isCutawayView,
    cutawayBuildingId,
    setIsCutawayView,
    setCutawayBuildingId,
  } = useScene();

  const buildingCounter = useRef(1);
  const sunLight = useMemo(() => calculateSunLight(sunAltitude, sunAzimuth), [sunAltitude, sunAzimuth]);
  const dirLightRef = useRef<THREE.DirectionalLight>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; buildingId: string } | null>(null);

  const handlePlaceClick = useCallback(
    (pos: THREE.Vector3) => {
      const colorPalette = ['#e2e8f0', '#e5e7eb', '#f1f5f9', '#f5d0b0', '#fde68a', '#fed7aa'];
      const randomColor = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      const randomHeight = 3 + Math.random() * 3;
      const newBuilding: Building = {
        id: uuidv4(),
        name: `建筑${buildingCounter.current}`,
        position: { x: pos.x, z: pos.z },
        width: 2,
        depth: 2,
        height: Math.round(randomHeight * 10) / 10,
        color: randomColor,
        createdAt: Date.now(),
      };
      addBuilding(newBuilding);
      buildingCounter.current += 1;
      setIsAddingMode(false);
    },
    [addBuilding, setIsAddingMode]
  );

  const handleBuildingClick = (buildingId: string) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (!isAddingMode) {
      setSelectedBuildingId(buildingId);
    }
  };

  const handleBuildingDoubleClick = (buildingId: string) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    setIsCutawayView(true);
    setCutawayBuildingId(buildingId);
  };

  const handleBuildingContext = (buildingId: string) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    setSelectedBuildingId(buildingId);
    setContextMenu({ x: e.clientX || e.nativeEvent.clientX, y: e.clientY || e.nativeEvent.clientY, buildingId });
  };

  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    if (contextMenu) {
      window.addEventListener('click', handleClickOutside);
    }
    return () => window.removeEventListener('click', handleClickOutside);
  }, [contextMenu]);

  useEffect(() => {
    if (dirLightRef.current) {
      dirLightRef.current.shadow.camera.updateProjectionMatrix();
    }
  }, [sunAltitude, sunAzimuth]);

  return (
    <>
      <color attach="background" args={['#0f172a']} />
      <fog attach="fog" args={['#0f172a', 60, 150]} />
      <ambientLight intensity={0.35} color="#94a3b8" />
      <hemisphereLight args={['#64748b', '#1e293b', 0.4]} />

      <directionalLight
        ref={dirLightRef}
        position={sunLight.position}
        intensity={sunLight.intensity}
        color={sunLight.color}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={200}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
        shadow-camera-near={0.5}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
      />

      <CameraController
        isCutaway={isCutawayView}
        cutawayBuildingId={cutawayBuildingId}
        buildings={buildings}
      />

      <GridFloor onPlaceClick={handlePlaceClick} isAddingMode={isAddingMode} />

      {buildings.map(building => (
        <BuildingMesh
          key={building.id}
          building={building}
          isSelected={selectedBuildingId === building.id}
          isCutaway={cutawayBuildingId === building.id && isCutawayView}
          isOtherInCutaway={isCutawayView && cutawayBuildingId !== building.id}
          onClick={handleBuildingClick(building.id)}
          onDoubleClick={handleBuildingDoubleClick(building.id)}
          onContextMenu={handleBuildingContext(building.id)}
        />
      ))}

      <ShadowOverlay sunAltitude={sunAltitude} sunAzimuth={sunAzimuth} />

      {contextMenu && (
        <Html
          position={[0, 0, 0]}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            pointerEvents: 'none',
            zIndex: 10000,
          }}
        >
          <div
            onClick={(e) => {
              e.stopPropagation();
              setModalBuildingId(contextMenu.buildingId);
              setContextMenu(null);
            }}
            style={{
              position: 'absolute',
              top: contextMenu.y,
              left: contextMenu.x,
              background: 'rgba(30,41,59,0.98)',
              borderRadius: 8,
              padding: 4,
              minWidth: 140,
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              border: '1px solid #334155',
              pointerEvents: 'auto',
            }}
          >
            <div style={menuItemStyle}>📝 编辑属性</div>
          </div>
        </Html>
      )}

      {isCutawayView && (
        <Html position={[0, 0, 0]} style={{ pointerEvents: 'none' }}>
          <div style={{
            position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(14,165,233,0.9)', color: '#fff', padding: '8px 20px',
            borderRadius: 24, fontSize: 14, fontWeight: 500, pointerEvents: 'none',
            backdropFilter: 'blur(8px)',
          }}>
            剖切视图模式 - 按 ESC 退出
          </div>
        </Html>
      )}

      {isAddingMode && (
        <Html position={[0, 0, 0]} style={{ pointerEvents: 'none' }}>
          <div style={{
            position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(14,165,233,0.9)', color: '#fff', padding: '8px 20px',
            borderRadius: 24, fontSize: 14, fontWeight: 500, pointerEvents: 'none',
            backdropFilter: 'blur(8px)',
          }}>
            点击网格平面放置建筑 - 按 ESC 取消
          </div>
        </Html>
      )}
    </>
  );
}

const menuItemStyle: React.CSSProperties = {
  padding: '8px 16px',
  color: '#e2e8f0',
  fontSize: 13,
  cursor: 'pointer',
  borderRadius: 6,
  transition: 'background 0.2s',
};

const SceneManager: React.FC = () => {
  return (
    <Canvas
      shadows
      camera={{ position: [30, 35, 35], fov: 50, near: