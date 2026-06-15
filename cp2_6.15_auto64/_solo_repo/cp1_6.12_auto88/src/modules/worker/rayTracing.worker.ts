const ctx: Worker = self as unknown as Worker;

interface Occluder {
  minX: number; maxX: number;
  minY: number; maxY: number;
  minZ: number; maxZ: number;
}

interface WindowDef {
  centerX: number; centerY: number; centerZ: number;
  width: number; height: number;
  normalX: number; normalY: number; normalZ: number;
}

interface SceneData {
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
}

function rayAABBIntersectDist(
  ox: number, oy: number, oz: number,
  dx: number, dy: number, dz: number,
  b: Occluder
): number {
  let tmin = -Infinity;
  let tmax = Infinity;

  if (Math.abs(dx) > 1e-12) {
    const inv = 1.0 / dx;
    let t1 = (b.minX - ox) * inv;
    let t2 = (b.maxX - ox) * inv;
    if (t1 > t2) { const s = t1; t1 = t2; t2 = s; }
    if (t1 > tmin) tmin = t1;
    if (t2 < tmax) tmax = t2;
  } else {
    if (ox < b.minX || ox > b.maxX) return -1;
  }
  if (tmin > tmax) return -1;

  if (Math.abs(dy) > 1e-12) {
    const inv = 1.0 / dy;
    let t1 = (b.minY - oy) * inv;
    let t2 = (b.maxY - oy) * inv;
    if (t1 > t2) { const s = t1; t1 = t2; t2 = s; }
    if (t1 > tmin) tmin = t1;
    if (t2 < tmax) tmax = t2;
  } else {
    if (oy < b.minY || oy > b.maxY) return -1;
  }
  if (tmin > tmax) return -1;

  if (Math.abs(dz) > 1e-12) {
    const inv = 1.0 / dz;
    let t1 = (b.minZ - oz) * inv;
    let t2 = (b.maxZ - oz) * inv;
    if (t1 > t2) { const s = t1; t1 = t2; t2 = s; }
    if (t1 > tmin) tmin = t1;
    if (t2 < tmax) tmax = t2;
  } else {
    if (oz < b.minZ || oz > b.maxZ) return -1;
  }

  if (tmin > tmax || tmax < 1e-4) return -1;
  return tmin > 1e-4 ? tmin : (tmax > 1e-4 ? tmax : -1);
}

function intersectRoomWalls(
  ox: number, oy: number, oz: number,
  dx: number, dy: number, dz: number,
  rw: number, rh: number, rd: number
): { t: number; nx: number; ny: number; nz: number } | null {
  let minT = Infinity;
  let nx = 0, ny = 0, nz = 0;

  if (dx > 1e-12) {
    const t = (rw - ox) / dx;
    if (t > 1e-4 && t < minT) { minT = t; nx = -1; ny = 0; nz = 0; }
  } else if (dx < -1e-12) {
    const t = (0 - ox) / dx;
    if (t > 1e-4 && t < minT) { minT = t; nx = 1; ny = 0; nz = 0; }
  }

  if (dy > 1e-12) {
    const t = (rh - oy) / dy;
    if (t > 1e-4 && t < minT) { minT = t; nx = 0; ny = -1; nz = 0; }
  } else if (dy < -1e-12) {
    const t = (0 - oy) / dy;
    if (t > 1e-4 && t < minT) { minT = t; nx = 0; ny = 1; nz = 0; }
  }

  if (dz > 1e-12) {
    const t = (rd - oz) / dz;
    if (t > 1e-4 && t < minT) { minT = t; nx = 0; ny = 0; nz = -1; }
  } else if (dz < -1e-12) {
    const t = (0 - oz) / dz;
    if (t > 1e-4 && t < minT) { minT = t; nx = 0; ny = 0; nz = 1; }
  }

  if (!isFinite(minT)) return null;
  return { t: minT, nx, ny, nz };
}

function isPointInsideWindow(
  x: number, y: number, z: number,
  win: WindowDef,
  normalX: number
): boolean {
  if (Math.abs(x - win.centerX) > 0.05) return false;
  if (normalX < 0 && x > win.centerX + 0.01) return false;
  if (normalX > 0 && x < win.centerX - 0.01) return false;
  const dy = Math.abs(y - win.centerY);
  const dz = Math.abs(z - win.centerZ);
  return dy <= win.height * 0.5 && dz <= win.width * 0.5;
}

function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function normalize(x: number, y: number, z: number): { x: number; y: number; z: number } {
  const len = Math.sqrt(x * x + y * y + z * z);
  if (len < 1e-12) return { x: 0, y: 1, z: 0 };
  return { x: x / len, y: y / len, z: z / len };
}

