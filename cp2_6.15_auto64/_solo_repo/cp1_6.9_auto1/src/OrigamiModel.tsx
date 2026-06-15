import { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { easeInOutCubic, lerpColor, getComplementaryColor } from './TextureGenerator';

export type OrigamiTopology = 'cube' | 'pyramid' | 'star' | 'hexagon' | 'octahedron' | 'diamond';

export interface FaceData {
  vertices: THREE.Vector3[];
  normal: THREE.Vector3;
  creaseEdges: { edgeIndex: number; hingeAxis: THREE.Vector3; hingePoint: THREE.Vector3 }[];
  foldMultiplier: number;
}

export interface OrigamiModelProps {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  topology: OrigamiTopology;
  creaseTexture: THREE.Texture;
  hueShift: number;
  fractalLevel: number;
  modelId: string;
  scale?: number;
  selected: boolean;
  onSelect: (id: string) => void;
  onShatter: (id: string, position: THREE.Vector3) => void;
  onUpdateFoldProgress?: (progress: number) => void;
  onUpdateRotation?: (rotation: THREE.Euler) => void;
}

const generateTopology = (
  topology: OrigamiTopology
): { vertices: THREE.Vector3[]; faces: number[][]; creaseEdges: number[][] } => {
  const s = 1;

  switch (topology) {
    case 'cube': {
      const vertices = [
        new THREE.Vector3(-s, -s, -s),
        new THREE.Vector3(s, -s, -s),
        new THREE.Vector3(s, s, -s),
        new THREE.Vector3(-s, s, -s),
        new THREE.Vector3(-s, -s, s),
        new THREE.Vector3(s, -s, s),
        new THREE.Vector3(s, s, s),
        new THREE.Vector3(-s, s, s),
      ];
      const faces = [
        [0, 1, 2, 3],
        [4, 5, 6, 7],
        [0, 4, 7, 3],
        [1, 5, 6, 2],
        [3, 2, 6, 7],
        [0, 1, 5, 4],
      ];
      const creaseEdges = [
        [0, 1], [1, 2], [2, 3], [3, 0],
        [4, 5], [5, 6], [6, 7], [7, 4],
        [0, 4], [1, 5], [2, 6], [3, 7],
      ];
      return { vertices, faces, creaseEdges };
    }
    case 'pyramid': {
      const h = s * 1.5;
      const vertices = [
        new THREE.Vector3(0, h, 0),
        new THREE.Vector3(-s, -s * 0.5, -s),
        new THREE.Vector3(s, -s * 0.5, -s),
        new THREE.Vector3(s, -s * 0.5, s),
        new THREE.Vector3(-s, -s * 0.5, s),
      ];
      const faces = [
        [0, 1, 2],
        [0, 2, 3],
        [0, 3, 4],
        [0, 4, 1],
        [1, 2, 3, 4],
      ];
      const creaseEdges = [
        [0, 1], [0, 2], [0, 3], [0, 4],
        [1, 2], [2, 3], [3, 4], [4, 1],
      ];
      return { vertices, faces, creaseEdges };
    }
    case 'star': {
      const outer = s * 1.3;
      const inner = s * 0.5;
      const h = s * 0.3;
      const vertices: THREE.Vector3[] = [];
      for (let i = 0; i < 10; i++) {
        const angle = (i * Math.PI) / 5;
        const r = i % 2 === 0 ? outer : inner;
        vertices.push(new THREE.Vector3(Math.cos(angle) * r, h, Math.sin(angle) * r));
      }
      vertices.push(new THREE.Vector3(0, -h, 0));
      const faces: number[][] = [];
      for (let i = 0; i < 10; i++) {
        faces.push([i, (i + 1) % 10, 10]);
      }
      faces.push([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
      const creaseEdges: number[][] = [];
      for (let i = 0; i < 10; i++) {
        creaseEdges.push([i, (i + 1) % 10]);
        creaseEdges.push([i, 10]);
      }
      return { vertices, faces, creaseEdges };
    }
    case 'hexagon': {
      const vertices: THREE.Vector3[] = [];
      const h = s * 0.8;
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        vertices.push(new THREE.Vector3(Math.cos(angle) * s, h, Math.sin(angle) * s));
      }
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        vertices.push(new THREE.Vector3(Math.cos(angle) * s, -h, Math.sin(angle) * s));
      }
      const faces = [
        [0, 1, 2, 3, 4, 5],
        [6, 7, 8, 9, 10, 11],
      ];
      for (let i = 0; i < 6; i++) {
        faces.push([i, (i + 1) % 6, (i + 1) % 6 + 6, i + 6]);
      }
      const creaseEdges: number[][] = [];
      for (let i = 0; i < 6; i++) {
        creaseEdges.push([i, (i + 1) % 6]);
        creaseEdges.push([i + 6, (i + 1) % 6 + 6]);
        creaseEdges.push([i, i + 6]);
      }
      return { vertices, faces, creaseEdges };
    }
    case 'octahedron': {
      const h = s * 1.2;
      const vertices = [
        new THREE.Vector3(0, h, 0),
        new THREE.Vector3(0, -h, 0),
        new THREE.Vector3(s, 0, 0),
        new THREE.Vector3(-s, 0, 0),
        new THREE.Vector3(0, 0, s),
        new THREE.Vector3(0, 0, -s),
      ];
      const faces = [
        [0, 2, 4],
        [0, 4, 3],
        [0, 3, 5],
        [0, 5, 2],
        [1, 4, 2],
        [1, 3, 4],
        [1, 5, 3],
        [1, 2, 5],
      ];
      const creaseEdges: number[][] = [];
      for (let i = 2; i < 6; i++) {
        creaseEdges.push([0, i]);
        creaseEdges.push([1, i]);
      }
      for (let i = 2; i < 6; i++) {
        creaseEdges.push([i, i === 5 ? 2 : i + 1]);
      }
      return { vertices, faces, creaseEdges };
    }
    case 'diamond':
    default: {
      const h1 = s * 0.6;
      const h2 = s * 1.2;
      const vertices = [
        new THREE.Vector3(0, h2, 0),
        new THREE.Vector3(0, -h2, 0),
        new THREE.Vector3(s, 0, 0),
        new THREE.Vector3(0, 0, s),
        new THREE.Vector3(-s, 0, 0),
        new THREE.Vector3(0, 0, -s),
        new THREE.Vector3(s * 0.7, h1, s * 0.7),
        new THREE.Vector3(-s * 0.7, h1, s * 0.7),
        new THREE.Vector3(-s * 0.7, h1, -s * 0.7),
        new THREE.Vector3(s * 0.7, h1, -s * 0.7),
        new THREE.Vector3(s * 0.7, -h1, s * 0.7),
        new THREE.Vector3(-s * 0.7, -h1, s * 0.7),
        new THREE.Vector3(-s * 0.7, -h1, -s * 0.7),
        new THREE.Vector3(s * 0.7, -h1, -s * 0.7),
      ];
      const faces = [
        [0, 6, 7], [0, 7, 8], [0, 8, 9], [0, 9, 6],
        [1, 10, 11], [1, 11, 12], [1, 12, 13], [1, 13, 10],
        [6, 10, 11, 7], [7, 11, 12, 8], [8, 12, 13, 9], [9, 13, 10, 6],
      ];
      const creaseEdges: number[][] = [];
      for (let i = 6; i < 10; i++) {
        creaseEdges.push([0, i]);
        creaseEdges.push([1, i + 4]);
      }
      for (let i = 0; i < 4; i++) {
        creaseEdges.push([6 + i, 10 + i]);
        creaseEdges.push([6 + i, 6 + ((i + 1) % 4)]);
        creaseEdges.push([10 + i, 10 + ((i + 1) % 4)]);
      }
      return { vertices, faces, creaseEdges };
    }
  }
};

const OrigamiModel = ({
  position,
  rotation,
  topology,
  creaseTexture,
  hueShift,
  fractalLevel,
  modelId,
  scale = 1,
  selected,
  onSelect,
  onShatter,
  onUpdateFoldProgress,
  onUpdateRotation,
}: OrigamiModelProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const meshRefs = useRef<THREE.Mesh[]>([]);
  const haloRef = useRef<THREE.Mesh>(null);
  const edgeGlowRef = useRef<THREE.LineSegments>(null);

  const [isFolded, setIsFolded] = useState(false);
  const [foldProgress, setFoldProgress] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [clickFlash, setClickFlash] = useState(0);
  const [shatterProgress, setShatterProgress] = useState(1);
  const [isShattering, setIsShattering] = useState(false);

  const lastClickTime = useRef(0);

  const { baseVertices, faces, creaseEdges, faceData } = useMemo(() => {
    const { vertices, faces, creaseEdges } = generateTopology(topology);

    const faceData: FaceData[] = faces.map((faceIndices, fi) => {
      const faceVertices = faceIndices.map((i) => vertices[i].clone());

      const v1 = new THREE.Vector3().subVectors(faceVertices[1], faceVertices[0]);
      const v2 = new THREE.Vector3().subVectors(faceVertices[2], faceVertices[0]);
      const normal = new THREE.Vector3().crossVectors(v1, v2).normalize();

      const creaseEdgesForFace: FaceData['creaseEdges'] = [];
      for (let i = 0; i < faceIndices.length; i++) {
        const a = faceIndices[i];
        const b = faceIndices[(i + 1) % faceIndices.length];
        for (const edge of creaseEdges) {
          if ((edge[0] === a && edge[1] === b) || (edge[0] === b && edge[1] === a)) {
            const hingeAxis = new THREE.Vector3()
              .subVectors(vertices[b], vertices[a])
              .normalize();
            const hingePoint = new THREE.Vector3()
              .addVectors(vertices[a], vertices[b])
              .multiplyScalar(0.5);
            creaseEdgesForFace.push({
              edgeIndex: creaseEdges.indexOf(edge),
              hingeAxis,
              hingePoint,
            });
            break;
          }
        }
      }

      return {
        vertices: faceVertices,
        normal,
        creaseEdges: creaseEdgesForFace,
        foldMultiplier: fi % 2 === 0 ? 1 : -1,
      };
    });

    return { baseVertices: vertices, faces, creaseEdges, faceData };
  }, [topology]);

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      const now = Date.now();
      const timeDiff = now - lastClickTime.current;

      if (timeDiff < 350) {
        if (fractalLevel < 3) {
          setIsShattering(true);
          setTimeout(() => {
            onShatter(modelId, groupRef.current!.position.clone());
          }, 2800);
        }
        lastClickTime.current = 0;
      } else {
        if (!animating) {
          setAnimating(true);
          setIsFolded((prev) => !prev);
        }
        onSelect(modelId);
        setClickFlash(1);
        lastClickTime.current = now;
      }
    },
    [animating, fractalLevel, modelId, onSelect, onShatter]
  );

  const handlePointerOver = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(true);
    document.body.style.cursor = 'pointer';
  }, []);

  const handlePointerOut = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(false);
    document.body.style.cursor = 'auto';
  }, []);

  useFrame((_, delta) => {
    const targetProgress = isFolded ? 1 : 0;
    if (animating || foldProgress !== targetProgress) {
      const speed = delta / 2;
      let newProgress = foldProgress;
      if (foldProgress < targetProgress) {
        newProgress = Math.min(foldProgress + speed, targetProgress);
      } else if (foldProgress > targetProgress) {
        newProgress = Math.max(foldProgress - speed, targetProgress);
      }
      setFoldProgress(newProgress);
      if (newProgress === targetProgress && animating) {
        setAnimating(false);
      }
    }

    if (clickFlash > 0) {
      setClickFlash((prev) => Math.max(0, prev - delta / 0.3));
    }

    if (isShattering && shatterProgress > 0) {
      setShatterProgress((prev) => Math.max(0, prev - delta / 3));
    }

    if (onUpdateFoldProgress) {
      onUpdateFoldProgress(Math.round(foldProgress * 100));
    }
    if (groupRef.current && onUpdateRotation) {
      onUpdateRotation(groupRef.current.rotation);
    }
  });

  const easedProgress = easeInOutCubic(foldProgress);
  const currentColor = lerpColor('#87CEEB', '#8A2BE2', easedProgress);

  const hsl = { h: 0, s: 0, l: 0 };
  currentColor.getHSL(hsl);
  hsl.h = (hsl.h + hueShift / 360) % 1;
  const adjustedColor = new THREE.Color().setHSL(hsl.h, hsl.s, hsl.l);
  const complementaryColor = getComplementaryColor(adjustedColor);

  const angle = THREE.MathUtils.degToRad(180 - 120 * easedProgress);

  const geometries = useMemo(() => {
    return faceData.map((face) => {
      const geometry = new THREE.BufferGeometry();
      const positions: number[] = [];
      const uvs: number[] = [];
      const normals: number[] = [];
      const indices: number[] = [];

      for (let i = 0; i < face.vertices.length; i++) {
        const v = face.vertices[i];
        positions.push(v.x, v.y, v.z);
        uvs.push(i / face.vertices.length, 0);
      }

      const n = face.normal;
      for (let i = 0; i < face.vertices.length; i++) {
        normals.push(n.x, n.y, n.z);
      }

      for (let i = 1; i < face.vertices.length - 1; i++) {
        indices.push(0, i, i + 1);
      }

      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geometry.setIndex(indices);

      return geometry;
    });
  }, [faceData]);

  useEffect(() => {
    meshRefs.current.forEach((mesh, index) => {
      if (!mesh) return;
      const face = faceData[index];
      const geometry = mesh.geometry;
      const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute;

      for (let i = 0; i < posAttr.count; i++) {
        const origV = face.vertices[i].clone();
        let finalV = origV.clone();

        if (face.creaseEdges.length > 0) {
          const primaryCrease = face.creaseEdges[0];
          const hingePoint = primaryCrease.hingePoint;
          const hingeAxis = primaryCrease.hingeAxis;

          const toPoint = new THREE.Vector3().subVectors(finalV, hingePoint);
          const foldAngle = (1 - Math.cos(angle)) * face.foldMultiplier * 0.6;
          const quaternion = new THREE.Quaternion().setFromAxisAngle(hingeAxis, foldAngle);
          toPoint.applyQuaternion(quaternion);
          finalV = hingePoint.clone().add(toPoint);
        }

        const shatterScale = 1 + (1 - shatterProgress) * 0.3;
        const shatterOffset = new THREE.Vector3(
          face.normal.x * (1 - shatterProgress) * 2,
          face.normal.y * (1 - shatterProgress) * 2,
          face.normal.z * (1 - shatterProgress) * 2
        );
        finalV.multiplyScalar(shatterScale).add(shatterOffset);
        finalV.multiplyScalar(shatterProgress);

        posAttr.setXYZ(i, finalV.x, finalV.y, finalV.z);
      }
      posAttr.needsUpdate = true;
      geometry.computeVertexNormals();
    });
  }, [easedProgress, angle, shatterProgress, faceData]);

  const edgeGeometry = useMemo(() => {
    const edges: number[] = [];
    faceData.forEach((face) => {
      for (let i = 0; i < face.vertices.length; i++) {
        const v1 = face.vertices[i];
        const v2 = face.vertices[(i + 1) % face.vertices.length];
        edges.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z);
      }
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(edges, 3));
    return geometry;
  }, [faceData]);

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={rotation}
      scale={scale * shatterProgress}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {geometries.map((geom, i) => (
        <mesh
          key={`face-${i}`}
          ref={(el) => {
            if (el) meshRefs.current[i] = el;
          }}
          geometry={geom}
        >
          <meshPhongMaterial
            color={adjustedColor}
            side={THREE.DoubleSide}
            shininess={60}
            specular={new THREE.Color(0x444444)}
            map={creaseTexture}
            transparent
            opacity={0.95}
            polygonOffset
            polygonOffsetFactor={1}
          />
        </mesh>
      ))}

      <lineSegments ref={edgeGlowRef} geometry={edgeGeometry}>
        <lineBasicMaterial
          color={0xffffff}
          transparent
          opacity={
            hovered ? Math.max(0.5, clickFlash) : clickFlash > 0 ? clickFlash : 0
          }
          linewidth={3}
        />
      </lineSegments>

      {animating && haloRef.current && (
        <mesh ref={haloRef}>
          <ringGeometry args={[1.8 * scale, 2.25 * scale, 64]} />
          <meshBasicMaterial
            color={complementaryColor}
            transparent
            opacity={0.3 * Math.sin(foldProgress * Math.PI)}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
};

export default OrigamiModel;
