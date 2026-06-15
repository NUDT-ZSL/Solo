import React, { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useStore, type Cell } from './store';

const CELL_SIZE = 0.5;
const CELL_SPACING = 0.6;

function getCellColor(age: number, isFlashing: boolean): string {
  if (isFlashing) return '#ffffff';
  if (age >= 10) return '#ff3355';
  if (age >= 3) return '#ff8800';
  return '#00ff88';
}

function getCellOpacity(cell: Cell, animationPhase: number, gridCenter: THREE.Vector3, x: number, y: number, z: number, gridSize: number): number {
  if (cell.flashTime > 0) return 1;
  if (cell.isDying) return 0;
  if (cell.isNew) return 0.7;

  if (animationPhase < 1) {
    const cellPos = new THREE.Vector3(
      (x - gridSize / 2) * CELL_SPACING,
      (y - gridSize / 2) * CELL_SPACING,
      (z - gridSize / 2) * CELL_SPACING
    );
    const dist = cellPos.distanceTo(gridCenter);
    const maxDist = gridCenter.length();
    const threshold = maxDist * animationPhase;
    if (dist > threshold) return 0;
  }

  return 0.7;
}

interface CellMeshProps {
  gridSize: number;
  performanceMode: boolean;
}

function CellMesh({ gridSize, performanceMode }: CellMeshProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const pointsRef = useRef<THREE.Points>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const { camera } = useThree();

  const grid = useStore((state) => state.grid);
  const animationPhase = useStore((state) => state.animationPhase);
  const toggleCell = useStore((state) => state.toggleCell);
  const toggleCells = useStore((state) => state.toggleCells);

  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{ x: number; y: number } | null>(null);
  const [shiftPressed, setShiftPressed] = useState(false);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const mouse = useMemo(() => new THREE.Vector2(), []);

  const gridCenter = useMemo(() => {
    const half = (gridSize / 2) * CELL_SPACING;
    return new THREE.Vector3(half, half, half);
  }, [gridSize]);

  const activeCells = useMemo(() => {
    const cells: { x: number; y: number; z: number; cell: Cell }[] = [];
    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        for (let z = 0; z < gridSize; z++) {
          const cell = grid[x][y][z];
          if (cell.alive || cell.isDying) {
            cells.push({ x, y, z, cell });
          }
        }
      }
    }
    return cells;
  }, [grid, gridSize]);

  const { positions, colors, opacities } = useMemo(() => {
    const positions = new Float32Array(activeCells.length * 3);
    const colors = new Float32Array(activeCells.length * 3);
    const opacities = new Float32Array(activeCells.length);

    activeCells.forEach(({ x, y, z, cell }, i) => {
      const opacity = getCellOpacity(cell, animationPhase, gridCenter, x, y, z, gridSize);
      const isFlashing = cell.flashTime > 0;
      const colorStr = getCellColor(cell.age, isFlashing);
      const color = new THREE.Color(colorStr);

      positions[i * 3] = (x - gridSize / 2) * CELL_SPACING;
      positions[i * 3 + 1] = (y - gridSize / 2) * CELL_SPACING;
      positions[i * 3 + 2] = (z - gridSize / 2) * CELL_SPACING;

      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      opacities[i] = opacity;
    });

    return { positions, colors, opacities };
  }, [activeCells, animationPhase, gridCenter, gridSize]);

  useFrame(() => {
    if (performanceMode && pointsRef.current) {
      const geometry = pointsRef.current.geometry;
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.color.needsUpdate = true;
    } else if (meshRef.current) {
      activeCells.forEach(({ x, y, z, cell }, i) => {
        const opacity = getCellOpacity(cell, animationPhase, gridCenter, x, y, z, gridSize);
        if (opacity <= 0) {
          dummy.position.set(9999, 9999, 9999);
        } else {
          dummy.position.set(
            (x - gridSize / 2) * CELL_SPACING,
            (y - gridSize / 2) * CELL_SPACING,
            (z - gridSize / 2) * CELL_SPACING
          );
        }
        dummy.updateMatrix();
        meshRef.current!.setMatrixAt(i, dummy.matrix);

        const isFlashing = cell.flashTime > 0;
        const colorStr = getCellColor(cell.age, isFlashing);
        const color = new THREE.Color(colorStr);
        meshRef.current!.setColorAt(i, color);
      });
      meshRef.current.instanceMatrix.needsUpdate = true;
      if (meshRef.current.instanceColor) {
        meshRef.current.instanceColor.needsUpdate = true;
      }
    }
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setShiftPressed(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setShiftPressed(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const getCellFromIntersection = useCallback(
    (intersect: THREE.Intersection): [number, number, number] | null => {
      const point = intersect.point;
      const x = Math.round(point.x / CELL_SPACING + gridSize / 2);
      const y = Math.round(point.y / CELL_SPACING + gridSize / 2);
      const z = Math.round(point.z / CELL_SPACING + gridSize / 2);

      if (x >= 0 && x < gridSize && y >= 0 && y < gridSize && z >= 0 && z < gridSize) {
        return [x, y, z];
      }
      return null;
    },
    [gridSize]
  );

  const handlePointerDown = useCallback(
    (e: any) => {
      if (shiftPressed) {
        e.stopPropagation();
        setIsSelecting(true);
        setSelectionStart({ x: e.clientX, y: e.clientY });
        setSelectionEnd({ x: e.clientX, y: e.clientY });
      }
    },
    [shiftPressed]
  );

  const handlePointerMove = useCallback(
    (e: any) => {
      if (isSelecting && selectionStart) {
        setSelectionEnd({ x: e.clientX, y: e.clientY });
      }
    },
    [isSelecting, selectionStart]
  );

  const handlePointerUp = useCallback(
    (e: any) => {
      if (isSelecting && selectionStart && selectionEnd) {
        e.stopPropagation();
        setIsSelecting(false);

        const rect = e.target.getBoundingClientRect();
        const minX = Math.min(selectionStart.x, selectionEnd.x) - rect.left;
        const maxX = Math.max(selectionStart.x, selectionEnd.x) - rect.left;
        const minY = Math.min(selectionStart.y, selectionEnd.y) - rect.top;
        const maxY = Math.max(selectionStart.y, selectionEnd.y) - rect.top;

        const cellsToToggle: [number, number, number][] = [];
        const step = Math.max(1, Math.floor((maxX - minX) / 20));

        for (let sx = minX; sx <= maxX; sx += step) {
          for (let sy = minY; sy <= maxY; sy += step) {
            mouse.x = (sx / rect.width) * 2 - 1;
            mouse.y = -(sy / rect.height) * 2 + 1;

            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObject(meshRef.current || pointsRef.current!, true);

            if (intersects.length > 0) {
              const cellCoords = getCellFromIntersection(intersects[0]);
              if (cellCoords) {
                const key = cellCoords.join(',');
                if (!cellsToToggle.some((c) => c.join(',') === key)) {
                  cellsToToggle.push(cellCoords);
                }
              }
            }
          }
        }

        if (cellsToToggle.length > 0) {
          toggleCells(cellsToToggle);
        }

        setSelectionStart(null);
        setSelectionEnd(null);
      }
    },
    [isSelecting, selectionStart, selectionEnd, camera, raycaster, mouse, getCellFromIntersection, toggleCells]
  );

  const handleClick = useCallback(
    (e: any) => {
      if (shiftPressed || isSelecting) return;
      e.stopPropagation();

      const rect = e.target.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObject(meshRef.current || pointsRef.current!, true);

      if (intersects.length > 0) {
        const cellCoords = getCellFromIntersection(intersects[0]);
        if (cellCoords) {
          toggleCell(cellCoords[0], cellCoords[1], cellCoords[2]);
        }
      }
    },
    [shiftPressed, isSelecting, camera, raycaster, mouse, getCellFromIntersection, toggleCell]
  );

  const selectionBox = useMemo(() => {
    if (!selectionStart || !selectionEnd) return null;
    const left = Math.min(selectionStart.x, selectionEnd.x);
    const top = Math.min(selectionStart.y, selectionEnd.y);
    const width = Math.abs(selectionEnd.x - selectionStart.x);
    const height = Math.abs(selectionEnd.y - selectionStart.y);

    return (
      <div
        style={{
          position: 'fixed',
          left,
          top,
          width,
          height,
          background: 'rgba(0, 150, 255, 0.3)',
          border: '1px solid rgba(0, 200, 255, 0.8)',
          pointerEvents: 'none',
          zIndex: 1000,
        }}
      />
    );
  }, [selectionStart, selectionEnd]);

  return (
    <>
      {selectionBox}
      {performanceMode ? (
        <points
          ref={pointsRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onClick={handleClick}
        >
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
            <bufferAttribute attach="attributes-color" count={colors.length / 3} array={colors} itemSize={3} />
          </bufferGeometry>
          <pointsMaterial size={0.3} vertexColors transparent opacity={0.8} sizeAttenuation />
        </points>
      ) : (
        <instancedMesh
          ref={meshRef}
          args={[undefined, undefined, Math.max(activeCells.length, 1)]}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onClick={handleClick}
        >
          <boxGeometry args={[CELL_SIZE, CELL_SIZE, CELL_SIZE]} />
          <meshPhysicalMaterial
            vertexColors
            transparent
            opacity={0.7}
            roughness={0.3}
            metalness={0.1}
            clearcoat={0.5}
            clearcoatRoughness={0.2}
            emissiveIntensity={0.3}
          />
        </instancedMesh>
      )}
    </>
  );
}

function GridHelper() {
  const gridRef = useRef<THREE.GridHelper>(null);

  return (
    <gridHelper
      ref={gridRef}
      args={[50, 50, 0x4488ff, 0x2244aa]}
      position={[0, -5, 0]}
    />
  );
}

function SceneContent({ gridSize, performanceMode }: { gridSize: number; performanceMode: boolean }) {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 15, 10]} intensity={1} castShadow />
      <directionalLight position={[-10, 5, -10]} intensity={0.3} />
      <pointLight position={[0, 10, 0]} intensity={0.5} color="#00ff88" />
      <GridHelper />
      <CellMesh gridSize={gridSize} performanceMode={performanceMode} />
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={50}
        enablePan={true}
      />
    </>
  );
}

export default function GridRenderer() {
  const gridSize = useStore((state) => state.gridSize);
  const performanceMode = useStore((state) => state.performanceMode);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: 'linear-gradient(180deg, #0a0a2a 0%, #000011 100%)',
        position: 'relative',
      }}
    >
      <Canvas
        camera={{ position: [8, 6, 8], fov: 60, near: 0.1, far: 1000 }}
        gl={{ antialias: true, alpha: true }}
        style={{ width: '100%', height: '100%' }}
      >
        <SceneContent gridSize={gridSize} performanceMode={performanceMode} />
      </Canvas>
    </div>
  );
}