function sampleHemisphereCosine(nx: number, ny: number, nz: number): { x: number; y: number; z: number } {
  const u1 = Math.random();
  const u2 = Math.random();
  const r = Math.sqrt(u1);
  const theta = 2 * Math.PI * u2;

  let lx = r * Math.cos(theta);
  let ly = Math.sqrt(Math.max(0, 1 - u1));
  let lz = r * Math.sin(theta);

  if (Math.abs(ny) > 0.9) {
    const s = ny > 0 ? 1 : -1;
    return { x: lx, y: ly * s, z: lz };
  }

  const tx = -nz;
  const ty = 0;
  const tz = nx;
  const tn = normalize(tx, ty, tz);

  const bx = ny * tn.z - nz * tn.y;
  const by = nz * tn.x - nx * tn.z;
  const bz = nx * tn.y - ny * tn.x;
  const bn = normalize(bx, by, bz);

  return {
    x: lx * tn.x + ly * nx + lz * bn.x,
    y: lx * tn.y + ly * ny + lz * bn.y,
    z: lx * tn.z + ly * nz + lz * bn.z,
  };
}

function rayOccludersNearest(
  ox: number, oy: number, oz: number,
  dx: number, dy: number, dz: number,
  occluders: Occluder[]
): number {
  let nearest = Infinity;
  for (let i = 0; i < occluders.length; i++) {
    const t = rayAABBIntersectDist(ox, oy, oz, dx, dy, dz, occluders[i]);
    if (t > 1e-4 && t < nearest) nearest = t;
  }
  return isFinite(nearest) ? nearest : -1;
}

