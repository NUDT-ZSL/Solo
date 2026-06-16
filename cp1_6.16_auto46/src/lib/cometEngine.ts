export interface OrbitParams {
  semiMajorAxis: number;
  eccentricity: number;
  inclination: number;
  perihelionLongitude: number;
  perihelionEpoch?: number;
}

export interface OrbitPoint {
  x: number;
  y: number;
  z: number;
  distanceToSun: number;
}

export interface TailParticle {
  x: number;
  y: number;
  z: number;
  size: number;
  color: { r: number; g: number; b: number };
}

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

export function generateOrbitPoints(
  orbitParams: OrbitParams,
  numPoints: number = 360
): OrbitPoint[] {
  const { semiMajorAxis, eccentricity, inclination, perihelionLongitude } = orbitParams;
  const points: OrbitPoint[] = [];
  const inclRad = toRadians(inclination);
  const longRad = toRadians(perihelionLongitude);

  for (let i = 0; i < numPoints; i++) {
    const trueAnomaly = (i / numPoints) * 2 * Math.PI;
    const r = (semiMajorAxis * (1 - eccentricity * eccentricity)) / (1 + eccentricity * Math.cos(trueAnomaly));

    const xOrbit = r * Math.cos(trueAnomaly);
    const yOrbit = r * Math.sin(trueAnomaly);

    const x1 = xOrbit * Math.cos(longRad) - yOrbit * Math.sin(longRad);
    const y1 = xOrbit * Math.sin(longRad) + yOrbit * Math.cos(longRad);
    const z1 = 0;

    const x = x1;
    const y = y1 * Math.cos(inclRad) - z1 * Math.sin(inclRad);
    const z = y1 * Math.sin(inclRad) + z1 * Math.cos(inclRad);

    points.push({ x, y, z, distanceToSun: r });
  }

  return points;
}

export function computeTailLength(distToSun: number): number {
  const minDist = 0.5;
  const maxDist = 10;
  const minLength = 0.3;
  const maxLength = 3.0;

  const normalized = Math.min(1, Math.max(0, (maxDist - distToSun) / (maxDist - minDist)));
  return minLength + normalized * (maxLength - minLength);
}

export function computeTailParticleCount(distToSun: number): number {
  const minDist = 0.5;
  const maxDist = 10;
  const minCount = 100;
  const maxCount = 500;

  const normalized = Math.min(1, Math.max(0, (maxDist - distToSun) / (maxDist - minDist)));
  return Math.floor(minCount + normalized * (maxCount - minCount));
}

export function computeTailSpreadAngle(distToSun: number): number {
  const minDist = 0.5;
  const maxDist = 10;
  const minAngle = 5;
  const maxAngle = 30;

  const normalized = Math.min(1, Math.max(0, (maxDist - distToSun) / (maxDist - minDist)));
  return minAngle + normalized * (maxAngle - minAngle);
}

