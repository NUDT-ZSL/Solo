import React, { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import { useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Stars, Html } from '@react-three/drei';
import * as THREE from 'three';
import { PhotoData } from './App';

interface MemorySphereProps {
  photos: PhotoData[];
  onPhotoClick: (photo: PhotoData) => void;
  selectedPhotoId: string | null;
}

const SPHERE_RADIUS = 5;
const PHOTO_RADIUS = 0.45;
const AUTO_ROTATE_SPEED = (Math.PI * 2) / 60;
const SWEEP_HALF_ANGLE = (Math.PI / 180) * 15;

interface Point2D { x: number; y: number; idx: number; }
interface Triangle { i: number; j: number; k: number; }

function delaunay2D(points: Point2D[]): [number, number][] {
  if (points.length < 2) return [];
  if (points.length === 2) return [[points[0].idx, points[1].idx]];
  if (points.length === 3) return [
    [points[0].idx, points[1].idx],
    [points[1].idx, points[2].idx],
    [points[2].idx, points[0].idx],
  ];
  const minX = Math.min(...points.map(p => p.x)) - 100;
  const maxX = Math.max(...points.map(p => p.x)) + 100;
  const minY = Math.min(...points.map(p => p.y)) - 100;
  const maxY = Math.max(...points.map(p => p.y)) + 100;
  const dx = maxX - minX, dy = maxY - minY;
  const deltaMax = Math.max(dx, dy);
  const midX = (minX + maxX) / 2, midY = (minY + maxY) / 2;
  const p1: Point2D = { x: midX - 20 * deltaMax, y: midY - deltaMax, idx: -1 };
  const p2: Point2D = { x: midX, y: midY + 20 * deltaMax, idx: -2 };
  const p3: Point2D = { x: midX + 20 * deltaMax, y: midY - deltaMax, idx: -3 };
  let triangles: Triangle[] = [{ i: points.length, j: points.length + 1, k: points.length + 2 }];
  const allPts = [...points, p1, p2, p3];

  const circumcircle = (ps: Point2D[], i: number, j: number, k: number) => {
    const x1 = ps[i].x, y1 = ps[i].y;
    const x2 = ps[j].x, y2 = ps[j].y;
    const x3 = ps[k].x, y3 = ps[k].y;
    const D = 2 * (x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2));
    if (Math.abs(D) < 1e-10) return { x: 0, y: 0, r: Infinity };
    const ux = ((x1 * x1 + y1 * y1) * (y2 - y3) + (x2 * x2 + y2 * y2) * (y3 - y1) + (x3 * x3 + y3 * y3) * (y1 - y2)) / D;
    const uy = ((x1 * x1 + y1 * y1) * (x3 - x2) + (x2 * x2 + y2 * y2) * (x1 - x3) + (x3 * x3 + y3 * y3) * (x2 - x1)) / D;
    const dx = x1 - ux, dy = y1 - uy;
    return { x: ux, y: uy, r: dx * dx + dy * dy };
  };

  for (let i = 0; i < points.length; i++) {
    const edges: [number, number][] = [];
    triangles = triangles.filter(t => {
      const c = circumcircle(allPts, t.i, t.j, t.k);
      const dx = points[i].x - c.x, dy = points[i].y - c.y;
      if (dx * dx + dy * dy <= c.r) {
        edges.push([t.i, t.j], [t.j, t.k], [t.k, t.i]);
        return false;
      }
      return true;
    });
    for (let e = 0; e < edges.length; e++) {
      let duplicate = false;
      for (let f = 0; f < edges.length; f++) {
        if (e !== f && ((edges[e][0] === edges[f][1] && edges[e][1] === edges[f][0]) ||
          (edges[e][0] === edges[f][0] && edges[e][1] === edges[f][1]))) {
          duplicate = true; break;
        }
      }
      if (!duplicate) triangles.push({ i: edges[e][0], j: edges[e][1], k: i });
    }
  }
  triangles = triangles.filter(t => t.i < points.length && t.j < points.length && t.k < points.length);
  const edgeSet = new Set<string>();
  const result: [number, number][] = [];
  for (const t of triangles) {
    const pairs: [number, number][] = [[t.i, t.j], [t.j, t.k], [t.k, t.i]];
    for (const [a, b] of pairs) {
      const key = a < b ? `${a}-${b}` : `${b}-${a}`;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        result.push([a, b]);
      }
    }
  }
  return result;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16) / 255,
    parseInt(h.substring(2, 4), 16) / 255,
    parseInt(h.substring(4, 6), 16) / 255,
  ];
}