function pathTrace(
  ox: number, oy: number, oz: number,
  dx: number, dy: number, dz: number,
  scene: SceneData,
  windowSampling: boolean
): { illuminance: number; hitWindow: boolean } {
  const MAX_BOUNCE = 3;
  let throughputX = 1, throughputY = 1, throughputZ = 1;
  let px = ox, py = oy, pz = oz;
  let dirX = dx, dirY = dy, dirZ = dz;
  let totalIllum = 0;
  let hitWindowDirect = false;

  for (let bounce = 0; bounce <= MAX_BOUNCE; bounce++) {
    const tOcc = rayOccludersNearest(px, py, pz, dirX, dirY, dirZ, scene.occluders);
    const wallHit = intersectRoomWalls(px, py, pz, dirX, dirY, dirZ, scene.roomWidth, scene.roomHeight, scene.roomDepth);

    let tMin = Infinity;
    let hitWall: typeof wallHit = null;
    let hitOcc = false;

    if (tOcc > 0 && tOcc < tMin) { tMin = tOcc; hitOcc = true; hitWall = null; }
    if (wallHit && wallHit.t < tMin) { tMin = wallHit.t; hitWall = wallHit; hitOcc = false; }

    if (!isFinite(tMin)) break;

    const hx = px + dirX * tMin;
    const hy = py + dirY * tMin;
    const hz = pz + dirZ * tMin;

    if (hitWall && hitWall.nx !== 0) {
      for (let w = 0; w < scene.windows.length; w++) {
        if (isPointInsideWindow(hx, hy, hz, scene.windows[w], hitWall.nx)) {
          const sunDot = Math.max(0, scene.sunDirectionX * (-hitWall.nx) + scene.sunDirectionY * 0 + scene.sunDirectionZ * 0);
          const contrib = scene.sunIntensity * (0.7 + 0.3 * sunDot);
          totalIllum += throughputY * contrib * 450;
          if (bounce === 0) hitWindowDirect = true;
          return { illuminance: totalIllum, hitWindow: hitWindowDirect };
        }
      }
    }

    let nx = 0, ny = 0, nz = 0;
    if (hitWall) {
      nx = hitWall.nx; ny = hitWall.ny; nz = hitWall.nz;
    } else {
      let closest = -1;
      let ctMin = Infinity;
      for (let i = 0; i < scene.occluders.length; i++) {
        const tt = rayAABBIntersectDist(px, py, pz, dirX, dirY, dirZ, scene.occluders[i]);
        if (tt > 0 && tt < ctMin) { ctMin = tt; closest = i; }
      }
      if (closest >= 0) {
        const occ = scene.occluders[closest];
        const eps = 0.002;
        if (Math.abs(hx - occ.minX) < eps) { nx = -1; }
        else if (Math.abs(hx - occ.maxX) < eps) { nx = 1; }
        else if (Math.abs(hy - occ.minY) < eps) { ny = -1; }
        else if (Math.abs(hy - occ.maxY) < eps) { ny = 1; }
        else if (Math.abs(hz - occ.minZ) < eps) { nz = -1; }
        else { nz = 1; }
      }
    }

    if (bounce >= MAX_BOUNCE) break;

    if (windowSampling && bounce === 0) {
      for (let w = 0; w < scene.windows.length; w++) {
        const win = scene.windows[w];
        const wx = win.centerX + randomInRange(-win.width * 0.45, win.width * 0.45);
        const wy = win.centerY + randomInRange(-win.height * 0.45, win.height * 0.45);
        const wz = win.centerZ;

        let sdx = wx - hx;
        let sdy = wy - hy;
        let sdz = wz - hz;
        const slen = Math.sqrt(sdx * sdx + sdy * sdy + sdz * sdz);
        if (slen < 1e-4) continue;
        sdx /= slen; sdy /= slen; sdz /= slen;

        const ndotl = Math.max(0, nx * sdx + ny * sdy + nz * sdz);
        if (ndotl < 0.01) continue;

        const tOcc2 = rayOccludersNearest(hx + nx * 0.01, hy + ny * 0.01, hz + nz * 0.01, sdx, sdy, sdz, scene.occluders);
        if (tOcc2 > 0 && tOcc2 < slen * 0.98) continue;

        const wallTest = intersectRoomWalls(hx + nx * 0.01, hy + ny * 0.01, hz + nz * 0.01, sdx, sdy, sdz, scene.roomWidth, scene.roomHeight, scene.roomDepth);
        if (wallTest && wallTest.t < slen * 0.98) {
          const wx2 = hx + sdx * wallTest.t;
          const wy2 = hy + sdy * wallTest.t;
          const wz2 = hz + sdz * wallTest.t;
          let through = false;
          for (let ww = 0; ww < scene.windows.length; ww++) {
            if (isPointInsideWindow(wx2, wy2, wz2, scene.windows[ww], scene.windows[ww].normalX)) { through = true; break; }
          }
          if (!through) continue;
        }

        const sunDot = Math.max(0, scene.sunDirectionX * win.normalX);
        const contrib = scene.sunIntensity * (0.6 + 0.4 * sunDot);
        totalIllum += throughputY * ndotl * contrib * 150;
      }
    }

    const newDir = sampleHemisphereCosine(nx, ny, nz);
    const ndotl2 = Math.max(0, nx * newDir.x + ny * newDir.y + nz * newDir.z);

    throughputX *= 0.7 * ndotl2;
    throughputY *= 0.7 * ndotl2;
    throughputZ *= 0.7 * ndotl2;

    px = hx + nx * 0.005;
    py = hy + ny * 0.005;
    pz = hz + nz * 0.005;
    dirX = newDir.x;
    dirY = newDir.y;
    dirZ = newDir.z;

    if (throughputY < 0.01) break;
  }

  return { illuminance: totalIllum, hitWindow: hitWindowDirect };
}

function runCompute(scene: SceneData): { samples: Float32Array; computeTime: number } {
  const t0 = performance.now();
  const { roomWidth, roomDepth, gridCols, gridRows } = scene;
  const total = gridCols * gridRows;
  const samples = new Float32Array(total * 2);
  const SAMPLES_PER_PIXEL = 8;

  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      const sx = (col + 0.5) * roomWidth / gridCols;
      const sz = (row + 0.5) * roomDepth / gridRows;
      const sy = 0.02;

      let totalI = 0;
      let pathHits = 0;

      for (let s = 0; s < SAMPLES_PER_PIXEL; s++) {
        const dir = sampleHemisphereCosine(0, 1, 0);
        const res = pathTrace(sx, sy, sz, dir.x, dir.y, dir.z, scene, true);
        totalI += res.illuminance;
        if (res.hitWindow) pathHits++;
      }

      let avgI = totalI / SAMPLES_PER_PIXEL;
      avgI = 30 + avgI;
      avgI = Math.max(0, Math.min(1000, avgI));
      const pc = Math.min(20, Math.round(pathHits * (20 / SAMPLES_PER_PIXEL)));

      const idx = (row * gridCols + col) * 2;
      samples[idx] = avgI;
      samples[idx + 1] = pc;
    }
  }

  const computeTime = performance.now() - t0;
  return { samples, computeTime };
}

ctx.onmessage = (e: MessageEvent) => {
  const scene: SceneData = e.data;
  const result = runCompute(scene);
  (ctx as unknown as Worker).postMessage(
    { samples: result.samples, computeTime: result.computeTime },
    [result.samples.buffer] as unknown as Transferable[]
  );
};
