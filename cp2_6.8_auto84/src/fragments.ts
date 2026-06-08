import * as THREE from 'three';

export interface Fragment {
  id: number;
  correctPosition: THREE.Vector3;
  correctRotation: THREE.Euler;
  startPosition: THREE.Vector3;
  startRotation: THREE.Euler;
  mesh: THREE.Mesh;
  isLocked: boolean;
  originalColor: number;
}

export const SNAP_DISTANCE_THRESHOLD = 0.8;
export const SNAP_ANGLE_THRESHOLD = 15 * Math.PI / 180;

export function createPotteryBodyShape(): THREE.BufferGeometry {
  const points: THREE.Vector2[] = [];
  const segments = 32;
  const heightProfile = [
    [0.0, 0.5],
    [0.4, 0.7],
    [0.7, 1.2],
    [0.85, 1.8],
    [0.78, 2.4],
    [0.6, 2.9],
    [0.45, 3.2],
    [0.55, 3.45],
    [0.6, 3.7],
    [0.55, 3.9],
  ];
  for (let i = 0; i < heightProfile.length; i++) {
    points.push(new THREE.Vector2(heightProfile[i][0], heightProfile[i][1] - 2.2));
  }
  const geometry = new THREE.LatheGeometry(points, 64);
  geometry.computeVertexNormals();
  return geometry;
}

function splitIntoFragments(bodyGeometry: THREE.BufferGeometry, count: number): { geometry: THREE.BufferGeometry; position: THREE.Vector3; rotation: THREE.Euler }[] {
  const fragments: { geometry: THREE.BufferGeometry; position: THREE.Vector3; rotation: THREE.Euler }[] = [];
  const positions = bodyGeometry.attributes.position;
  const normals = bodyGeometry.attributes.normal;
  const uvs = bodyGeometry.attributes.uv;

  const verticalSegments = 9;
  const radialSegments = 64;
  const rings = verticalSegments + 1;
  const totalVertices = positions.count;

  const ringHeight = 4.4 / verticalSegments;
  const ringRanges = [
    { start: 0, end: 2, scale: 1.0 },
    { start: 1, end: 4, scale: 1.0 },
    { start: 3, end: 6, scale: 1.0 },
    { start: 5, end: 8, scale: 1.0 },
  ];

  const angularSlices = [
    { start: 0, end: 16 },
    { start: 12, end: 32 },
    { start: 28, end: 48 },
    { start: 44, end: 64 },
    { start: 0, end: 32 },
    { start: 32, end: 64 },
    { start: 16, end: 48 },
    { start: 0, end: 64 },
  ];

  const effectiveCount = Math.min(count, 8);

  for (let i = 0; i < effectiveCount; i++) {
    const vertRange = ringRanges[i % ringRanges.length];
    const angRange = angularSlices[i];

    const ringStart = vertRange.start;
    const ringEnd = vertRange.end;
    const radialStart = angRange.start;
    const radialEnd = angRange.end;

    const newPositions: number[] = [];
    const newNormals: number[] = [];
    const newUvs: number[] = [];
    const indices: number[] = [];

    const vertexMap = new Map<string, number>();
    let vertexCount = 0;

    for (let r = ringStart; r <= ringEnd; r++) {
      for (let a = radialStart; a <= radialEnd; a++) {
        const srcIdx = r * (radialSegments + 1) + a;
        if (srcIdx >= totalVertices) continue;

        const x = positions.getX(srcIdx);
        const y = positions.getY(srcIdx);
        const z = positions.getZ(srcIdx);
        const nx = normals.getX(srcIdx);
        const ny = normals.getY(srcIdx);
        const nz = normals.getZ(srcIdx);
        const u = uvs.getX(srcIdx);
        const v = uvs.getY(srcIdx);

        const key = `${r}_${a}`;
        if (!vertexMap.has(key)) {
          vertexMap.set(key, vertexCount);
          newPositions.push(x, y, z);
          newNormals.push(nx, ny, nz);
          newUvs.push(u, v);
          vertexCount++;
        }
      }
    }

    const ringCountLocal = ringEnd - ringStart + 1;
    const angCountLocal = radialEnd - radialStart + 1;

    for (let r = 0; r < ringCountLocal - 1; r++) {
      for (let a = 0; a < angCountLocal - 1; a++) {
        const key0 = `${ringStart + r}_${radialStart + a}`;
        const key1 = `${ringStart + r}_${radialStart + a + 1}`;
        const key2 = `${ringStart + r + 1}_${radialStart + a}`;
        const key3 = `${ringStart + r + 1}_${radialStart + a + 1}`;

        const i0 = vertexMap.get(key0);
        const i1 = vertexMap.get(key1);
        const i2 = vertexMap.get(key2);
        const i3 = vertexMap.get(key3);

        if (i0 !== undefined && i1 !== undefined && i2 !== undefined && i3 !== undefined) {
          indices.push(i0, i2, i1);
          indices.push(i1, i2, i3);
        }
      }
    }

    const fragmentGeo = new THREE.BufferGeometry();
    fragmentGeo.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
    fragmentGeo.setAttribute('normal', new THREE.Float32BufferAttribute(newNormals, 3));
    fragmentGeo.setAttribute('uv', new THREE.Float32BufferAttribute(newUvs, 2));
    fragmentGeo.setIndex(indices);
    fragmentGeo.computeVertexNormals();
    fragmentGeo.computeBoundingBox();
    fragmentGeo.computeBoundingSphere();

    const center = new THREE.Vector3();
    fragmentGeo.boundingBox?.getCenter(center);

    const midY = (ringStart + ringEnd) / 2;
    const avgY = (midY / verticalSegments) * 4.4 - 2.2;
    const avgAngle = (radialStart + radialEnd) / 2 / radialSegments * Math.PI * 2;
    const radius = 0.5 + 0.2 * Math.sin(avgY * 0.8);
    const fragCenter = new THREE.Vector3(
      Math.cos(avgAngle) * radius * 0.4,
      avgY,
      Math.sin(avgAngle) * radius * 0.4
    );

    fragments.push({
      geometry: fragmentGeo,
      position: fragCenter,
      rotation: new THREE.Euler(0, 0, 0),
    });
  }

  return fragments;
}