export function generateTailParticles(
  cometPos: { x: number; y: number; z: number },
  sunPos: { x: number; y: number; z: number },
  distToSun: number
): TailParticle[] {
  const particles: TailParticle[] = [];
  const count = computeTailParticleCount(distToSun);
  const tailLength = computeTailLength(distToSun);
  const spreadAngle = computeTailSpreadAngle(distToSun);

  const tailDirX = cometPos.x - sunPos.x;
  const tailDirY = cometPos.y - sunPos.y;
  const tailDirZ = cometPos.z - sunPos.z;
  const tailDirLen = Math.sqrt(tailDirX * tailDirX + tailDirY * tailDirY + tailDirZ * tailDirZ);

  if (tailDirLen === 0) return particles;

  const unitTailX = tailDirX / tailDirLen;
  const unitTailY = tailDirY / tailDirLen;
  const unitTailZ = tailDirZ / tailDirLen;

  const upX = 0;
  const upY = 1;
  const upZ = 0;

  const perpX = unitTailY * upZ - unitTailZ * upY;
  const perpY = unitTailZ * upX - unitTailX * upZ;
  const perpZ = unitTailX * upY - unitTailY * upX;
  let perpLen = Math.sqrt(perpX * perpX + perpY * perpY + perpZ * perpZ);
  if (perpLen < 0.001) {
    const altUpX = 1, altUpY = 0, altUpZ = 0;
    const pX = unitTailY * altUpZ - unitTailZ * altUpY;
    const pY = unitTailZ * altUpX - unitTailX * altUpZ;
    const pZ = unitTailX * altUpY - unitTailY * altUpX;
    perpLen = Math.sqrt(pX * pX + pY * pY + pZ * pZ);
    const nPerpX = pX / perpLen;
    const nPerpY = pY / perpLen;
    const nPerpZ = pZ / perpLen;
    const crossX = unitTailY * nPerpZ - unitTailZ * nPerpY;
    const crossY = unitTailZ * nPerpX - unitTailX * nPerpZ;
    const crossZ = unitTailX * nPerpY - unitTailY * nPerpX;

    for (let i = 0; i < count; i++) {
      const t = Math.random();
      const distAlongTail = t * tailLength;
      const angle = Math.random() * 2 * Math.PI;
      const spread = (t * t) * Math.tan(toRadians(spreadAngle)) * distAlongTail;

      const perpOffset = spread * Math.cos(angle);
      const crossOffset = spread * Math.sin(angle);

      const px = cometPos.x + unitTailX * distAlongTail + nPerpX * perpOffset + crossX * crossOffset;
      const py = cometPos.y + unitTailY * distAlongTail + nPerpY * perpOffset + crossY * crossOffset;
      const pz = cometPos.z + unitTailZ * distAlongTail + nPerpZ * perpOffset + crossZ * crossOffset;

      const size = 0.05 + Math.random() * 0.15;
      const colorT = t;
      const r = 1 - colorT * 0.4;
      const g = 1 - colorT * 0.3;
      const b = 1 - colorT * 0.1;

      particles.push({ x: px, y: py, z: pz, size, color: { r, g, b } });
    }
  } else {
    const nPerpX = perpX / perpLen;
    const nPerpY = perpY / perpLen;
    const nPerpZ = perpZ / perpLen;

    const crossX = unitTailY * nPerpZ - unitTailZ * nPerpY;
    const crossY = unitTailZ * nPerpX - unitTailX * nPerpZ;
    const crossZ = unitTailX * nPerpY - unitTailY * nPerpX;

    for (let i = 0; i < count; i++) {
      const t = Math.random();
      const distAlongTail = t * tailLength;
      const angle = Math.random() * 2 * Math.PI;
      const spread = (t * t) * Math.tan(toRadians(spreadAngle)) * distAlongTail;

      const perpOffset = spread * Math.cos(angle);
      const crossOffset = spread * Math.sin(angle);

      const px = cometPos.x + unitTailX * distAlongTail + nPerpX * perpOffset + crossX * crossOffset;
      const py = cometPos.y + unitTailY * distAlongTail + nPerpY * perpOffset + crossY * crossOffset;
      const pz = cometPos.z + unitTailZ * distAlongTail + nPerpZ * perpOffset + crossZ * crossOffset;

      const size = 0.05 + Math.random() * 0.15;
      const colorT = t;
      const r = 1 - colorT * 0.4;
      const g = 1 - colorT * 0.3;
      const b = 1 - colorT * 0.1;

      particles.push({ x: px, y: py, z: pz, size, color: { r, g, b } });
    }
  }

  return particles;
}

export function interpolateHistorical(
  orbitPoints: OrbitPoint[],
  year: number,
  baseEpoch: number
): OrbitPoint[] {
  const yearDiff = year - baseEpoch;
  const totalPoints = orbitPoints.length;
  const offset = Math.floor(((yearDiff % 1) + 1) % 1 * totalPoints);

  const result: OrbitPoint[] = [];
  for (let i = 0; i < totalPoints; i++) {
    const idx = (i + offset) % totalPoints;
    result.push({ ...orbitPoints[idx] });
  }

  return result;
}

export function computeOrbitalSpeed(distToSun: number, semiMajorAxis: number): number {
  const mu = 1;
  const v = Math.sqrt(mu * (2 / distToSun - 1 / semiMajorAxis));
  return v;
}

export function getPositionAtTime(
  orbitPoints: OrbitPoint[],
  progress: number
): { position: OrbitPoint; index: number } {
  const totalPoints = orbitPoints.length;
  const idx = Math.floor(progress * totalPoints) % totalPoints;
  const nextIdx = (idx + 1) % totalPoints;
  const t = (progress * totalPoints) % 1;

  const p1 = orbitPoints[idx];
  const p2 = orbitPoints[nextIdx];

  return {
    position: {
      x: p1.x + (p2.x - p1.x) * t,
      y: p1.y + (p2.y - p1.y) * t,
      z: p1.z + (p2.z - p1.z) * t,
      distanceToSun: p1.distanceToSun + (p2.distanceToSun - p1.distanceToSun) * t
    },
    index: idx
  };
}

export function getYearFromProgress(progress: number, epochYear: number, periodYears: number): number {
  return epochYear + progress * periodYears;
}

export function getPeriodYears(semiMajorAxis: number): number {
  return Math.sqrt(semiMajorAxis * semiMajorAxis * semiMajorAxis);
}