const PhotoMesh: React.FC<{
  photo: PhotoData;
  onClick: (e: ThreeEvent<MouseEvent>) => void;
  isSelected: boolean;
  glowMultiplier: number;
  sweepIntensity: number;
}> = ({ photo, onClick, isSelected, glowMultiplier, sweepIntensity }) => {
  const spriteRef = useRef<THREE.Sprite>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const glowTexture = useMemo(() => {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const grd = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.3, 'rgba(255,255,255,0.8)');
    grd.addColorStop(0.7, 'rgba(255,255,255,0.2)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, []);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load(photo.imageData, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
      setTexture(tex);
    }, undefined, () => {
      const img = new Image();
      img.onload = () => {
        const tex = new THREE.Texture(img);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.needsUpdate = true;
        setTexture(tex);
      };
      img.src = photo.imageData;
    });
  }, [photo.imageData]);

  useFrame((_, delta) => {
    if (spriteRef.current) {
      const s = isSelected ? 1.15 : 1;
      spriteRef.current.scale.lerp(new THREE.Vector3(PHOTO_RADIUS * 2 * s, PHOTO_RADIUS * 2 * s, 1), 0.1);
    }
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      const baseOpacity = 0.3;
      const targetOpacity = Math.min(0.95, baseOpacity * glowMultiplier + sweepIntensity * 0.5);
      mat.opacity += (targetOpacity - mat.opacity) * 0.1;
      const s = (isSelected ? 1.4 : 1.2) * (1 + sweepIntensity * 0.15);
      glowRef.current.scale.lerp(new THREE.Vector3(s, s, s), 0.1);
    }
  });

  const rgb = hexToRgb(photo.dominantColor);
  const direction = new THREE.Vector3(photo.position.x, photo.position.y, photo.position.z).normalize();
  const pos = direction.clone().multiplyScalar(SPHERE_RADIUS);
  const glowColor = new THREE.Color(rgb[0], rgb[1], rgb[2]);

  return (
    <group position={pos} onClick={onClick}>
      <mesh ref={glowRef}>
        <planeGeometry args={[PHOTO_RADIUS * 2.4, PHOTO_RADIUS * 2.4]} />
        <meshBasicMaterial
          map={glowTexture}
          color={glowColor}
          transparent
          opacity={0.3}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      {texture && (
        <sprite ref={spriteRef} scale={[PHOTO_RADIUS * 2, PHOTO_RADIUS * 2, 1]}>
          <spriteMaterial
            map={texture}
            transparent
            depthWrite={false}
          />
        </sprite>
      )}
      {isSelected && (
        <mesh>
          <ringGeometry args={[PHOTO_RADIUS * 1.1, PHOTO_RADIUS * 1.25, 48]} />
          <meshBasicMaterial
            color={glowColor}
            transparent
            opacity={0.9}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}
    </group>
  );
};

const ConstellationLines: React.FC<{
  photos: PhotoData[];
  edges: [number, number][];
  selectedPhotoId: string | null;
  breathPhase: number;
  highlightEdges: Set<string>;
}> = ({ photos, edges, selectedPhotoId, breathPhase, highlightEdges }) => {
  const groupRef = useRef<THREE.Group>(null);

  const { positions, colors, opacities } = useMemo(() => {
    const posArr: number[] = [];
    const colArr: number[] = [];
    const opaArr: number[] = [];
    edges.forEach(([a, b]) => {
      const pa = photos[a], pb = photos[b];
      if (!pa || !pb) return;
      const dirA = new THREE.Vector3(pa.position.x, pa.position.y, pa.position.z).normalize();
      const dirB = new THREE.Vector3(pb.position.x, pb.position.y, pb.position.z).normalize();
      const mid = dirA.clone().add(dirB).normalize().multiplyScalar(SPHERE_RADIUS * 1.02);
      const pA = dirA.clone().multiplyScalar(SPHERE_RADIUS * 1.01);
      const pB = dirB.clone().multiplyScalar(SPHERE_RADIUS * 1.01);
      posArr.push(pA.x, pA.y, pA.z, mid.x, mid.y, mid.z, pB.x, pB.y, pB.z);
      const rgbA = hexToRgb(pa.dominantColor);
      const rgbB = hexToRgb(pb.dominantColor);
      for (let c = 0; c < 3; c++) {
        colArr.push(rgbA[0], rgbA[1], rgbA[2]);
        colArr.push((rgbA[0] + rgbB[0]) / 2, (rgbA[1] + rgbB[1]) / 2, (rgbA[2] + rgbB[2]) / 2);
        colArr.push(rgbB[0], rgbB[1], rgbB[2]);
      }
      const dist = Math.sqrt(
        Math.pow(pa.position.x - pb.position.x, 2) +
        Math.pow(pa.position.y - pb.position.y, 2) +
        Math.pow(pa.position.z - pb.position.z, 2)
      );
      const maxDist = SPHERE_RADIUS * 2;
      const baseOpacity = 0.2 + 0.4 * (1 - Math.min(1, dist / maxDist));
      for (let o = 0; o < 3; o++) opaArr.push(baseOpacity);
    });
    return {
      positions: new Float32Array(posArr),
      colors: new Float32Array(colArr),
      opacities: new Float32Array(opaArr),
    };
  }, [photos, edges]);

  useFrame(() => {
    if (!groupRef.current) return;
    const breath = (Math.sin(breathPhase) + 1) / 2;
    groupRef.current.children.forEach((child, idx) => {
      const line = child as THREE.Line;
      const mat = line.material as THREE.LineBasicMaterial;
      const edgeIdx = Math.floor(idx / 1);
      const edge = edges[edgeIdx];
      if (edge) {
        const [a, b] = edge;
        const key = a < b ? `${photos[a]?.id}-${photos[b]?.id}` : `${photos[b]?.id}-${photos[a]?.id}`;
        const isHighlight = highlightEdges.has(key) ||
          (selectedPhotoId && (photos[a]?.id === selectedPhotoId || photos[b]?.id === selectedPhotoId));
        const baseOp = opacities[edgeIdx * 3] ?? 0.3;
        const breathOp = baseOp + breath * 0.3;
        mat.opacity = isHighlight ? 1.0 : breathOp;
        if (isHighlight) {
          (mat.color as THREE.Color).multiplyScalar(1.2).clampScalar(0, 1);
        }
      }
    });
  });

  if (photos.length < 2) return null;

  return (
    <group ref={groupRef}>
      {Array.from({ length: Math.floor(positions.length / 9) }).map((_, i) => {
        const segPos = positions.slice(i * 9, i * 9 + 9);
        const segCol = colors.slice(i * 9, i * 9 + 9);
        if (segPos.length < 9) return null;
        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.BufferAttribute(segPos, 3));
        geom.setAttribute('color', new THREE.BufferAttribute(segCol, 3));
        return (
          <line key={i} geometry={geom}>
            <lineBasicMaterial
              vertexColors
              transparent
              opacity={0.3}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </line>
        );
      })}
    </group>
  );
};