export function createFragments(count: number = 7): Fragment[] {
  const bodyGeometry = createPotteryBodyShape();
  const splits = splitIntoFragments(bodyGeometry, count);

  const fragments: Fragment[] = [];
  const clayColor = 0xB87333;

  splits.forEach((split, i) => {
    const material = new THREE.MeshStandardMaterial({
      color: clayColor,
      roughness: 0.85,
      metalness: 0.05,
      side: THREE.DoubleSide,
      vertexColors: false,
    });

    const mesh = new THREE.Mesh(split.geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const correctPosition = split.position.clone();
    const correctRotation = split.rotation.clone();

    const angle = (i / splits.length) * Math.PI * 2;
    const radius = 4.5 + Math.random() * 1.5;
    const startPosition = new THREE.Vector3(
      Math.cos(angle) * radius + (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2,
      Math.sin(angle) * radius + (Math.random() - 0.5) * 2
    );
    const startRotation = new THREE.Euler(
      (Math.random() - 0.5) * Math.PI * 1.2,
      Math.random() * Math.PI * 2,
      (Math.random() - 0.5) * Math.PI * 0.8
    );

    mesh.position.copy(startPosition);
    mesh.rotation.copy(startRotation);
    mesh.updateMatrix();

    fragments.push({
      id: i,
      correctPosition,
      correctRotation,
      startPosition,
      startRotation,
      mesh,
      isLocked: false,
      originalColor: clayColor,
    });
  });

  return fragments;
}

export function moveFragment(fragment: Fragment, position: THREE.Vector3): void {
  if (fragment.isLocked) return;
  fragment.mesh.position.copy(position);
}

export function rotateFragment(fragment: Fragment, rotation: THREE.Euler): void {
  if (fragment.isLocked) return;
  fragment.mesh.rotation.copy(rotation);
}

export function checkSnap(fragment: Fragment): boolean {
  if (fragment.isLocked) return false;

  const posDist = fragment.mesh.position.distanceTo(fragment.correctPosition);

  const qCurrent = new THREE.Quaternion().setFromEuler(fragment.mesh.rotation);
  const qCorrect = new THREE.Quaternion().setFromEuler(fragment.correctRotation);
  const angleDist = 2 * Math.acos(Math.min(1, Math.abs(qCurrent.dot(qCorrect))));

  return posDist < SNAP_DISTANCE_THRESHOLD && angleDist < SNAP_ANGLE_THRESHOLD;
}

export function snapFragment(fragment: Fragment): void {
  fragment.isLocked = true;
  fragment.mesh.position.copy(fragment.correctPosition);
  fragment.mesh.rotation.copy(fragment.correctRotation);
  fragment.mesh.updateMatrix();
}

export function resetFragments(fragments: Fragment[]): void {
  fragments.forEach(f => {
    f.isLocked = false;
    f.mesh.position.copy(f.startPosition);
    f.mesh.rotation.copy(f.startRotation);
    f.mesh.updateMatrix();
  });
}

export function getLockedCount(fragments: Fragment[]): number {
  return fragments.filter(f => f.isLocked).length;
}

export function createReferencePot(): THREE.Mesh {
  const geometry = createPotteryBodyShape();
  const material = new THREE.MeshStandardMaterial({
    color: 0xcccccc,
    transparent: true,
    opacity: 0.25,
    roughness: 0.9,
    metalness: 0.0,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
}
