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
  const glowRingRef = useRef<THREE.Mesh>(null);
  const particlesRef = useRef<THREE.Points>(null);
  const [animated, setAnimated] = useState(false);
  const startTime = useRef(building.createdAt);
  const [hovered, setHovered] = useState(false);

  const particleData = useMemo(() => {
    const count = 24;
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const angles = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radius = 0.3 + Math.random() * 0.5;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = 0.05;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
      velocities[i * 3] = Math.cos(angle) * (0.5 + Math.random() * 0.5);
      velocities[i * 3 + 1] = 0.5 + Math.random() * 1.5;
      velocities[i * 3 + 2] = Math.sin(angle) * (0.5 + Math.random() * 0.5);
      angles[i] = angle;
    }
    return { count, positions, velocities, angles };
  }, []);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const elapsed = Date.now() - startTime.current;
    const duration = 500;
    const t = Math.min(1, elapsed / duration);

    if (t < 1) {
      const eased = 1 - Math.pow(1 - t, 3);
      meshRef.current.scale.y = eased;
      meshRef.current.position.y = (building.height / 2) * eased;
      if (meshRef.current.material instanceof THREE.MeshStandardMaterial) {
        meshRef.current.material.emissiveIntensity = Math.pow(1 - t, 0.5) * 1.2;
        meshRef.current.material.emissive = new THREE.Color('#fbbf24');
      }

      if (glowRingRef.current) {
        const glowScale = 0.5 + t * 6;
        glowRingRef.current.scale.set(glowScale, 1, glowScale);
        const glowMat = glowRingRef.current.material as THREE.MeshBasicMaterial;
        glowMat.opacity = (1 - t) * 0.7;
      }

      if (particlesRef.current) {
        const geom = particlesRef.current.geometry as THREE.BufferGeometry;
        const posAttr = geom.attributes.position as THREE.BufferAttribute;
        const arr = posAttr.array as Float32Array;
        for (let i = 0; i < particleData.count; i++) {
          arr[i * 3] = particleData.positions[i * 3] + particleData.velocities[i * 3] * t * 4;
          arr[i * 3 + 1] = particleData.positions[i * 3 + 1] + particleData.velocities[i * 3 + 1] * t * building.height * 0.6;
          arr[i * 3 + 2] = particleData.positions[i * 3 + 2] + particleData.velocities[i * 3 + 2] * t * 4;
        }
        posAttr.needsUpdate = true;
        const pMat = particlesRef.current.material as THREE.PointsMaterial;
        pMat.opacity = (1 - t) * 0.9;
        pMat.size = 0.15 + t * 0.1;
      }
    } else if (!animated) {
      meshRef.current.scale.y = 1;
      meshRef.current.position.y = building.height / 2;
      if (meshRef.current.material instanceof THREE.MeshStandardMaterial) {
        meshRef.current.material.emissiveIntensity = 0;
        meshRef.current.material.emissive = new THREE.Color('#000000');
      }
      setAnimated(true);
    }

    if (animated && meshRef.current && !isCutaway && !isOtherInCutaway) {
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      mat.emissive = new THREE.Color(hovered ? '#0ea5e9' : '#000000');
      mat.emissiveIntensity = hovered ? 0.15 : 0;
    }
  });

  const displayOpacity = isOtherInCutaway ? 0.25 : isCutaway ? 0.15 : 1;
  const transparent = isOtherInCutaway || isCutaway;

  const isNew = Date.now() - building.createdAt < 600;

  return (
    <group position={[building.position.x, 0, building.position.z]}>
      {isNew && (
        <>
          <mesh ref={glowRingRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
            <ringGeometry args={[0.8, 1.2, 32]} />
            <meshBasicMaterial color="#fbbf24" transparent opacity={0.6} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
          <points ref={particlesRef}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={particleData.count}
                array={new Float32Array(particleData.positions)}
                itemSize={3}
              />
            </bufferGeometry>
            <pointsMaterial color="#fde047" size={0.15} transparent opacity={0.9} sizeAttenuation depthWrite={false} />
          </points>
        </>
      )}

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
          emissive="#000000"
          emissiveIntensity={0}
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
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'ns-resize'; }}
        onPointerOut={() => { document.body.style.cursor = 'default'; }}
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
          onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'nwse-resize'; }}
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
  const [shadowCells, setShadowCells] = useState<Array<{ x: number; z: number; weight: number }>>([]);
  const lastCalcTime = useRef(0);
  const MIN_INTERVAL = 100;

  useFrame(() => {
    const now = performance.now();
    if (now - lastCalcTime.current < MIN_INTERVAL) return;
    lastCalcTime.current = now;

    if (sunAltitude <= 0.1) {
      if (shadowCells.length > 0) setShadowCells([]);
      return;
    }

    const half = GRID_SIZE / 2;
    const altRad = degToRad(sunAltitude);
    const aziRad = degToRad(sunAzimuth);
    const dirX = -Math.sin(aziRad);
    const dirZ = -Math.cos(aziRad);
    const tanAlt = Math.tan(altRad);

    const cellShadow: Map<string, number> = new Map();
    const buildingData = buildings.map(b => ({
      bx0: b.position.x - b.width / 2,
      bx1: b.position.x + b.width / 2,
      bz0: b.position.z - b.depth / 2,
      bz1: b.position.z + b.depth / 2,
      height: b.height,
      shadowLen: b.height / tanAlt,
    }));

    for (let bi = 0; bi < buildingData.length; bi++) {
      const b = buildingData[bi];
      const projX0 = b.bx0 + Math.min(0, dirX * b.shadowLen);
      const projX1 = b.bx1 + Math.max(0, dirX * b.shadowLen);
      const projZ0 = b.bz0 + Math.min(0, dirZ * b.shadowLen);
      const projZ1 = b.bz1 + Math.max(0, dirZ * b.shadowLen);

      const cx0 = Math.max(1, Math.ceil((projX0 + half) / GRID_SPACING));
      const cx1 = Math.min(GRID_DIVISIONS - 1, Math.floor((projX1 + half) / GRID_SPACING));
      const cz0 = Math.max(1, Math.ceil((projZ0 + half) / GRID_SPACING));
      const cz1 = Math.min(GRID_DIVISIONS - 1, Math.floor((projZ1 + half) / GRID_SPACING));

      for (let cx = cx0; cx <= cx1; cx++) {
        for (let cz = cz0; cz <= cz1; cz++) {
          const cellX = -half + cx * GRID_SPACING;
          const cellZ = -half + cz * GRID_SPACING;

          const inAnyBuilding = buildingData.some(bb =>
            cellX >= bb.bx0 && cellX <= bb.bx1 && cellZ >= bb.bz0 && cellZ <= bb.bz1
          );
          if (inAnyBuilding) continue;

          const samples = 9;
          let covered = 0;
          for (let si = 0; si < samples; si++) {
            const sx = cellX + ((si % 3) - 1) * (GRID_SPACING / 3);
            const sz = cellZ + (Math.floor(si / 3) - 1) * (GRID_SPACING / 3);

            for (let bi2 = 0; bi2 < buildingData.length; bi2++) {
              const bb = buildingData[bi2];
              if (sx >= bb.bx0 && sx <= bb.bx1 && sz >= bb.bz0 && sz <= bb.bz1) {
                covered++;
                break;
              }
              const tMax = bb.shadowLen + 2;
              const dx = bb.bx1 - bb.bx0;
              const dz = bb.bz1 - bb.bz0;
              const tHitX1 = dirX !== 0 ? (bb.bx0 - sx) / dirX : Infinity;
              const tHitX2 = dirX !== 0 ? (bb.bx1 - sx) / dirX : Infinity;
              const tHitZ1 = dirZ !== 0 ? (bb.bz0 - sz) / dirZ : Infinity;
              const tHitZ2 = dirZ !== 0 ? (bb.bz1 - sz) / dirZ : Infinity;
              const tMin = Math.max(
                Math.min(tHitX1, tHitX2),
                Math.min(tHitZ1, tHitZ2)
              );
              const tMaxHit = Math.min(
                Math.max(tHitX1, tHitX2),
                Math.max(tHitZ1, tHitZ2)
              );
              if (tMaxHit > 0 && tMin < tMax && tMin > 0) {
                const requiredH = tMin * tanAlt;
                if (requiredH <= bb.height) {
                  covered++;
                  break;
                }
              }
            }
          }

          const coverage = covered / samples;
          if (coverage >= 0.5) {
            const key = `${cx}_${cz}`;
            cellShadow.set(key, Math.max(cellShadow.get(key) || 0, coverage));
          }
        }
      }
    }

    const newCells: Array<{ x: number; z: number; weight: number }> = [];
    cellShadow.forEach((weight, key) => {
      const [cxS, czS] = key.split('_');
      const cx = parseInt(cxS, 10);
      const cz = parseInt(czS, 10);
      const cellX = -half + cx * GRID_SPACING;
      const cellZ = -half + cz * GRID_SPACING;
      newCells.push({ x: cellX, z: cellZ, weight });
    });

    if (
      newCells.length !== shadowCells.length ||
      newCells.some((c, i) => !shadowCells[i] || shadowCells[i].x !== c.x || shadowCells[i].z !== c.z)
    ) {
      setShadowCells(newCells);
    }
  });

  return (
    <group>
      {shadowCells.map((c, i) => (
        <mesh
          key={`${c.x}_${c.z}`}
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
  const animProgress = useRef(0);
  const startPos = useRef(new THREE.Vector3());
  const startTarget = useRef(new THREE.Vector3());
  const endPos = useRef(new THREE.Vector3());
  const endTarget = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    if (isCutaway && cutawayBuildingId && !lastCutaway.current) {
      const b = buildings.find(x => x.id === cutawayBuildingId);
      if (b && controlsRef.current) {
        startPos.current.copy(camera.position);
        startTarget.current.copy(controlsRef.current.target);
        endTarget.current.set(b.position.x, b.height / 2, b.position.z);
        endPos.current.set(b.position.x - 1, b.height / 2, b.position.z + b.depth / 2 + 1.5);
        animProgress.current = 0;
      }
    }

    if (!isCutaway && lastCutaway.current) {
      animProgress.current = 0;
      startPos.current.copy(camera.position);
      startTarget.current.copy(controlsRef.current.target);
      endPos.current.set(30, 35, 35);
      endTarget.current.set(0, 0, 0);
    }

    if (animProgress.current < 1 && controlsRef.current) {
      animProgress.current = Math.min(1, animProgress.current + delta * 3);
      const t = 1 - Math.pow(1 - animProgress.current, 3);
      camera.position.lerpVectors(startPos.current, endPos.current, t);
      controlsRef.current.target.lerpVectors(startTarget.current, endTarget.current, t);
      controlsRef.current.update();
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
    const clientX = (e as any).clientX || e.nativeEvent?.clientX || 0;
    const clientY = (e as any).clientY || e.nativeEvent?.clientY || 0;
    setContextMenu({ x: clientX, y: clientY, buildingId });
  };

  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    if (contextMenu) {
      setTimeout(() => window.addEventListener('click', handleClickOutside), 0);
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
            <div style={menuItemStyle}>编辑属性</div>
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
      camera={{ position: [30, 35, 35], fov: 50, near: 0.1, far: 500 }}
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 2]}
      style={{ width: '100%', height: '100%' }}
    >
      <SceneContent />
    </Canvas>
  );
};

export default SceneManager;
