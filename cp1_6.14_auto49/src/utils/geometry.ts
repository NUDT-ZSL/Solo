import * as THREE from 'three';

export function perpendicularTo(dir: THREE.Vector3): THREE.Vector3 {
  const a = dir.clone().normalize();
  const absX = Math.abs(a.x);
  const absY = Math.abs(a.y);
  const absZ = Math.abs(a.z);

  let upAxis: THREE.Vector3;
  if (absX <= absY && absX <= absZ) {
    upAxis = new THREE.Vector3(1, 0, 0);
  } else if (absY <= absX && absY <= absZ) {
    upAxis = new THREE.Vector3(0, 1, 0);
  } else {
    upAxis = new THREE.Vector3(0, 0, 1);
  }
  return new THREE.Vector3().crossVectors(a, upAxis).normalize();
}

export function buildHexRingPositions(
  center: THREE.Vector3,
  normal: THREE.Vector3,
  radius: number
): THREE.Vector3[] {
  const positions: THREE.Vector3[] = [];
  const n = normal.clone().normalize();
  const u = perpendicularTo(n).normalize();
  const v = new THREE.Vector3().crossVectors(n, u).normalize();

  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    const x = center.x + radius * (u.x * Math.cos(angle) + v.x * Math.sin(angle));
    const y = center.y + radius * (u.y * Math.cos(angle) + v.y * Math.sin(angle));
    const z = center.z + radius * (u.z * Math.cos(angle) + v.z * Math.sin(angle));
    positions.push(new THREE.Vector3(x, y, z));
  }

  return positions;
}

export function bondLength(p1: THREE.Vector3, p2: THREE.Vector3): number {
  return p1.distanceTo(p2);
}

export function normalizeAngle(v: number): number {
  while (v < 0) v += Math.PI * 2;
  while (v >= Math.PI * 2) v -= Math.PI * 2;
  return v;
}
