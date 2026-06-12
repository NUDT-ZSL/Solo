const ctx: Worker = self as unknown as Worker;

interface Occluder {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

interface WindowDef {
  centerX: number;
  centerY: number;
  centerZ: number;
  width: number;
  height: number;
  normalX: number;
  normalY: number;
  normalZ: number;
}

function rayAABBIntersect(
  ox: number, oy: number, oz: number,
  dx: number, dy: number, dz: number,
  occ: Occluder
): boolean {
  let tmin = -1e30;
  let tmax = 1e30;

  if (Math.abs(dx) > 1e-8) {
    let t1 = (occ.minX - ox) / dx;
    let t2 = (occ.maxX - ox) / dx;
    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
  } else {
    if (ox < occ.minX || ox > occ.maxX) return false;
  }

  if (Math.abs(dy) > 1e-8) {
    let t1 = (occ.minY - oy) / dy;
    let t2 = (occ.maxY - oy) / dy;
    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
  } else {
    if (oy < occ.minY || oy > occ.maxY) return false;
  }

  if (Math.abs(dz) > 1e-8) {
    let t1 = (occ.minZ - oz) / dz;
    let t2 = (occ.maxZ - oz) / dz;
    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
  } else {
    if (oz < occ.minZ || oz > occ.maxZ) return false;
  }

  return tmin <= tmax && tmax > 0.001;
}

function rayAABBIntersectWithDist(
  ox: number, oy: number, oz: number,
  dx: number, dy: number, dz: number,
  occ: Occluder
): number {
  let tmin = -1e30;
  let tmax = 1e30;

  if (Math.abs(dx) > 1e-8) {
    let t1 = (occ.minX - ox) / dx;
    let t2 = (occ.maxX - ox) / dx;
    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
  } else {
    if (ox < occ.minX || ox > occ.maxX) return -1;
  }

  if (Math.abs(dy) > 1e-8) {
    let t1 = (occ.minY - oy) / dy;
    let t2 = (occ.maxY - oy) / dy;
    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
  } else {
    if (oy < occ.minY || oy > occ.maxY) return -1;
  }

  if (Math.abs(dz) > 1e-8) {
    let t1 = (occ.minZ - oz) / dz;
    let t2 = (occ.maxZ - oz) / dz;
    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
  } else {
    if (oz < occ.minZ || oz > occ.maxZ) return -1;
  }

  if (tmin <= tmax && tmax > 0.001) {
    return tmin > 0.001 ? tmin : tmax;
  }
  return -1;
}

const RAYS_PER_WINDOW = 50;

function computeRayTracing(data: {
  roomWidth: number;
  roomDepth: number;
  roomHeight: number;
  windows: WindowDef[];
  sunDirectionX: number;
  sunDirectionY: number;
  sunDirectionZ: number;
  sunIntensity: number;
  occluders: Occluder[];
  gridCols: number;
  gridRows: number;
}): { samples: Float32Array; computeTime: number } {
  const startTime = performance.now();
  const { roomWidth, roomDepth, windows, sunIntensity, occluders, gridCols, gridRows } = data;
  const totalSamples = gridCols * gridRows;
  const samples = new Float32Array(totalSamples * 2);

  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      const sampleX = (col + 0.5) * roomWidth / gridCols;
      const sampleZ = (row + 0.5) * roomDepth / gridRows;
      const sampleY = 0.01;

      let totalIlluminance = 30;
      let totalPathCount = 0;

      for (let wi = 0; wi < windows.length; wi++) {
        const win = windows[wi];
        let unobstructedRays = 0;
        let totalContrib = 0;

        const winHalfW = win.width / 2;
        const winHalfH = win.height / 2;

        for (let r = 0; r < RAYS_PER_WINDOW; r++) {
          const ry = win.centerY - winHalfH + Math.random() * win.height;
          const rz = win.centerZ - winHalfW + Math.random() * win.width;
          const rx = win.centerX;

          const dirX = rx - sampleX;
          const dirY = ry - sampleY;
          const dirZ = rz - sampleZ;
          const dist = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ);
          const invDist = 1 / dist;
          const ndx = dirX * invDist;
          const ndy = dirY * invDist;
          const ndz = dirZ * invDist;

          let blocked = false;
          for (let oi = 0; oi < occluders.length; oi++) {
            const t = rayAABBIntersectWithDist(
              sampleX, sampleY, sampleZ,
              ndx, ndy, ndz,
              occluders[oi]
            );
            if (t > 0 && t < dist) {
              blocked = true;
              break;
            }
          }

          if (!blocked) {
            unobstructedRays++;
            const cosAngle = Math.abs(ndy);
            const distFalloff = 1 / (1 + dist * dist * 0.04);
            totalContrib += cosAngle * distFalloff;
          }
        }

        if (unobstructedRays > 0) {
          totalPathCount++;
          const fraction = unobstructedRays / RAYS_PER_WINDOW;
          const avgContrib = totalContrib / RAYS_PER_WINDOW;
          const winArea = win.width * win.height;
          const illuminanceFromWindow = sunIntensity * fraction * avgContrib * winArea * 80;
          totalIlluminance += illuminanceFromWindow;
        }
      }

      totalPathCount = Math.min(totalPathCount, 20);
      totalIlluminance = Math.max(0, Math.min(1000, totalIlluminance));

      const idx = (row * gridCols + col) * 2;
      samples[idx] = totalIlluminance;
      samples[idx + 1] = totalPathCount;
    }
  }

  const computeTime = performance.now() - startTime;
  return { samples, computeTime };
}

ctx.onmessage = (e: MessageEvent) => {
  const result = computeRayTracing(e.data);
  (ctx as unknown as Worker).postMessage(
    { samples: result.samples, computeTime: result.computeTime },
    [result.samples.buffer] as unknown as Transferable[]
  );
};