const SweepLight: React.FC<{
  angle: number;
  onSweepHit: (indices: Set<number>) => void;
  photos: PhotoData[];
}> = ({ angle, onSweepHit, photos }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y = angle;
    const hitIndices = new Set<number>();
    const sweepDir = new THREE.Vector3(
      Math.cos(angle) * SPHERE_RADIUS * 2,
      0,
      -Math.sin(angle) * SPHERE_RADIUS * 2
    );
    photos.forEach((p, idx) => {
      const pVec = new THREE.Vector3(p.position.x, p.position.y, p.position.z);
      const projectOnSweep = pVec.clone().projectOnVector(new THREE.Vector3(Math.cos(angle), 0, -Math.sin(angle)));
      const perpDist = pVec.clone().sub(projectOnSweep).length();
      const forwardDist = projectOnSweep.dot(new THREE.Vector3(Math.cos(angle), 0, -Math.sin(angle)));
      const tanAngle = Math.atan2(perpDist, Math.max(0, forwardDist));
      if (tanAngle < SWEEP_HALF_ANGLE && forwardDist > 0 && forwardDist < SPHERE_RADIUS * 2.5) {
        hitIndices.add(idx);
      }
    });
    onSweepHit(hitIndices);
  });

  const { geometry } = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    const segments = 64;
    const innerR = SPHERE_RADIUS * 0.95;
    const outerR = SPHERE_RADIUS * 2;
    const positions: number[] = [];
    const colors: number[] = [];
    for (let i = 0; i <= segments; i++) {
      const t = (i / segments) * 2 - 1;
      const a = t * SWEEP_HALF_ANGLE;
      const cosA = Math.cos(a), sinA = Math.sin(a);
      positions.push(cosA * innerR, 0, -sinA * innerR);
      positions.push(cosA * outerR, 0, -sinA * outerR);
      const fade = 1 - Math.abs(t);
      colors.push(0.7, 0.8, 1, fade * 0.6);
      colors.push(0.7, 0.8, 1, 0);
    }
    const indices: number[] = [];
    for (let i = 0; i < segments; i++) {
      const base = i * 2;
      indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    }
    geom.setIndex(indices);
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return { geometry: geom };
  }, []);

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshBasicMaterial
        color={0xb0c4ff}
        transparent
        opacity={0.25}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
};

const StarfieldParticles: React.FC = () => {
  const { positions } = useMemo(() => {
    const count = 500;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      const r = SPHERE_RADIUS * (1.002 + Math.random() * 0.03);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
    }
    return { positions: pos };
  }, []);

  useFrame((state) => {
    const pts = state.scene.getObjectByName('starfieldPoints');
    if (pts) {
      const mat = (pts as THREE.Points).material as THREE.PointsMaterial;
      mat.opacity = 0.4 + 0.2 * Math.sin(state.clock.elapsedTime * 2);
    }
  });

  return (
    <points name="starfieldPoints">
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={500}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.03}
        color={0xffffff}
        transparent
        opacity={0.5}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

const MemorySphere: React.FC<MemorySphereProps> = ({ photos, onPhotoClick, selectedPhotoId }) => {
  const groupRef = useRef<THREE.Group>(null);
  const controlsRef = useRef<any>(null);
  const sweepAngleRef = useRef(0);
  const breathPhaseRef = useRef(0);
  const [sweepHits, setSweepHits] = useState<Set<number>>(new Set());
  const [highlightEdges, setHighlightEdges] = useState<Set<string>>(new Set());
  const [pauseUntil, setPauseUntil] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [glowMultipliers, setGlowMultipliers] = useState<Record<string, number>>({});
  const lastSelectRef = useRef<number>(0);

  const edges = useMemo(() => {
    if (photos.length < 2) return [] as [number, number][];
    const pts2D: Point2D[] = photos.map((p, idx) => ({
      x: p.lng,
      y: p.lat,
      idx,
    }));
    return delaunay2D(pts2D);
  }, [photos]);

  useEffect(() => {
    if (selectedPhotoId) {
      lastSelectRef.current = Date.now();
      setPauseUntil(Date.now() + 5000);
      setGlowMultipliers(prev => ({ ...prev, [selectedPhotoId]: 2.0 }));
      setTimeout(() => {
        setGlowMultipliers(prev => {
          const n = { ...prev };
          n[selectedPhotoId] = 1;
          return n;
        });
      }, 2000);
      const edgeSet = new Set<string>();
      edges.forEach(([a, b]) => {
        if (photos[a]?.id === selectedPhotoId || photos[b]?.id === selectedPhotoId) {
          const key = a < b ? `${photos[a]?.id}-${photos[b]?.id}` : `${photos[b]?.id}-${photos[a]?.id}`;
          edgeSet.add(key);
        }
      });
      setHighlightEdges(edgeSet);
    } else {
      setHighlightEdges(new Set());
    }
  }, [selectedPhotoId, edges, photos]);

  const onSweepHit = useCallback((indices: Set<number>) => {
    setSweepHits(indices);
  }, []);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    breathPhaseRef.current += delta * (Math.PI * 2 / 3);

    const now = Date.now();
    const isPaused = now < pauseUntil || dragging;
    const isUserInteracting = controlsRef.current?.isDragging || controlsRef.current?.autoRotateSpeed === 0;

    if (!isPaused && !isUserInteracting) {
      groupRef.current.rotation.y += AUTO_ROTATE_SPEED * delta;
      sweepAngleRef.current += AUTO_ROTATE_SPEED * delta;
    } else if (!dragging) {
      sweepAngleRef.current += AUTO_ROTATE_SPEED * 0.3 * delta;
    }
  });

  const handlePhotoClick = (photo: PhotoData) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onPhotoClick(photo);
  };

  const getSweepIntensity = (idx: number) => {
    if (sweepHits.has(idx)) return 1;
    return 0;
  };

  return (
    <>
      <group ref={groupRef}>
        <mesh>
          <sphereGeometry args={[SPHERE_RADIUS * 0.99, 64, 64]} />
          <meshStandardMaterial
            color={0x0a1029}
            transparent
            opacity={0.85}
            roughness={0.9}
            metalness={0.1}
          />
        </mesh>

        <mesh>
          <sphereGeometry args={[SPHERE_RADIUS * 1.001, 64, 64]} />
          <meshBasicMaterial
            color={0x1a2045}
            transparent
            opacity={0.15}
            wireframe
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        <StarfieldParticles />

        <ConstellationLines
          photos={photos}
          edges={edges}
          selectedPhotoId={selectedPhotoId}
          breathPhase={breathPhaseRef.current}
          highlightEdges={highlightEdges}
        />

        {photos.map((photo, idx) => (
          <PhotoMesh
            key={photo.id}
            photo={photo}
            onClick={handlePhotoClick(photo)}
            isSelected={selectedPhotoId === photo.id}
            glowMultiplier={glowMultipliers[photo.id] ?? 1}
            sweepIntensity={getSweepIntensity(idx)}
          />
        ))}

        <SweepLight
          angle={sweepAngleRef.current}
          onSweepHit={onSweepHit}
          photos={photos}
        />

        <mesh>
          <sphereGeometry args={[SPHERE_RADIUS * 1.15, 64, 64]} />
          <meshBasicMaterial
            color={0x4466aa}
            transparent
            opacity={0.03}
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      </group>

      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        minDistance={3}
        maxDistance={15}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.8}
        zoomSpeed={0.8}
        onStart={() => setDragging(true)}
        onEnd={() => setTimeout(() => setDragging(false), 300)}
      />
    </>
  );
};

export default MemorySphere;
